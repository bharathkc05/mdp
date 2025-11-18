import express from "express";
import Cause from "../models/Cause.js";
import User from "../models/User.js";
import { protect, authorize } from "../middleware/auth.js";
import { updateExpiredCauses } from "../utils/causeStatusUpdater.js";
// Story 3.4: Audit Logging
import { 
  logCauseCreated, 
  logCauseUpdated, 
  logCauseDeleted,
  logCauseArchived,
  logUserRoleChanged 
} from "../utils/auditLogger.js";

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// @route   GET /api/admin/causes
// @desc    Get all causes (admin view with full details, pagination, search, filter)
// @access  Admin only
router.get('/causes', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category = '', status = '' } = req.query;
    
    // Build query object
    const query = {};
    
    // Add search filter (case-insensitive search in name and description)
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }
    
    // Add category filter
    if (category && category.trim() && category !== 'all') {
      query.category = category.toLowerCase();
    }
    
    // Add status filter (supports 'archived' as a filter for non-active statuses)
    if (status && status.trim()) {
      if (status === 'archived') {
        query.status = { $in: ['paused', 'completed', 'cancelled'] };
      } else if (status !== 'all') {
        query.status = status;
      }
    }
    
    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count for pagination
    const total = await Cause.countDocuments(query);
    
    // Fetch causes with pagination and sorting
    const causes = await Cause.find(query)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    res.json({
      success: true,
      count: causes.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
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

// @route   POST /api/admin/causes
// @desc    Create a new cause
// @access  Admin only
router.post('/causes', async (req, res) => {
  try {
    const { name, description, category, targetAmount, imageUrl, endDate } = req.body;

    // Validation
    if (!name || !description || !targetAmount) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, description, and target amount are required' 
      });
    }

    if (targetAmount <= 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Target amount must be greater than 0' 
      });
    }

    // Check if cause with same name already exists
    const existingCause = await Cause.findOne({ name });
    if (existingCause) {
      return res.status(400).json({ 
        success: false,
        message: 'A cause with this name already exists' 
      });
    }

    const cause = await Cause.create({
      name,
      description,
      category: category || 'other',
      targetAmount,
      imageUrl: imageUrl || '',
      endDate: endDate || null,
      createdBy: req.user._id
    });

    const populatedCause = await Cause.findById(cause._id)
      .populate('createdBy', 'firstName lastName email');

    // Story 3.4: Log cause creation
    await logCauseCreated(req, populatedCause);

    res.status(201).json({
      success: true,
      message: 'Cause created successfully',
      data: populatedCause
    });
  } catch (error) {
    console.error('Error creating cause:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while creating cause' 
    });
  }
});

// @route   GET /api/admin/causes/:id
// @desc    Get a single cause by ID
// @access  Admin only
router.get('/causes/:id', async (req, res) => {
  try {
    const cause = await Cause.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email');
    
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

// @route   PUT /api/admin/causes/:id
// @desc    Update a cause
// @access  Admin only
router.put('/causes/:id', async (req, res) => {
  try {
    const { name, description, category, targetAmount, status, imageUrl, endDate } = req.body;

    const cause = await Cause.findById(req.params.id);
    
    if (!cause) {
      return res.status(404).json({ 
        success: false,
        message: 'Cause not found' 
      });
    }

    // Update fields if provided
    if (name) cause.name = name;
    if (description) cause.description = description;
    if (category) cause.category = category;
    if (targetAmount !== undefined) {
      if (targetAmount <= 0) {
        return res.status(400).json({ 
          success: false,
          message: 'Target amount must be greater than 0' 
        });
      }
      cause.targetAmount = targetAmount;
    }
    if (status) cause.status = status;
    if (imageUrl !== undefined) cause.imageUrl = imageUrl;
    if (endDate !== undefined) cause.endDate = endDate;

    await cause.save();

    const updatedCause = await Cause.findById(cause._id)
      .populate('createdBy', 'firstName lastName email');

    // Story 3.4: Log cause update
    await logCauseUpdated(req, updatedCause, req.body);

    res.json({
      success: true,
      message: 'Cause updated successfully',
      data: updatedCause
    });
  } catch (error) {
    console.error('Error updating cause:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating cause' 
    });
  }
});

// @route   DELETE /api/admin/causes/:id
// @desc    Delete a cause
// @access  Admin only
router.delete('/causes/:id', async (req, res) => {
  try {
    const cause = await Cause.findById(req.params.id);
    
    if (!cause) {
      return res.status(404).json({ 
        success: false,
        message: 'Cause not found' 
      });
    }

    // Check if cause has received donations
    if (cause.currentAmount > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot delete a cause that has received donations. Consider marking it as cancelled instead.' 
      });
    }

    // Story 3.4: Log cause deletion
    await logCauseDeleted(req, cause);

    await Cause.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Cause deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting cause:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while deleting cause' 
    });
  }
});

// @route   PATCH /api/admin/causes/:id/archive
// @desc    Archive/unarchive a cause (toggle between active and cancelled)
// @access  Admin only
router.patch('/causes/:id/archive', async (req, res) => {
  try {
    const cause = await Cause.findById(req.params.id);
    
    if (!cause) {
      return res.status(404).json({ 
        success: false,
        message: 'Cause not found' 
      });
    }

    // Toggle archive status: if active, set to cancelled; if cancelled, set to active
    if (cause.status === 'active') {
      cause.status = 'cancelled';
    } else if (cause.status === 'cancelled') {
      cause.status = 'active';
    } else {
      // For completed or paused, we can set to cancelled
      cause.status = 'cancelled';
    }

    await cause.save();

    const updatedCause = await Cause.findById(cause._id)
      .populate('createdBy', 'firstName lastName email');

    // Story 3.4: Log cause archiving
    await logCauseArchived(req, updatedCause);

    res.json({
      success: true,
      message: `Cause ${cause.status === 'cancelled' ? 'archived' : 'unarchived'} successfully`,
      data: updatedCause
    });
  } catch (error) {
    console.error('Error archiving cause:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while archiving cause' 
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users (admin view)
// @access  Admin only
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -resetToken -resetTokenExpiry')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching users' 
    });
  }
});

