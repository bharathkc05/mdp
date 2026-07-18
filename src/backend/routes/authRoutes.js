import express from "express";
import { protect } from "../middleware/auth.js";
import { 
  loginRateLimiter, 
  passwordResetRateLimiter, 
  registrationRateLimiter 
} from "../middleware/rateLimiter.js";
import * as authController from "../controllers/authController.js";

const router = express.Router();

router.post('/forgot-password', passwordResetRateLimiter, authController.forgotPassword);
router.post('/reset-password', passwordResetRateLimiter, authController.resetPassword);
router.post('/register', registrationRateLimiter, authController.register);
router.post('/resend-verification', authController.resendVerification);
router.get('/verify', authController.verify);
router.get('/verify/:token', (req, res) => {
  req.query.token = req.params.token;
  return authController.verify(req, res);
});
router.post('/login', loginRateLimiter, authController.login);
router.post('/logout', protect, authController.logout);

export default router;
