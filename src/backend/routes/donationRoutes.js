import express from "express";
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
// @desc    Make a donation to a cause
// @access  Authenticated users (donors)
router.post('/', async (req, res) => {
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

    // Find the cause
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

    // In a real application, here you would integrate with a payment gateway
    // For now, we'll simulate a successful payment
    
    // Update cause with donation
    cause.currentAmount += amount;
    cause.donorCount += 1;
    
    // Check if target is reached
    if (cause.currentAmount >= cause.targetAmount && cause.status === 'active') {
      cause.status = 'completed';
    }
    
    await cause.save();

    // Update user's donation history
    const user = await User.findById(req.user._id);
    user.donations.push({
      amount,
      cause: cause.name,
      date: new Date()
    });
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Donation successful! Thank you for your contribution.',
      data: {
        donation: {
          amount,
          cause: cause.name,
          date: new Date()
        },
        causeStatus: {
          currentAmount: cause.currentAmount,
          targetAmount: cause.targetAmount,
          percentageAchieved: cause.percentageAchieved,
          status: cause.status
        }
      }
    });
  } catch (error) {
    console.error('Error processing donation:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while processing donation' 
    });
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
