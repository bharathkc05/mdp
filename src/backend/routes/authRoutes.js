import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import User from "../models/User.js";
import { sendVerificationEmail } from "../utils/email.js";
import { protect } from "../middleware/auth.js";
import { sendPasswordResetEmail } from "../utils/email.js";
import { logger } from "../utils/logger.js";
import { 
  loginRateLimiter, 
  passwordResetRateLimiter, 
  registrationRateLimiter 
} from "../middleware/rateLimiter.js";
import { verifyBackupCode } from "./twoFactorRoutes.js";
// Story 3.4: Audit Logging
import { 
  logUserRegistration, 
  logLoginSuccess, 
  logLoginFailed,
  logUserLogout,
  logPasswordReset,
  logEmailVerified
} from "../utils/auditLogger.js";

const router = express.Router();

// Request password reset - Story 5.3: Rate Limited
router.post('/forgot-password', passwordResetRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create password reset token
    const resetToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Store reset token and expiry in user document
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send password reset email
    try {
      const emailResult = await sendPasswordResetEmail(user.email, resetToken);
      return res.json({
        message: 'Password reset instructions sent to your email',
        previewUrl: emailResult.previewUrl
      });
    } catch (emailError) {
      if (req?.log) req.log.error({ err: emailError }, 'Error sending password reset email');
      else logger.error({ err: emailError }, 'Error sending password reset email');
      return res.status(500).json({ 
        message: 'Error sending password reset email. Please try again later.'
      });
    }
  } catch (error) {
    if (req?.log) req.log.error({ err: error }, 'Error in forgot password');
    else logger.error({ err: error }, 'Error in forgot password');
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password with token - Story 5.3: Rate Limited
router.post('/reset-password', passwordResetRateLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      email: decoded.email,
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password
    // Don't manually hash - the pre-save hook in User model will handle it
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    // Story 3.4: Log password reset
    await logPasswordReset(req, user);

    res.json({ message: 'Password successfully reset. You can now login with your new password.' });
  } catch (error) {
    if (req?.log) req.log.error({ err: error }, 'Error in reset password');
    else logger.error({ err: error }, 'Error in reset password');
    res.status(500).json({ message: 'Error resetting password' });
  }
});

// Resend verification email route
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.verified) {
      return res.status(400).json({ message: 'Account is already verified' });
    }

    // create new verification token
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // send verification email
    try {
      const emailResult = await sendVerificationEmail(user.email, token);
      return res.json({ 
        message: 'Verification email has been resent! Please check your inbox.',
        token, // Include token for manual verification
        previewUrl: emailResult.previewUrl
      });
    } catch (emailError) {
      if (req?.log) req.log.error({ err: emailError }, 'Error sending verification email');
      else logger.error({ err: emailError }, 'Error sending verification email');
      return res.status(500).json({ 
        message: 'Error sending verification email, but registration was successful. Use the token below to verify manually.',
        token
      });
    }
  } catch (error) {
    if (req?.log) req.log.error({ err: error }, 'Error in resend verification');
    else logger.error({ err: error }, 'Error in resend verification');
    res.status(500).json({ message: 'Error resending verification email' });
  }
});

