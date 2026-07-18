import User from "../models/User.js";

export const getPreviousDonations = async (queryParams) => {
  const {
    startDate,
    endDate,
    minAmount,
    maxAmount,
    donorName,
    paymentMethod,
    cause,
    status,
    sort = '-date',
    page = 1,
    limit = 50,
    export: exportType
  } = queryParams;

  const match = {};

  if (startDate || endDate) {
    match['donations.date'] = {};
    if (startDate) match['donations.date'].$gte = new Date(startDate);
    if (endDate) match['donations.date'].$lte = new Date(endDate);
  }

  if ((minAmount !== undefined && String(minAmount).trim() !== '') || (maxAmount !== undefined && String(maxAmount).trim() !== '')) {
    match['donations.amount'] = {};
    if (minAmount !== undefined && String(minAmount).trim() !== '') match['donations.amount'].$gte = Number(minAmount);
    if (maxAmount !== undefined && String(maxAmount).trim() !== '') match['donations.amount'].$lte = Number(maxAmount);
    if (isNaN(match['donations.amount'].$gte) && isNaN(match['donations.amount'].$lte)) {
      delete match['donations.amount'];
    }
  }

  if (paymentMethod) match['donations.paymentMethod'] = paymentMethod;
  if (cause) match['donations.cause'] = cause;
  if (status) match['donations.status'] = status;
  if (donorName) {
    match.$or = [
      { 'firstName': { $regex: donorName, $options: 'i' } },
      { 'lastName': { $regex: donorName, $options: 'i' } },
      { 'email': { $regex: donorName, $options: 'i' } }
    ];
  }

  const pipeline = [
    { $unwind: '$donations' },
    { $match: match },
    { $project: {
      paymentId: '$donations.paymentId',
      amount: '$donations.amount',
      cause: '$donations.cause',
      date: '$donations.date',
      paymentMethod: '$donations.paymentMethod',
      status: '$donations.status',
      donorId: '$_id',
      donorEmail: '$email',
      donorName: { $concat: ['$firstName', ' ', '$lastName'] }
    }}
  ];

  if (sort) {
    const sortField = {};
    const direction = sort.startsWith('-') ? -1 : 1;
    const field = sort.replace(/^-/, '');
    sortField[field] = direction;
    pipeline.push({ $sort: sortField });
  }

  if (exportType === 'csv') {
    return await User.aggregate(pipeline).allowDiskUse(true);
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(1000, Number(limit) || 50);
  const skip = (pageNum - 1) * limitNum;

  pipeline.push({ $skip: skip }, { $limit: limitNum });

  const donations = await User.aggregate(pipeline).allowDiskUse(true);
  return { donations, pageNum };
};

export const getDonationsByUser = async () => {
  const pipeline = [
    { $match: { 'donations.0': { $exists: true } } },
    { $project: {
        _id: 1,
        email: 1,
        firstName: 1,
        lastName: 1,
        donations: 1
    }},
    { $project: {
        donorId: '$_id',
        donorName: { $concat: ['$firstName', ' ', '$lastName'] },
        donorEmail: '$email',
        totalAmount: { $sum: '$donations.amount' },
        donationCount: { $size: '$donations' },
        lastDonationDate: { $max: '$donations.date' },
        avgDonation: { $avg: '$donations.amount' }
    }},
    { $sort: { totalAmount: -1 } }
  ];

  return await User.aggregate(pipeline).allowDiskUse(true);
};
