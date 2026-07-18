import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import User from "../models/User.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "./emailService.js";
import { verifyBackupCode as checkBackupCode } from "./twoFactorService.js";

const generateToken = (payload, expiresIn = '1h') => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', { expiresIn });
};

export const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error('User not found');

  const resetToken = generateToken({ id: user._id, email: user.email });
  user.resetToken = resetToken;
  user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
  await user.save();

  const emailResult = await sendPasswordResetEmail(user.email, resetToken);
  return { resetToken, previewUrl: emailResult.previewUrl };
};

export const resetPassword = async (token, newPassword) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findOne({
    email: decoded.email,
    resetToken: token,
    resetTokenExpiry: { $gt: Date.now() }
  });

  if (!user) throw new Error('Invalid or expired reset token');

  user.password = newPassword; // Pre-save hook hashes it
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  return user;
};

export const registerUser = async (userData) => {
  const { firstName, lastName, age, gender, email, password } = userData;

  const existing = await User.findOne({ email });
  if (existing) throw new Error('Email already registered');

  const user = await User.create({
    firstName,
    lastName,
    age,
    gender,
    email,
    password,
    verified: false
  });

  const token = generateToken({ email: user.email });
  return { user, token };
};

export const resendVerification = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error('User not found');
  if (user.verified) throw new Error('Account is already verified');

  const token = generateToken({ email: user.email });
  const emailResult = await sendVerificationEmail(user.email, token);
  return { token, previewUrl: emailResult.previewUrl };
};

export const verifyEmail = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findOne({ email: decoded.email });
  
  if (!user) throw new Error('User not found');
  if (user.verified) return { user, alreadyVerified: true };

  user.verified = true;
  await user.save();
  return { user, alreadyVerified: false };
};

export const loginUser = async (email, password, twoFactorCode, backupCode) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error('User not found');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('Invalid password');

  if (!user.verified) {
    const token = generateToken({ email: user.email });
    let emailResult = null;
    try {
      emailResult = await sendVerificationEmail(user.email, token);
    } catch (e) {
      // Ignore if email sending fails, we just return the token
    }
    return { 
      requiresVerification: true, 
      token, 
      previewUrl: emailResult?.previewUrl 
    };
  }

  // 2FA Check for admin users
  if (user.role === 'admin' && user.twoFactorEnabled) {
    if (!twoFactorCode && !backupCode) {
      return { requiresTwoFactor: true, userId: user._id };
    }

    let twoFactorValid = false;
    if (backupCode) {
      twoFactorValid = await checkBackupCode(user._id, backupCode);
      if (!twoFactorValid) throw new Error('Invalid or already used backup code');
    } else if (twoFactorCode) {
      twoFactorValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2
      });
      if (!twoFactorValid) throw new Error('Invalid 2FA code');
    }

    if (!twoFactorValid) throw new Error('Invalid 2FA authentication');
  }

  const token = generateToken({ id: user._id, email: user.email });
  
  // Update last activity
  user.lastActivity = Date.now();
  await user.save();

  return { user, token };
};

export const logoutUser = async (user, token) => {
  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000);

  if (!user.tokenBlacklist) {
    user.tokenBlacklist = [];
  }

  user.tokenBlacklist.push({ token, expiresAt });
  user.tokenBlacklist = user.tokenBlacklist.filter(item => item.expiresAt > Date.now());
  await user.save();
};
