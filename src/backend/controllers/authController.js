import * as authService from "../services/authService.js";
import { sendResponse } from "../utils/response.js";
import { logger } from "../utils/logger.js";
import { 
  logUserRegistration, 
  logLoginSuccess, 
  logLoginFailed,
  logUserLogout,
  logPasswordReset,
  logEmailVerified
} from "../services/auditLogService.js";

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return sendResponse(res, 400, false, 'Email is required');

    const result = await authService.forgotPassword(email);
    return sendResponse(res, 200, true, 'Password reset instructions sent to your email', { previewUrl: result.previewUrl
     });
  } catch (error) {
    if (error.message === 'User not found') {
      return sendResponse(res, 404, false, 'User not found');
    }
    const log = req?.log || logger;
    log.error({ err: error }, 'Error in forgot password');
    return sendResponse(res, 500, false, 'Server error');
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return sendResponse(res, 400, false, 'Token and new password are required');
    if (newPassword.length < 8) return sendResponse(res, 400, false, 'Password must be at least 8 characters');

    const user = await authService.resetPassword(token, newPassword);
    await logPasswordReset(req, user);

    return sendResponse(res, 200, true, 'Password successfully reset. You can now login with your new password.' );
  } catch (error) {
    if (error.message === 'Invalid or expired reset token') {
      return sendResponse(res, 400, false, 'Invalid or expired reset token');
    }
    const log = req?.log || logger;
    log.error({ err: error }, 'Error in reset password');
    return sendResponse(res, 500, false, 'Error resetting password');
  }
};

export const register = async (req, res) => {
  try {
    const { firstName, lastName, age, gender, email, password, confirmPassword } = req.body;

    if (!firstName || !lastName || !age || !email || !password || !confirmPassword) {
      return sendResponse(res, 400, false, 'All fields are required');
    }
    if (password !== confirmPassword) return sendResponse(res, 400, false, 'Passwords do not match');
    if (password.length < 8) return sendResponse(res, 400, false, 'Password must be at least 8 characters');

    const { user, token } = await authService.registerUser(req.body);
    await logUserRegistration(req, user);

    try {
      const { resendVerification } = authService;
      // We already have a token from registerUser, we don't necessarily want to call resendVerification and send another email. 
      // Actually authService doesn't send the email in registerUser, wait.
      // Ah, I missed the email sending logic inside authService.registerUser.
      // I will call authService.resendVerification here to send it.
      const log = req?.log || logger;
      log.info('Attempting to send verification email');
      const result = await authService.resendVerification(email);
      log.info({ result }, 'Email sent successfully');

      return sendResponse(res, 200, true, 'Registration successful! Please check your email to verify your account.', { previewUrl: result.previewUrl,
        verificationToken: result.token
       });
    } catch (emailErr) {
      const log = req?.log || logger;
      log.error({ err: emailErr }, 'Failed to send verification email');
      return sendResponse(res, 200, true, 'Registered successfully but failed to send verification email.', {
        verificationToken: token,
        error: emailErr.message 
      });
    }
  } catch (err) {
    if (err.message === 'Email already registered') {
      return sendResponse(res, 400, false, 'Email already registered');
    }
    const log = req?.log || logger;
    log.error({ err }, 'Registration error');
    return sendResponse(res, 500, false, 'Server error: ' + (err.message || 'Unknown error'));
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return sendResponse(res, 400, false, 'Email is required');

    const result = await authService.resendVerification(email);
    return sendResponse(res, 200, true, 'Verification email has been resent! Please check your inbox.', {
      token: result.token,
      previewUrl: result.previewUrl
    });
  } catch (error) {
    if (error.message === 'User not found') return sendResponse(res, 404, false, 'User not found');
    if (error.message === 'Account is already verified') return sendResponse(res, 400, false, 'Account is already verified');
    
    const log = req?.log || logger;
    log.error({ err: error }, 'Error in resend verification');
    return sendResponse(res, 500, false, 'Error resending verification email');
  }
};

export const verify = async (req, res) => {
  try {
    const token = req.query.token || req.params.token;
    if (!token) return sendResponse(res, 400, false, 'Token required');

    const log = req?.log || logger;
    log.info({ token }, 'Verifying email with token');

    const { user, alreadyVerified } = await authService.verifyEmail(token);
    
    if (alreadyVerified) {
      return sendResponse(res, 200, true, 'Email already verified. You can now login.' );
    }

    await logEmailVerified(req, user);
    return sendResponse(res, 200, true, 'Email verified successfully. You can now login.' );
  } catch (err) {
    if (err.message === 'User not found') return sendResponse(res, 404, false, 'User not found');
    console.error('Verification error:', err);
    return sendResponse(res, 400, false, 'Invalid or expired token');
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, twoFactorCode, backupCode } = req.body;
    if (!email || !password) return sendResponse(res, 400, false, 'Email and password required');

    const result = await authService.loginUser(email, password, twoFactorCode, backupCode);

    if (result.requiresVerification) {
      if (result.previewUrl) {
        return res.status(403).json({ 
          message: 'Please verify your email to login. A new verification email has been sent.',
          previewUrl: result.previewUrl,
          verificationToken: result.token
        });
      }
      return res.status(403).json({ 
        message: 'Please verify your email to login. Use this token to verify manually:',
        verificationToken: result.token
      });
    }

    if (result.requiresTwoFactor) {
      return res.status(200).json({ 
        requiresTwoFactor: true,
        message: 'Please enter your 2FA code',
        userId: result.userId
      });
    }

    const { user, token } = result;
    
    await logLoginSuccess(req, user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600000 // 1 hour
    });

    return sendResponse(res, 200, true, 'Login successful', {
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    });
  } catch (err) {
    if (err.message === 'User not found' || err.message === 'Invalid password') {
      await logLoginFailed(req, req.body.email, 'Invalid password');
      return sendResponse(res, 401, false, 'Invalid password');
    }
    if (err.message.includes('Invalid') || err.message.includes('used backup code')) {
      return sendResponse(res, 401, false, err.message);
    }
    console.error(err);
    return sendResponse(res, 500, false, 'Server error');
  }
};

export const logout = async (req, res) => {
  try {
    await authService.logoutUser(req.user, req.token);
    await logUserLogout(req, req.user);

    res.clearCookie('token');
    return sendResponse(res, 200, true, 'Logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
    return sendResponse(res, 500, false, 'Error logging out');
  }
};
