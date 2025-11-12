import express from "express";
import crypto from 'crypto';
import mongoose from 'mongoose';
import Cause from "../models/Cause.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { donationRateLimiter } from "../middleware/rateLimiter.js";
// Story 3.4: Audit Logging
import { logDonationCreated, logDonationFailed } from "../utils/auditLogger.js";

const router = express.Router();

// All donation routes require authentication
router.use(protect);

// @route   GET /api/donate/causes
// @desc    Get all active causes (public view for donors)
// @access  Authenticated users
router.get('/causes', async (req, res) => {
  try {
    const { status, category } = req.query;
    
    // Build query filter
    const filter = {};
    if (status) {
      filter.status = status;
    } else {
      // By default, show only active causes to donors
      filter.status = 'active';
    }
    
    if (category && category !== 'all') {
      filter.category = category;
    }

    const causes = await Cause.find(filter)
      .select('-createdBy') // Don't expose admin details to donors
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: causes.length,
      data: causes
    });
  } catch (error) {
    console.error('Error fetching causes:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching causes' 
    });
  }
});

// @route   GET /api/donate/causes/:id
// @desc    Get a single cause details
// @access  Authenticated users
router.get('/causes/:id', async (req, res) => {
  try {
    const cause = await Cause.findById(req.params.id)
      .select('-createdBy'); // Don't expose admin details
    
    if (!cause) {
      return res.status(404).json({ 
        success: false,
        message: 'Cause not found' 
      });
    }

    res.json({
      success: true,
      data: cause
    });
  } catch (error) {
    console.error('Error fetching cause:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching cause' 
    });
  }
});

// @route   POST /api/donate
// @desc    Make a donation to a cause with atomic transaction
// @access  Authenticated users (donors)
// @implements Story 2.3 (MDP-F-007) - Atomic Transaction Recording
// Story 5.3: Rate Limited
router.post('/', donationRateLimiter, async (req, res) => {
  // Start a session for transaction
  const session = await mongoose.startSession();
  
  try {
    const { causeId, amount } = req.body;

    // Validation
    if (!causeId || !amount) {
      return res.status(400).json({ 
        success: false,
        message: 'Cause ID and amount are required' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Donation amount must be greater than 0' 
      });
    }

    // Find the cause (outside transaction for validation)
    const cause = await Cause.findById(causeId);
    if (!cause) {
      return res.status(404).json({ 
        success: false,
        message: 'Cause not found' 
      });
    }

    // Check if cause is active
    if (cause.status !== 'active') {
      return res.status(400).json({ 
        success: false,
        message: `This cause is currently ${cause.status} and not accepting donations` 
      });
    }

    // Check if cause has ended
    if (cause.endDate && new Date(cause.endDate) < new Date()) {
      return res.status(400).json({ 
        success: false,
        message: 'This cause has ended and is no longer accepting donations' 
      });
    }

    // Simulate payment stub - in real application, this would call payment gateway
    const { paymentId, paymentMethod, simulateFailure } = req.body;
    const recordedPaymentId = paymentId || (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));
    const recordedPaymentMethod = paymentMethod || 'manual';

    // Log payment stub response
    console.log(`[Payment Stub] Payment ID: ${recordedPaymentId}, Amount: ${amount}, Method: ${recordedPaymentMethod}`);

    // START ATOMIC TRANSACTION
    // AC1: All operations within a single database transaction
    session.startTransaction();

    try {
      // Update cause with donation (within transaction)
      const updatedCause = await Cause.findByIdAndUpdate(
        causeId,
        {
          $inc: { currentAmount: amount, donorCount: 1 }
        },
        { new: true, session }
      );

      // Check if target is reached and update status
      if (updatedCause.currentAmount >= updatedCause.targetAmount && updatedCause.status === 'active') {
        updatedCause.status = 'completed';
        await updatedCause.save({ session });
      }

      // Update user's donation history (within transaction)
      const donationRecord = {
        amount,
        cause: cause.name,
        causeId: cause._id,
        paymentId: recordedPaymentId,
        paymentMethod: recordedPaymentMethod,
        status: 'completed',
        date: new Date()
      };

      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
          $push: { donations: donationRecord }
        },
        { new: true, session }
      );

      // Simulate failure for testing purposes
      if (simulateFailure === true) {
        throw new Error('Simulated database failure for testing');
      }

      // Commit the transaction - AC1: All operations succeed together
      await session.commitTransaction();
      console.log(`[Transaction Success] Donation recorded: ${recordedPaymentId}, User: ${req.user.email}, Cause: ${cause.name}, Amount: ${amount}`);

      // Story 3.4: Log successful donation
      await logDonationCreated(req, {
        amount,
        causeId: cause._id,
        causeName: cause.name,
        paymentId: recordedPaymentId,
        paymentMethod: recordedPaymentMethod
      });

      res.status(201).json({
        success: true,
        message: 'Donation successful! Thank you for your contribution.',
        data: {
          donation: {
            amount,
            cause: cause.name,
            causeId: cause._id,
            paymentId: recordedPaymentId,
            paymentMethod: recordedPaymentMethod,
            date: donationRecord.date
          },
          causeStatus: {
            currentAmount: updatedCause.currentAmount,
            targetAmount: updatedCause.targetAmount,
            percentageAchieved: updatedCause.percentageAchieved,
            status: updatedCause.status
          }
        }
      });

    } catch (transactionError) {
      // AC2: Rollback if any part fails - no partial data persisted
      await session.abortTransaction();
      
      // AC3: Log the failure
      console.error(`[Transaction Rollback] Donation failed for User: ${req.user.email}, Cause: ${cause.name}`, {
        error: transactionError.message,
        paymentId: recordedPaymentId,
        amount,
        timestamp: new Date().toISOString()
      });

      // Story 3.4: Log failed donation
      await logDonationFailed(req, {
        amount,
        causeId,
        causeName: cause.name,
        reason: transactionError.message
      });

      throw transactionError; // Re-throw to be caught by outer catch
    }

  } catch (error) {
    // AC3: Return appropriate error to user
    console.error('[Donation Error]', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to process donation. No charges were made. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    // Always end the session
    session.endSession();
  }
});

