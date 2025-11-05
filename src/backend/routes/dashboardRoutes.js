/**
 * Dashboard Routes
 * Story 4.1: Backend Aggregation of Donation Data
 * 
 * Provides pre-calculated, aggregated donation data for efficient dashboard display
 */

import express from "express";
import Cause from "../models/Cause.js";
import User from "../models/User.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// All dashboard routes require authentication
router.use(protect);

/**
 * @route   GET /api/dashboard/aggregated-donations
 * @desc    Get aggregated donation data per cause with pre-calculated totals
 * @access  Authenticated users (Admins get full view, Donors get limited view)
 * @implements Story 4.1 - Backend Aggregation of Donation Data
 */
router.get('/aggregated-donations', async (req, res) => {
  try {
    const { status, category, sortBy = 'currentAmount', order = 'desc' } = req.query;
    
    // Build aggregation pipeline
    const matchStage = {};
    
    // Filter by status if provided
    if (status) {
      matchStage.status = status;
    }
    
    // Filter by category if provided
    if (category && category !== 'all') {
      matchStage.category = category;
    }

    // Aggregation pipeline for efficient data calculation
    const aggregationPipeline = [
      // Match filters
      { $match: matchStage },
      
      // Calculate additional metrics
      {
        $project: {
          name: 1,
          description: 1,
          category: 1,
          targetAmount: 1,
          currentAmount: 1,
          donorCount: 1,
          status: 1,
          imageUrl: 1,
          startDate: 1,
          endDate: 1,
          createdAt: 1,
          updatedAt: 1,
          // Pre-calculated percentage
          percentageAchieved: {
            $cond: [
              { $eq: ['$targetAmount', 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ['$currentAmount', '$targetAmount'] },
                      100
                    ]
                  },
                  2
                ]
              }
            ]
          },
          // Remaining amount to target
          remainingAmount: {
            $cond: [
              { $gte: ['$currentAmount', '$targetAmount'] },
              0,
              { $subtract: ['$targetAmount', '$currentAmount'] }
            ]
          },
          // Days until end (if endDate exists)
          daysRemaining: {
            $cond: [
              { $eq: ['$endDate', null] },
              null,
              {
                $round: [
                  {
                    $divide: [
                      { $subtract: ['$endDate', new Date()] },
                      1000 * 60 * 60 * 24
                    ]
                  },
                  0
                ]
              }
            ]
          },
          // Average donation per donor
          averageDonation: {
            $cond: [
              { $eq: ['$donorCount', 0] },
              0,
              {
                $round: [
                  { $divide: ['$currentAmount', '$donorCount'] },
                  2
                ]
              }
            ]
          }
        }
      },
      
      // Sort based on query parameters
      {
        $sort: {
          [sortBy]: order === 'desc' ? -1 : 1
        }
      }
    ];

    const aggregatedCauses = await Cause.aggregate(aggregationPipeline);

    // Calculate overall statistics
    const overallStats = {
      totalCauses: aggregatedCauses.length,
      totalDonationsCollected: aggregatedCauses.reduce((sum, cause) => sum + cause.currentAmount, 0),
      totalTargetAmount: aggregatedCauses.reduce((sum, cause) => sum + cause.targetAmount, 0),
      totalDonors: aggregatedCauses.reduce((sum, cause) => sum + cause.donorCount, 0),
      activeCauses: aggregatedCauses.filter(c => c.status === 'active').length,
      completedCauses: aggregatedCauses.filter(c => c.status === 'completed').length,
      averageCompletionRate: aggregatedCauses.length > 0
        ? (aggregatedCauses.reduce((sum, cause) => sum + cause.percentageAchieved, 0) / aggregatedCauses.length).toFixed(2)
        : 0
    };

    res.json({
      success: true,
      message: 'Aggregated donation data retrieved successfully',
      data: {
        causes: aggregatedCauses,
        statistics: overallStats,
        filters: {
          status: status || 'all',
          category: category || 'all',
          sortBy,
          order
        }
      }
    });
  } catch (error) {
    console.error('Error fetching aggregated donations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching aggregated donation data'
    });
  }
});

/**
 * @route   GET /api/dashboard/donation-trends
 * @desc    Get donation trends over time (daily, weekly, monthly)
 * @access  Authenticated users
 */
