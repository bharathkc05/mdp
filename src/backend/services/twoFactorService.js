import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import User from '../models/User.js';

export const setupTwoFactor = async (userId) => {
  const user = await User.findById(userId);
  if (user.twoFactorEnabled) {
    throw new Error('2FA is already enabled for your account');
  }

  const secret = speakeasy.generateSecret({
    name: `MDP (${user.email})`,
    length: 32
  });

  user.twoFactorSecret = secret.base32;
  await user.save();

  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

  return {
    qrCode: qrCodeUrl,
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url
  };
};

export const verifySetupAndEnable = async (userId, token) => {
  if (!token) throw new Error('Verification code is required');

  const user = await User.findById(userId);
  if (!user.twoFactorSecret) {
    throw new Error('Please generate a 2FA secret first');
  }

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: token,
    window: 2
  });

  if (!verified) {
    throw new Error('Invalid verification code. Please try again.');
  }

  const backupCodes = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    backupCodes.push({ code, used: false });
  }

  user.twoFactorEnabled = true;
  user.backupCodes = backupCodes;
  await user.save();

  return backupCodes.map(bc => bc.code);
};

export const disableTwoFactor = async (userId, password) => {
  if (!password) throw new Error('Password is required to disable 2FA');

  const user = await User.findById(userId);
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new Error('Invalid password');
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  user.backupCodes = [];
  await user.save();
};

export const getTwoFactorStatus = async (userId) => {
  const user = await User.findById(userId).select('twoFactorEnabled');
  return user.twoFactorEnabled || false;
};

export const verifyBackupCode = async (userId, backupCode) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.twoFactorEnabled) return false;

    const codeIndex = user.backupCodes.findIndex(bc => bc.code === backupCode.toUpperCase() && !bc.used);
    if (codeIndex === -1) return false;

    user.backupCodes[codeIndex].used = true;
    await user.save();
    return true;
  } catch (error) {
    console.error('Error verifying backup code:', error);
    return false;
  }
};
