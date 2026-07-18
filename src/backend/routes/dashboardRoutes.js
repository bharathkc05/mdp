/**
 * Dashboard Routes
 * Story 4.1: Backend Aggregation of Donation Data
 * 
 * Provides pre-calculated, aggregated donation data for efficient dashboard display
 */

import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import * as dashboardController from "../controllers/dashboardController.js";

const router = express.Router();

// All dashboard routes require authentication
router.use(protect);

/**
 * @route   GET /api/dashboard/aggregated-donations
 * @desc    Get aggregated donation data per cause with pre-calculated totals
 * @access  Authenticated users (Admins get full view, Donors get limited view)
 * @implements Story 4.1 - Backend Aggregation of Donation Data
 */
router.get('/aggregated-donations', dashboardController.getAggregatedDonations);

/**
 * @route   GET /api/dashboard/donation-trends
 * @desc    Get donation trends over time (daily, weekly, monthly)
 * @access  Authenticated users
 */
router.get('/donation-trends', dashboardController.getDonationTrends);

/**
 * @route   GET /api/dashboard/category-breakdown
 * @desc    Get donation breakdown by category
 * @access  Authenticated users
 */
router.get('/category-breakdown', dashboardController.getCategoryBreakdown);

/**
 * @route   GET /api/dashboard/top-causes
 * @desc    Get top performing causes
 * @access  Authenticated users
 */
router.get('/top-causes', dashboardController.getTopCauses);

/**
 * @route   GET /api/dashboard/donor-insights
 * @desc    Get aggregated donor behavior insights
 * @access  Admin only
 */
router.get('/donor-insights', authorize('admin'), dashboardController.getDonorInsights);

/**
 * @route   GET /api/dashboard/performance-metrics
 * @desc    Get overall platform performance metrics
 * @access  Admin only
 */
router.get('/performance-metrics', authorize('admin'), dashboardController.getPerformanceMetrics);

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get general platform stats
 * @access  Admin only
 */
router.get('/stats', authorize('admin'), dashboardController.getDashboardStats);

export default router;