router.get('/donation-trends', async (req, res) => {
  try {
    const { period = 'daily', limit = 30 } = req.query;
    
    // Determine date grouping based on period
    let dateFormat;
    switch (period) {
      case 'monthly':
        dateFormat = { $dateToString: { format: '%Y-%m', date: '$donations.date' } };
        break;
      case 'weekly':
        dateFormat = { $dateToString: { format: '%Y-W%V', date: '$donations.date' } };
        break;
      case 'daily':
      default:
        dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$donations.date' } };
        break;
    }

    // Aggregate donations from all users
    const trendData = await User.aggregate([
      { $unwind: '$donations' },
      {
        $group: {
          _id: dateFormat,
          totalAmount: { $sum: '$donations.amount' },
          donationCount: { $sum: 1 },
          uniqueDonors: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          period: '$_id',
          totalAmount: 1,
          donationCount: 1,
          uniqueDonorCount: { $size: '$uniqueDonors' }
        }
      },
      { $sort: { period: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      data: {
        trends: trendData.reverse(), // Reverse to show oldest first
        period,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching donation trends:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching donation trends'
    });
  }
});

/**
 * @route   GET /api/dashboard/category-breakdown
 * @desc    Get donation breakdown by category
 * @access  Authenticated users
 */
router.get('/category-breakdown', async (req, res) => {
  try {
    const categoryStats = await Cause.aggregate([
      {
        $group: {
          _id: '$category',
          totalCauses: { $sum: 1 },
          totalDonations: { $sum: '$currentAmount' },
          totalTarget: { $sum: '$targetAmount' },
          totalDonors: { $sum: '$donorCount' },
          activeCauses: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          completedCauses: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          category: '$_id',
          totalCauses: 1,
          totalDonations: 1,
          totalTarget: 1,
          totalDonors: 1,
          activeCauses: 1,
          completedCauses: 1,
          averageCompletion: {
            $cond: [
              { $eq: ['$totalTarget', 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ['$totalDonations', '$totalTarget'] },
                      100
                    ]
                  },
                  2
                ]
              }
            ]
          }
        }
      },
      { $sort: { totalDonations: -1 } }
    ]);

    res.json({
      success: true,
      data: categoryStats
    });
  } catch (error) {
    console.error('Error fetching category breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching category breakdown'
    });
  }
});

/**
 * @route   GET /api/dashboard/top-causes
 * @desc    Get top performing causes
 * @access  Authenticated users
 */
router.get('/top-causes', async (req, res) => {
  try {
    const { metric = 'currentAmount', limit = 10 } = req.query;
    
    const sortField = {};
    sortField[metric] = -1;

    const topCauses = await Cause.aggregate([
      { $match: { status: { $in: ['active', 'completed'] } } },
      {
        $project: {
          name: 1,
          category: 1,
          currentAmount: 1,
          targetAmount: 1,
          donorCount: 1,
          status: 1,
          percentageAchieved: {
            $cond: [
              { $eq: ['$targetAmount', 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ['$currentAmount', '$targetAmount'] },
                      100
                    ]
                  },
                  2
                ]
              }
            ]
          }
        }
      },
      { $sort: sortField },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      data: {
        topCauses,
        metric,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching top causes:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching top causes'
    });
  }
});

/**
 * @route   GET /api/dashboard/donor-insights
 * @desc    Get donor activity insights (Admin only)
 * @access  Admin only
 */
router.get('/donor-insights', authorize('admin'), async (req, res) => {
  try {
    const donorStats = await User.aggregate([
      { $match: { role: 'donor' } },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          email: 1,
          totalDonations: { $size: { $ifNull: ['$donations', []] } },
          totalDonated: { $sum: '$donations.amount' },
          lastDonation: { $max: '$donations.date' }
        }
      },
      { $sort: { totalDonated: -1 } },
      { $limit: 50 }
    ]);

    // Calculate aggregate donor statistics
    const overallDonorStats = {
      totalDonors: await User.countDocuments({ role: 'donor' }),
      activeDonors: donorStats.filter(d => d.totalDonations > 0).length,
      averageDonationsPerDonor: donorStats.length > 0
        ? (donorStats.reduce((sum, d) => sum + d.totalDonations, 0) / donorStats.length).toFixed(2)
        : 0,
      averageAmountPerDonor: donorStats.length > 0
        ? (donorStats.reduce((sum, d) => sum + d.totalDonated, 0) / donorStats.length).toFixed(2)
        : 0
    };

    res.json({
      success: true,
      data: {
        topDonors: donorStats,
        statistics: overallDonorStats
      }
    });
  } catch (error) {
    console.error('Error fetching donor insights:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching donor insights'
    });
  }
});

/**
 * @route   GET /api/dashboard/performance-metrics
 * @desc    Get comprehensive performance metrics
 * @access  Authenticated users
 */
router.get('/performance-metrics', async (req, res) => {
  try {
    // Run multiple aggregations in parallel for efficiency
    const [
      causeMetrics,
      donationMetrics,
      userMetrics
    ] = await Promise.all([
      // Cause metrics
      Cause.aggregate([
        {
          $group: {
            _id: null,
            totalCauses: { $sum: 1 },
            activeCauses: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            completedCauses: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            totalRaised: { $sum: '$currentAmount' },
            totalTarget: { $sum: '$targetAmount' },
            averageCompletion: { $avg: { $divide: ['$currentAmount', '$targetAmount'] } }
          }
        }
      ]),
      
      // Donation metrics
      User.aggregate([
        { $unwind: { path: '$donations', preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: null,
            totalDonations: { $sum: 1 },
            totalAmount: { $sum: '$donations.amount' },
            averageDonation: { $avg: '$donations.amount' }
          }
        }
      ]),
      
      // User metrics
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const metrics = {
      causes: causeMetrics[0] || {
        totalCauses: 0,
        activeCauses: 0,
        completedCauses: 0,
        totalRaised: 0,
        totalTarget: 0,
        averageCompletion: 0
      },
      donations: donationMetrics[0] || {
        totalDonations: 0,
        totalAmount: 0,
        averageDonation: 0
      },
      users: userMetrics.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, { donor: 0, admin: 0 }),
      timestamp: new Date().toISOString()
    };

    // Calculate derived metrics
    metrics.causes.completionRate = metrics.causes.totalCauses > 0
      ? ((metrics.causes.completedCauses / metrics.causes.totalCauses) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching performance metrics'
    });
  }
});

export default router;
