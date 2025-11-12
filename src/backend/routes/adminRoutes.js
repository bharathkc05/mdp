import express from "express";
import Cause from "../models/Cause.js";
import User from "../models/User.js";
import { protect, authorize } from "../middleware/auth.js";
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

export default router;
