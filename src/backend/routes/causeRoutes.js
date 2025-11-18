import express from 'express';
import Cause from '../models/Cause.js';

const router = express.Router();

/**
 * @route   GET /api/causes
 * @desc    Get all active causes with optional search and filter
 * @access  Public
 * @query   search - keyword search in title/description
 * @query   category - filter by category
 */
router.get('/', async (req, res) => {
  try {
    const { search, category } = req.query;
    
    // Build query object
    let query = { status: 'active' }; // Only show active causes
    
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
    
    // Fetch causes with sorting (newest first)
    const causes = await Cause.find(query)
      .select('name description category imageUrl targetAmount currentAmount donorCount createdAt')
      .sort({ createdAt: -1 })
      .lean();
    
    // Calculate percentage for each cause
    const causesWithPercentage = causes.map(cause => ({
      ...cause,
      percentageAchieved: cause.targetAmount > 0 
        ? Math.round((cause.currentAmount / cause.targetAmount) * 100) 
        : 0
    }));
    
    res.json({
      success: true,
      count: causesWithPercentage.length,
      causes: causesWithPercentage
    });
  } catch (error) {
    console.error('Error fetching causes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch causes',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/causes/:id
 * @desc    Get a single cause by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const cause = await Cause.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .lean();
    
    if (!cause) {
      return res.status(404).json({
        success: false,
        message: 'Cause not found'
      });
    }
    
    // Calculate percentage
    const percentageAchieved = cause.targetAmount > 0 
      ? Math.round((cause.currentAmount / cause.targetAmount) * 100) 
      : 0;
    
    res.json({
      success: true,
      cause: {
        ...cause,
        percentageAchieved
      }
    });
  } catch (error) {
    console.error('Error fetching cause:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cause',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/causes/categories/list
 * @desc    Get all available categories
 * @access  Public
 */
router.get('/categories/list', async (req, res) => {
  try {
    // Get categories from the Cause model schema enum
    const categories = [
      { value: 'education', label: 'Education' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'environment', label: 'Environment' },
      { value: 'disaster-relief', label: 'Disaster Relief' },
      { value: 'poverty', label: 'Poverty' },
      { value: 'animal-welfare', label: 'Animal Welfare' },
      { value: 'other', label: 'Other' }
    ];
    
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

export default router;
