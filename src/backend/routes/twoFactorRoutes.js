import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as twoFactorController from '../controllers/twoFactorController.js';
import * as twoFactorService from '../services/twoFactorService.js';
import { strictRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All 2FA routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// @route   POST /api/2fa/setup
// @desc    Generate 2FA secret and QR code for enrollment
// @access  Admin only
router.post('/setup', strictRateLimiter, twoFactorController.setupTwoFactor);

// @route   POST /api/2fa/verify-setup
// @desc    Verify TOTP code and enable 2FA
// @access  Admin only
router.post('/verify-setup', strictRateLimiter, twoFactorController.verifySetupAndEnable);

// @route   POST /api/2fa/disable
// @desc    Disable 2FA for admin account
// @access  Admin only
router.post('/disable', twoFactorController.disableTwoFactor);

// @route   GET /api/2fa/status
// @desc    Get 2FA status for current admin user
// @access  Admin only
router.get('/status', twoFactorController.getTwoFactorStatus);

// @route   POST /api/2fa/verify-backup-code
// @desc    Verify backup code and mark as used
// @access  Public (used during login)
export const verifyBackupCode = twoFactorService.verifyBackupCode;

export default router;