// @route   GET /api/admin/users/:id
// @desc    Get a single user by ID
// @access  Admin only
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -resetToken -resetTokenExpiry');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching user' 
    });
  }
});

// @route   GET /api/admin/previous-donations
// @desc    Get all donations across users (admin view)
// @access  Admin only
router.get('/previous-donations', async (req, res) => {
  try {
    // Support filtering via query params: startDate, endDate, minAmount, maxAmount, donorName, paymentMethod, cause, status, sort
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
    } = req.query;

    const match = {};

    if (startDate || endDate) {
      match['donations.date'] = {};
      if (startDate) match['donations.date'].$gte = new Date(startDate);
      if (endDate) match['donations.date'].$lte = new Date(endDate);
    }

    // Only add amount filters when values are provided (non-empty)
    if ((minAmount !== undefined && String(minAmount).trim() !== '') || (maxAmount !== undefined && String(maxAmount).trim() !== '')) {
      match['donations.amount'] = {};
      if (minAmount !== undefined && String(minAmount).trim() !== '') match['donations.amount'].$gte = Number(minAmount);
      if (maxAmount !== undefined && String(maxAmount).trim() !== '') match['donations.amount'].$lte = Number(maxAmount);
      // If conversion produces NaN (bad input), remove the amount constraint entirely
      if (isNaN(match['donations.amount'].$gte) && isNaN(match['donations.amount'].$lte)) {
        delete match['donations.amount'];
      }
    }

    if (paymentMethod) match['donations.paymentMethod'] = paymentMethod;
    if (cause) match['donations.cause'] = cause;
    if (status) match['donations.status'] = status;
    if (donorName) {
      // match either firstName or lastName or email
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

    // Sorting
    if (sort) {
      const sortField = {};
      const direction = sort.startsWith('-') ? -1 : 1;
      const field = sort.replace(/^-/, '');
      sortField[field] = direction;
      pipeline.push({ $sort: sortField });
    }

    // If export=csv, produce CSV and send as attachment
    if (exportType === 'csv') {
      const results = await User.aggregate(pipeline).allowDiskUse(true);
      // Build CSV
      const headers = ['paymentId', 'amount', 'cause', 'date', 'paymentMethod', 'status', 'donorId', 'donorName', 'donorEmail'];
      const rows = [headers.join(',')];
      for (const r of results) {
        const row = headers.map(h => {
          let v = r[h];
          if (v === undefined || v === null) return '';
          if (h === 'date') v = new Date(v).toISOString();
          // escape quotes
          return `"${String(v).replace(/"/g, '""')}"`;
        }).join(',');
        rows.push(row);
      }
      const csv = rows.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="previous_donations_${Date.now()}.csv"`);
      return res.send(csv);
    }

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(1000, Number(limit) || 50);
    const skip = (pageNum - 1) * limitNum;

    pipeline.push({ $skip: skip }, { $limit: limitNum });

    const donations = await User.aggregate(pipeline).allowDiskUse(true);
    res.json({ success: true, count: donations.length, page: pageNum, data: donations });
  } catch (error) {
    console.error('Error fetching previous donations:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching previous donations' });
  }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Update user role
// @access  Admin only
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;

    if (!role || !['donor', 'admin'].includes(role)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid role (donor or admin) is required' 
      });
    }

    const user = await User.findById(req.params.id)
      .select('-password -resetToken -resetTokenExpiry');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Prevent admin from changing their own role
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ 
        success: false,
        message: 'You cannot change your own role' 
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    // Story 3.4: Log user role change
    await logUserRoleChanged(req, user, oldRole, role);

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      data: user
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating user role' 
    });
  }
});

// @route   GET /api/admin/dashboard/stats
// @desc    Get dashboard statistics
// @access  Admin only
router.get('/dashboard/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDonors = await User.countDocuments({ role: 'donor' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalCauses = await Cause.countDocuments();
    const activeCauses = await Cause.countDocuments({ status: 'active' });
    
    // Calculate total donations across all causes
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

    const stats = {
      users: {
        total: totalUsers,
        donors: totalDonors,
        admins: totalAdmins
      },
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

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching dashboard statistics' 
    });
  }
});

// @route   POST /api/admin/causes/update-expired
// @desc    Manually trigger update of expired causes (for testing/immediate execution)
// @access  Admin only
router.post('/causes/update-expired', async (req, res) => {
  try {
    const result = await updateExpiredCauses();
    
    res.json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} expired cause(s)`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error updating expired causes:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating expired causes',
      error: error.message
    });
  }
});

export default router;

// @route   GET /api/admin/donations/by-user
// @desc    Aggregate donations grouped by user (admin only)
// @access  Admin only
router.get('/donations/by-user', async (req, res) => {
  try {
    // Aggregate per user: totalAmount, donationCount, lastDonationDate, avgDonation
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

    const results = await User.aggregate(pipeline).allowDiskUse(true);
    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    console.error('Error aggregating donations by user:', error);
    res.status(500).json({ success: false, message: 'Server error while aggregating donations by user' });
  }
});
