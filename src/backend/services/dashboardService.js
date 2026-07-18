import Cause from "../models/Cause.js";
import User from "../models/User.js";

export const getAggregatedDonations = async (status, category, sortBy = 'currentAmount', order = 'desc') => {
  const matchStage = {};
  if (status) matchStage.status = status;
  if (category && category !== 'all') matchStage.category = category;

  const aggregationPipeline = [
    { $match: matchStage },
    {
      $project: {
        name: 1, description: 1, category: 1, targetAmount: 1, currentAmount: 1,
        donorCount: 1, status: 1, imageUrl: 1, startDate: 1, endDate: 1, createdAt: 1, updatedAt: 1,
        percentageAchieved: {
          $cond: [
            { $eq: ['$targetAmount', 0] }, 0,
            { $round: [{ $multiply: [{ $divide: ['$currentAmount', '$targetAmount'] }, 100] }, 2] }
          ]
        },
        remainingAmount: {
          $cond: [
            { $gte: ['$currentAmount', '$targetAmount'] }, 0,
            { $subtract: ['$targetAmount', '$currentAmount'] }
          ]
        },
        daysRemaining: {
          $cond: [
            { $eq: ['$endDate', null] }, null,
            { $round: [{ $divide: [{ $subtract: ['$endDate', new Date()] }, 1000 * 60 * 60 * 24] }, 0] }
          ]
        },
        averageDonation: {
          $cond: [
            { $eq: ['$donorCount', 0] }, 0,
            { $round: [{ $divide: ['$currentAmount', '$donorCount'] }, 2] }
          ]
        }
      }
    },
    { $sort: { [sortBy]: order === 'desc' ? -1 : 1 } }
  ];

  const aggregatedCauses = await Cause.aggregate(aggregationPipeline);

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

  return { causes: aggregatedCauses, statistics: overallStats };
};

export const getDonationTrends = async (period = 'daily', limit = 30) => {
  let dateFormat;
  switch (period) {
    case 'monthly': dateFormat = { $dateToString: { format: '%Y-%m', date: '$donations.date' } }; break;
    case 'weekly': dateFormat = { $dateToString: { format: '%Y-W%V', date: '$donations.date' } }; break;
    case 'daily':
    default: dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$donations.date' } }; break;
  }

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

  return trendData.reverse();
};

export const getCategoryBreakdown = async () => {
  const categoryStats = await Cause.aggregate([
    {
      $group: {
        _id: '$category',
        totalCauses: { $sum: 1 },
        totalDonations: { $sum: '$currentAmount' },
        totalTarget: { $sum: '$targetAmount' },
        totalDonors: { $sum: '$donorCount' },
        activeCauses: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        completedCauses: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
      }
    },
    {
      $project: {
        category: '$_id',
        _id: 0,
        totalCauses: 1,
        totalDonations: 1,
        totalTarget: 1,
        totalDonors: 1,
        activeCauses: 1,
        completedCauses: 1,
        successRate: {
          $cond: [
            { $eq: ['$totalTarget', 0] }, 0,
            { $round: [{ $multiply: [{ $divide: ['$totalDonations', '$totalTarget'] }, 100] }, 2] }
          ]
        }
      }
    },
    { $sort: { totalDonations: -1 } }
  ]);
  
  return categoryStats;
};

export const getTopCauses = async (limit = 5, sortBy = 'currentAmount') => {
  const causes = await Cause.find()
    .sort({ [sortBy]: -1 })
    .limit(parseInt(limit))
    .select('name category currentAmount targetAmount donorCount status')
    .lean();
    
  return causes.map(cause => ({
    ...cause,
    percentageAchieved: cause.targetAmount > 0 
      ? Math.round((cause.currentAmount / cause.targetAmount) * 100) 
      : 0
  }));
};