// @route   POST /api/donate/multi
// @desc    Make a donation to multiple causes with allocation
// @access  Authenticated users (donors)
// @implements Story 2.4 - Multi-Cause Donation
// Story 5.3: Rate Limited
router.post('/multi', donationRateLimiter, async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    const { causes, totalAmount, paymentMethod, paymentId } = req.body;

    // Validation
    if (!causes || !Array.isArray(causes) || causes.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'At least one cause must be selected' 
      });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Total donation amount must be greater than 0' 
      });
    }

    // Validate allocations
    const totalAllocated = causes.reduce((sum, c) => sum + (c.amount || 0), 0);
    if (Math.abs(totalAllocated - totalAmount) > 0.01) { // Allow for floating point errors
      return res.status(400).json({ 
        success: false,
        message: `Allocated amounts (${totalAllocated}) must equal total amount (${totalAmount})` 
      });
    }

    // Validate each cause allocation
    for (const causeAllocation of causes) {
      if (!causeAllocation.causeId || !causeAllocation.amount) {
        return res.status(400).json({ 
          success: false,
          message: 'Each cause must have a valid ID and amount' 
        });
      }

      if (causeAllocation.amount <= 0) {
        return res.status(400).json({ 
          success: false,
          message: 'Each cause allocation must be greater than 0' 
        });
      }
    }

    // Fetch all causes and validate
    const causeIds = causes.map(c => c.causeId);
    const causeDocs = await Cause.find({ _id: { $in: causeIds } });
    
    if (causeDocs.length !== causeIds.length) {
      return res.status(404).json({ 
        success: false,
        message: 'One or more causes not found' 
      });
    }

    // Check if all causes are active
    const inactiveCauses = causeDocs.filter(c => c.status !== 'active');
    if (inactiveCauses.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: `Some causes are not active: ${inactiveCauses.map(c => c.name).join(', ')}` 
      });
    }

    // Check for ended causes
    const endedCauses = causeDocs.filter(c => c.endDate && new Date(c.endDate) < new Date());
    if (endedCauses.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: `Some causes have ended: ${endedCauses.map(c => c.name).join(', ')}` 
      });
    }

    // Generate payment ID
    const recordedPaymentId = paymentId || (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));
    const recordedPaymentMethod = paymentMethod || 'manual';

    console.log(`[Multi-Cause Payment Stub] Payment ID: ${recordedPaymentId}, Total: ${totalAmount}, Causes: ${causes.length}`);

    // START ATOMIC TRANSACTION
    session.startTransaction();

    try {
      const donationRecords = [];
      const updatedCauses = [];

      // Update each cause
      for (const causeAllocation of causes) {
        const causeDoc = causeDocs.find(c => c._id.toString() === causeAllocation.causeId);
        
        // Update cause with donation
        const updatedCause = await Cause.findByIdAndUpdate(
          causeAllocation.causeId,
          {
            $inc: { currentAmount: causeAllocation.amount, donorCount: 1 }
          },
          { new: true, session }
        );

        // Check if target is reached
        if (updatedCause.currentAmount >= updatedCause.targetAmount && updatedCause.status === 'active') {
          updatedCause.status = 'completed';
          await updatedCause.save({ session });
        }

        updatedCauses.push({
          causeId: updatedCause._id,
          name: updatedCause.name,
          currentAmount: updatedCause.currentAmount,
          targetAmount: updatedCause.targetAmount,
          status: updatedCause.status
        });

        // Create donation record for this cause
        donationRecords.push({
          amount: causeAllocation.amount,
          cause: causeDoc.name,
          causeId: causeDoc._id,
          paymentId: recordedPaymentId,
          paymentMethod: recordedPaymentMethod,
          status: 'completed',
          date: new Date(),
          isMultiCause: true
        });
      }

      // Update user's donation history
      await User.findByIdAndUpdate(
        req.user._id,
        {
          $push: { donations: { $each: donationRecords } }
        },
        { new: true, session }
      );

      // Commit the transaction
      await session.commitTransaction();
      console.log(`[Multi-Cause Transaction Success] Payment: ${recordedPaymentId}, User: ${req.user.email}, Total: ${totalAmount}`);

      res.status(201).json({
        success: true,
        message: `Successfully donated to ${causes.length} causes! Thank you for your contribution.`,
        data: {
          totalAmount,
          paymentId: recordedPaymentId,
          paymentMethod: recordedPaymentMethod,
          causesCount: causes.length,
          donations: donationRecords.map((d, idx) => ({
            cause: d.cause,
            amount: d.amount,
            causeStatus: updatedCauses[idx]
          })),
          date: donationRecords[0].date
        }
      });

    } catch (transactionError) {
      await session.abortTransaction();
      console.error(`[Multi-Cause Transaction Rollback]`, {
        error: transactionError.message,
        user: req.user.email,
        paymentId: recordedPaymentId,
        timestamp: new Date().toISOString()
      });
      throw transactionError;
    }

  } catch (error) {
    console.error('[Multi-Cause Donation Error]', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to process multi-cause donation. No charges were made. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
});

