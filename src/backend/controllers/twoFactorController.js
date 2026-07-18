import { sendResponse } from "../utils/response.js";
import * as twoFactorService from "../services/twoFactorService.js";

export const setupTwoFactor = async (req, res) => {
  try {
    const data = await twoFactorService.setupTwoFactor(req.user._id);
    sendResponse(res, 200, true, 'Scan this QR code with your authenticator app',
      data
    );
  } catch (error) {
    if (error.message === '2FA is already enabled for your account') {
      return sendResponse(res, 400, false, error.message );
    }
    console.error('Error generating 2FA secret:', error);
    sendResponse(res, 500, false, 'Error setting up 2FA' );
  }
};

export const verifySetupAndEnable = async (req, res) => {
  try {
    const backupCodes = await twoFactorService.verifySetupAndEnable(req.user._id, req.body.token);
    res.json({
      success: true,
      message: '2FA enabled successfully! Save these backup codes in a safe place.',
      data: { backupCodes }
    });
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('first') || error.message.includes('Invalid')) {
      return sendResponse(res, 400, false, error.message );
    }
    console.error('Error verifying 2FA setup:', error);
    sendResponse(res, 500, false, 'Error enabling 2FA' );
  }
};

export const disableTwoFactor = async (req, res) => {
  try {
    await twoFactorService.disableTwoFactor(req.user._id, req.body.password);
    sendResponse(res, 200, true, '2FA has been disabled for your account' );
  } catch (error) {
    if (error.message.includes('required')) return sendResponse(res, 400, false, error.message );
    if (error.message.includes('Invalid')) return sendResponse(res, 401, false, error.message );
    
    console.error('Error disabling 2FA:', error);
    sendResponse(res, 500, false, 'Error disabling 2FA' );
  }
};

export const getTwoFactorStatus = async (req, res) => {
  try {
    const isEnabled = await twoFactorService.getTwoFactorStatus(req.user._id);
    res.json({ success: true, data: { twoFactorEnabled: isEnabled } });
  } catch (error) {
    console.error('Error getting 2FA status:', error);
    sendResponse(res, 500, false, 'Error retrieving 2FA status' );
  }
};
