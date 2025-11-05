import express from "express";
import crypto from 'crypto';
import mongoose from 'mongoose';
import Cause from "../models/Cause.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

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
router.post('/', async (req, res) => {
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