// @route   GET /api/donate/history
// @desc    Get user's donation history
// @access  Authenticated users
router.get('/history', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('donations');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Calculate total donated
    const totalDonated = user.donations.reduce((sum, donation) => sum + donation.amount, 0);
    const donationCount = user.donations.length;

    res.json({
      success: true,
      data: {
        donations: user.donations.sort((a, b) => new Date(b.date) - new Date(a.date)),
        summary: {
          totalDonated,
          donationCount
        }
      }
    });
  } catch (error) {
    console.error('Error fetching donation history:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching donation history' 
    });
  }
});

// @route   GET /api/donate/stats
// @desc    Get user's donation statistics
// @access  Authenticated users
router.get('/stats', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('donations');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Calculate statistics
    const totalDonated = user.donations.reduce((sum, donation) => sum + donation.amount, 0);
    const donationCount = user.donations.length;
    const averageDonation = donationCount > 0 ? totalDonated / donationCount : 0;
    
    // Group donations by cause
    const donationsByCause = user.donations.reduce((acc, donation) => {
      if (!acc[donation.cause]) {
        acc[donation.cause] = {
          cause: donation.cause,
          totalAmount: 0,
          count: 0
        };
      }
      acc[donation.cause].totalAmount += donation.amount;
      acc[donation.cause].count += 1;
      return acc;
    }, {});

    // Find most supported cause
    const causesArray = Object.values(donationsByCause);
    const mostSupportedCause = causesArray.length > 0 
      ? causesArray.reduce((max, cause) => cause.totalAmount > max.totalAmount ? cause : max)
      : null;

    res.json({
      success: true,
      data: {
        totalDonated,
        donationCount,
        averageDonation: Math.round(averageDonation * 100) / 100,
        mostSupportedCause,
        donationsByCause: causesArray.sort((a, b) => b.totalAmount - a.totalAmount)
      }
    });
  } catch (error) {
    console.error('Error fetching donation stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching donation statistics' 
    });
  }
});

// @route   GET /api/donate/categories
// @desc    Get available cause categories
// @access  Authenticated users
router.get('/categories', async (req, res) => {
  try {
    const categories = await Cause.distinct('category');
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching categories' 
    });
  }
});

export default router;
