import express from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All 2FA routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// @route   POST /api/2fa/setup
// @desc    Generate 2FA secret and QR code for enrollment
// @access  Admin only
router.post('/setup', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is already enabled for your account'
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `MDP (${user.email})`,
      length: 32
    });

    // Store temporary secret (not enabled yet)
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      message: 'Scan this QR code with your authenticator app',
      data: {
        qrCode: qrCodeUrl,
        secret: secret.base32, // Manual entry option
        otpauthUrl: secret.otpauth_url
      }
    });
  } catch (error) {
    console.error('Error generating 2FA secret:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting up 2FA'
    });
  }
});

// @route   POST /api/2fa/verify-setup
// @desc    Verify TOTP code and enable 2FA
// @access  Admin only
router.post('/verify-setup', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required'
      });
    }

    const user = await User.findById(req.user._id);

    if (!user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: 'Please generate a 2FA secret first'
      });
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps before/after for clock skew
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please try again.'
      });
    }

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push({ code, used: false });
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    user.backupCodes = backupCodes;
    await user.save();

    res.json({
      success: true,
      message: '2FA enabled successfully! Save these backup codes in a safe place.',
      data: {
        backupCodes: backupCodes.map(bc => bc.code)
      }
    });
  } catch (error) {
    console.error('Error verifying 2FA setup:', error);
    res.status(500).json({
      success: false,
      message: 'Error enabling 2FA'
    });
  }
});

// @route   POST /api/2fa/disable
// @desc    Disable 2FA for admin account
// @access  Admin only
router.post('/disable', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to disable 2FA'
      });
    }

    const user = await User.findById(req.user._id);

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.backupCodes = [];
    await user.save();

    res.json({
      success: true,
      message: '2FA has been disabled for your account'
    });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({
      success: false,
      message: 'Error disabling 2FA'
    });
  }
});

// @route   GET /api/2fa/status
// @desc    Get 2FA status for current admin user
// @access  Admin only
router.get('/status', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('twoFactorEnabled');

    res.json({
      success: true,
      data: {
        twoFactorEnabled: user.twoFactorEnabled || false
      }
    });
  } catch (error) {
    console.error('Error getting 2FA status:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving 2FA status'
    });
  }
});

// @route   POST /api/2fa/verify-backup-code
// @desc    Verify backup code and mark as used
// @access  Public (used during login)
export const verifyBackupCode = async (userId, backupCode) => {
  try {
    const user = await User.findById(userId);
    
    if (!user || !user.twoFactorEnabled) {
      return false;
    }

    const codeIndex = user.backupCodes.findIndex(
      bc => bc.code === backupCode.toUpperCase() && !bc.used
    );

    if (codeIndex === -1) {
      return false;
    }

    // Mark backup code as used
    user.backupCodes[codeIndex].used = true;
    await user.save();

    return true;
  } catch (error) {
    console.error('Error verifying backup code:', error);
    return false;
  }
};

export default router;