// Register route - Story 5.3: Rate Limited
router.post('/register', registrationRateLimiter, async (req, res) => {
  try {
    const { firstName, lastName, age, gender, email, password, confirmPassword } = req.body;

    if (!firstName || !lastName || !age || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    // Let the model's pre-save hook handle password hashing
    const user = await User.create({
      firstName,
      lastName,
      age,
      gender,
      email,
      password, // Pass the plain password, model will hash it
      verified: false
    });

    // create verification token
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Story 3.4: Log user registration
    await logUserRegistration(req, user);

    // send verification email
      try {
        if (req?.log) req.log.info('Attempting to send verification email');
        else logger.info('Attempting to send verification email');
        const emailResult = await sendVerificationEmail(user.email, token);
        if (req?.log) req.log.info({ result: emailResult }, 'Email sent successfully');
        else logger.info({ result: emailResult }, 'Email sent successfully');
        return res.json({ 
          message: 'Registration successful! Please check your email to verify your account.', 
          previewUrl: emailResult.previewUrl,
          verificationToken: emailResult.token,
          verificationLink: emailResult.link
        });
      } catch (err) {
        if (req?.log) req.log.error({ err }, 'Failed to send verification email');
        else logger.error({ err }, 'Failed to send verification email');
        // Since user is created but email failed, provide token for manual verification
        return res.json({ 
          message: 'Registered successfully but failed to send verification email.', 
          verificationToken: token,
          error: err.message 
        });
      }
  } catch (err) {
    if (req?.log) req.log.error({ err }, 'Registration error');
    else logger.error({ err }, 'Registration error');
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify endpoint (accepts token via query or param)
router.get('/verify', async (req, res) => {
  try {
  if (req?.log) req.log.info({ token: req.query.token }, 'Verifying email with token');
  else logger.info({ token: req.query.token }, 'Verifying email with token');
    const token = req.query.token || req.params.token;
    if (!token) return res.status(400).json({ message: 'Token required' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded:', decoded);
    
    const user = await User.findOne({ email: decoded.email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (user.verified) {
      return res.json({ message: 'Email already verified. You can now login.' });
    }
    
    user.verified = true;
    await user.save();
    console.log('User verified:', user.email);
    
    // Story 3.4: Log email verification
    await logEmailVerified(req, user);
    
    return res.json({ message: 'Email verified successfully. You can now login.' });
  } catch (err) {
    console.error('Verification error:', err);
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
});

router.get('/verify/:token', async (req, res) => {
  // backward compatible route
  req.query.token = req.params.token;
  return router.handle(req, res);
});

// Login - Story 5.3: Rate Limited
// Updated for Story 1.5: Two-Factor Authentication
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password, twoFactorCode, backupCode } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check password first
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      // Story 3.4: Log failed login attempt
      await logLoginFailed(req, email, 'Invalid password');
      return res.status(401).json({ message: 'Invalid password' });
    }
    
    // Check verification after password is confirmed
    if (!user.verified) {
      console.log('Unverified user attempting to login:', email);
      // Generate a new verification token
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
      
      try {
        const emailResult = await sendVerificationEmail(user.email, token);
        return res.status(403).json({ 
          message: 'Please verify your email to login. A new verification email has been sent.',
          previewUrl: emailResult.previewUrl,
          verificationToken: token
        });
      } catch (emailErr) {
        console.error('Failed to send verification email:', emailErr);
        return res.status(403).json({ 
          message: 'Please verify your email to login. Use this token to verify manually:',
          verificationToken: token
        });
      }
    }

    // Story 1.5: Check if 2FA is enabled for admin users
    if (user.role === 'admin' && user.twoFactorEnabled) {
      // If 2FA is enabled but no code provided, prompt for 2FA
      if (!twoFactorCode && !backupCode) {
        return res.status(200).json({ 
          requiresTwoFactor: true,
          message: 'Please enter your 2FA code',
          userId: user._id // Will be used to verify 2FA code
        });
      }

      // Verify 2FA code or backup code
      let twoFactorValid = false;

      if (backupCode) {
        // Verify backup code
        twoFactorValid = await verifyBackupCode(user._id, backupCode);
        if (!twoFactorValid) {
          return res.status(401).json({ message: 'Invalid or already used backup code' });
        }
      } else if (twoFactorCode) {
        // Verify TOTP code
        twoFactorValid = speakeasy.totp.verify({
          secret: user.twoFactorSecret,
          encoding: 'base32',
          token: twoFactorCode,
          window: 2 // Allow 2 time steps for clock skew
        });

        if (!twoFactorValid) {
          return res.status(401).json({ message: 'Invalid 2FA code' });
        }
      }

      if (!twoFactorValid) {
        return res.status(401).json({ message: 'Invalid 2FA authentication' });
      }
    }

    // If user is verified and password is correct (and 2FA passed if required), create login token
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // Update last activity timestamp on login
    user.lastActivity = Date.now();
    await user.save();
    
    // Story 3.4: Log successful login
    await logLoginSuccess(req, user);
    
    return res.json({ message: 'Login successful', token, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      age: user.age,
      gender: user.gender,
      role: user.role,
      profile: user.profile,
      twoFactorEnabled: user.twoFactorEnabled
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, age, gender, profile } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update basic fields if provided
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (age) user.age = age;
    if (gender) user.gender = gender;

    // Update profile fields if provided
    if (profile) {
      if (!user.profile) user.profile = {};
      if (profile.phoneNumber !== undefined) user.profile.phoneNumber = profile.phoneNumber;
      if (profile.address !== undefined) user.profile.address = profile.address;
      if (profile.preferredCauses !== undefined) user.profile.preferredCauses = profile.preferredCauses;
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        age: user.age,
        gender: user.gender,
        role: user.role,
        profile: user.profile,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

// Logout - Invalidate current token
router.post('/logout', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const token = req.token;

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Decode token to get expiration time
    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000);

    // Add token to blacklist
    if (!user.tokenBlacklist) {
      user.tokenBlacklist = [];
    }

    user.tokenBlacklist.push({
      token: token,
      expiresAt: expiresAt
    });

    // Clean up expired tokens from blacklist to prevent bloat
    user.tokenBlacklist = user.tokenBlacklist.filter(
      item => item.expiresAt > Date.now()
    );

    await user.save();

    // Story 3.4: Log user logout
    await logUserLogout(req, user);

    res.json({ 
      message: 'Logged out successfully',
      success: true 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Error logging out' });
  }
});

export default router;
