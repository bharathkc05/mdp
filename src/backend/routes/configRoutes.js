import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import * as configController from "../controllers/configController.js";

const router = express.Router();

// @route   GET /api/config
// @desc    Get platform configuration (public)
// @access  Public (anyone can read config to display correctly)
router.get('/', configController.getConfig);

// @route   PUT /api/config
// @desc    Update platform configuration
// @access  Admin only
router.put('/', protect, authorize('admin'), configController.updateConfig);

// @route   GET /api/config/currency-presets
// @desc    Get predefined currency presets
// @access  Public
router.get('/currency-presets', configController.getCurrencyPresets);

export default router;