export const getDonorInsights = async () => {
  const donorStats = await User.aggregate([
    { $match: { role: 'donor', 'donations.0': { $exists: true } } },
    {
      $project: {
        donationCount: { $size: '$donations' },
        totalDonated: { $sum: '$donations.amount' },
        firstDonationDate: { $min: '$donations.date' },
        lastDonationDate: { $max: '$donations.date' },
        categoriesDonated: { $addToSet: '$donations.category' }
      }
    },
    {
      $group: {
        _id: null,
        totalActiveDonors: { $sum: 1 },
        avgDonationsPerUser: { $avg: '$donationCount' },
        avgTotalDonatedPerUser: { $avg: '$totalDonated' },
        oneTimeDonors: { $sum: { $cond: [{ $eq: ['$donationCount', 1] }, 1, 0] } },
        repeatDonors: { $sum: { $cond: [{ $gt: ['$donationCount', 1] }, 1, 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        totalActiveDonors: 1,
        avgDonationsPerUser: { $round: ['$avgDonationsPerUser', 1] },
        avgTotalDonatedPerUser: { $round: ['$avgTotalDonatedPerUser', 2] },
        oneTimeDonors: 1,
        repeatDonors: 1,
        repeatDonorRate: {
          $cond: [
            { $eq: ['$totalActiveDonors', 0] }, 0,
            { $round: [{ $multiply: [{ $divide: ['$repeatDonors', '$totalActiveDonors'] }, 100] }, 1] }
          ]
        }
      }
    }
  ]);

  return donorStats.length > 0 ? donorStats[0] : {
    totalActiveDonors: 0,
    avgDonationsPerUser: 0,
    avgTotalDonatedPerUser: 0,
    oneTimeDonors: 0,
    repeatDonors: 0,
    repeatDonorRate: 0
  };
};

export const getPerformanceMetrics = async () => {
  const totalCauses = await Cause.countDocuments();
  const activeCauses = await Cause.countDocuments({ status: 'active' });
  const completedCauses = await Cause.countDocuments({ status: 'completed' });
  
  const allCauses = await Cause.find().select('currentAmount targetAmount createdAt endDate status').lean();
  
  let successRate = 0;
  if (totalCauses > 0) {
    successRate = Math.round((completedCauses / totalCauses) * 100);
  }
  
  let avgDaysToComplete = 0;
  const completedCausesData = allCauses.filter(c => c.status === 'completed' && c.endDate && c.createdAt);
  
  if (completedCausesData.length > 0) {
    const totalDays = completedCausesData.reduce((sum, cause) => {
      return sum + (new Date(cause.endDate) - new Date(cause.createdAt)) / (1000 * 60 * 60 * 24);
    }, 0);
    avgDaysToComplete = Math.round(totalDays / completedCausesData.length);
  }
  
  const totalRaised = allCauses.reduce((sum, cause) => sum + cause.currentAmount, 0);
  const totalTarget = allCauses.reduce((sum, cause) => sum + cause.targetAmount, 0);
  
  const fundingEfficiency = totalTarget > 0 ? Math.round((totalRaised / totalTarget) * 100) : 0;
  
  return {
    totalCauses,
    activeCauses,
    completedCauses,
    successRate,
    avgDaysToComplete,
    fundingEfficiency
  };
};

export const getDashboardStats = async () => {
  const totalUsers = await User.countDocuments();
  const totalDonors = await User.countDocuments({ role: 'donor' });
  const totalAdmins = await User.countDocuments({ role: 'admin' });
  const totalCauses = await Cause.countDocuments();
  const activeCauses = await Cause.countDocuments({ status: 'active' });
  
  const donationStats = await Cause.aggregate([
    {
      $group: {
        _id: null,
        totalDonations: { $sum: '$currentAmount' },
        totalTarget: { $sum: '$targetAmount' },
        totalDonorCount: { $sum: '$donorCount' }
      }
    }
  ]);

  return {
    users: { total: totalUsers, donors: totalDonors, admins: totalAdmins },
    causes: {
      total: totalCauses,
      active: activeCauses,
      paused: await Cause.countDocuments({ status: 'paused' }),
      completed: await Cause.countDocuments({ status: 'completed' })
    },
    donations: {
      totalAmount: donationStats[0]?.totalDonations || 0,
      targetAmount: donationStats[0]?.totalTarget || 0,
      totalDonors: donationStats[0]?.totalDonorCount || 0
    }
  };
};
