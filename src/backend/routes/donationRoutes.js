import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { donationRateLimiter } from '../middleware/rateLimiter.js';
import * as donationController from '../controllers/donationController.js';

const router = express.Router();

router.use(protect);

router.get('/admin/previous-donations', authorize('admin'), donationController.getPreviousDonations);
router.get('/admin/by-user', authorize('admin'), donationController.getDonationsByUser);

router.post('/', donationRateLimiter, donationController.makeDonation);
router.post('/multi', donationRateLimiter, donationController.makeMultiDonation);
router.get('/history', donationController.getDonationHistory);
router.get('/stats', donationController.getDonationStats);
router.get('/receipt/:paymentId', donationController.getDonationReceipt);

export default router;