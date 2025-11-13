import express from "express";
import PlatformConfig from "../models/PlatformConfig.js";
import { protect, authorize } from "../middleware/auth.js";
import { logConfigUpdated } from "../utils/auditLogger.js";

const router = express.Router();

// @route   GET /api/config
// @desc    Get platform configuration (public)
// @access  Public (anyone can read config to display correctly)
router.get('/', async (req, res) => {
  try {
    const config = await PlatformConfig.getConfig();
    
    res.json({
      success: true,
      data: {
        minimumDonation: config.minimumDonation,
        currency: config.currency
      }
    });
  } catch (error) {
    console.error('Error fetching platform config:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching configuration' 
    });
  }
});

// @route   PUT /api/config
// @desc    Update platform configuration
// @access  Admin only
router.put('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { minimumDonation, currency } = req.body;
    
    // Validate minimum donation if provided
    if (minimumDonation) {
      if (minimumDonation.amount !== undefined) {
        if (typeof minimumDonation.amount !== 'number' || minimumDonation.amount < 0.01) {
          return res.status(400).json({
            success: false,
            message: 'Minimum donation amount must be at least 0.01'
          });
        }
      }
      
      if (minimumDonation.enabled !== undefined && typeof minimumDonation.enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Minimum donation enabled must be a boolean'
        });
      }
    }
    
    // Validate currency if provided
    if (currency) {
      const validCurrencyCodes = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY'];
      if (currency.code && !validCurrencyCodes.includes(currency.code)) {
        return res.status(400).json({
          success: false,
          message: `Currency code must be one of: ${validCurrencyCodes.join(', ')}`
        });
      }
      
      if (currency.position && !['before', 'after'].includes(currency.position)) {
        return res.status(400).json({
          success: false,
          message: 'Currency position must be "before" or "after"'
        });
      }
      
      if (currency.decimalPlaces !== undefined) {
        if (typeof currency.decimalPlaces !== 'number' || currency.decimalPlaces < 0 || currency.decimalPlaces > 4) {
          return res.status(400).json({
            success: false,
            message: 'Decimal places must be between 0 and 4'
          });
        }
      }
    }
    
    // Update configuration
    const updatedConfig = await PlatformConfig.updateConfig(
      { minimumDonation, currency }, 
      req.user._id
    );
    
    // Story 3.4: Log configuration update
    await logConfigUpdated(req.user._id, { minimumDonation, currency });
    
    res.json({
      success: true,
      message: 'Platform configuration updated successfully',
      data: {
        minimumDonation: updatedConfig.minimumDonation,
        currency: updatedConfig.currency
      }
    });
  } catch (error) {
    console.error('Error updating platform config:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating configuration' 
    });
  }
});

// @route   GET /api/config/currency-presets
// @desc    Get predefined currency presets
// @access  Public
router.get('/currency-presets', (req, res) => {
  const presets = [
    { code: 'USD', symbol: '$', position: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', position: 'before', decimalPlaces: 2, thousandsSeparator: '.', decimalSeparator: ',', name: 'Euro' },
    { code: 'GBP', symbol: '£', position: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', name: 'British Pound' },
    { code: 'INR', symbol: '₹', position: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', name: 'Indian Rupee' },
    { code: 'CAD', symbol: 'CA$', position: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', position: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', name: 'Australian Dollar' },
    { code: 'JPY', symbol: '¥', position: 'before', decimalPlaces: 0, thousandsSeparator: ',', decimalSeparator: '.', name: 'Japanese Yen' }
  ];
  
  res.json({
    success: true,
    data: presets
  });
});

export default router;
