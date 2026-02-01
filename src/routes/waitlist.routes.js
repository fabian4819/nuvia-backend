const express = require('express');
const router = express.Router();
const waitlistController = require('../controllers/waitlist.controller');
const {
  joinWaitlistValidation,
  getPositionValidation,
  verifyReferralValidation,
  handleValidationErrors
} = require('../middlewares/validation');

/**
 * @swagger
 * /api/waitlist/join:
 *   post:
 *     tags: [Waitlist]
 *     summary: Join the waitlist
 *     description: Register for the waitlist with email and/or wallet address
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               walletAddress:
 *                 type: string
 *                 example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 *               referralCode:
 *                 type: string
 *                 example: "NUVIA123"
 *                 description: Optional referral code from existing member
 *     responses:
 *       201:
 *         description: Successfully joined waitlist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     position:
 *                       type: number
 *                       example: 42
 *                     referralCode:
 *                       type: string
 *                       example: "NUVIA-ABC123"
 *                     referralLink:
 *                       type: string
 *                       example: "https://nuviafinance.com/waitlist?ref=NUVIA-ABC123"
 *       400:
 *         description: Already registered or invalid data
 */
router.post(
  '/join',
  joinWaitlistValidation,
  handleValidationErrors,
  waitlistController.joinWaitlist
);

/**
 * @swagger
 * /api/waitlist/position/{identifier}:
 *   get:
 *     tags: [Waitlist]
 *     summary: Get waitlist position
 *     description: Get your position in the waitlist by email or wallet address
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: Email address or wallet address
 *         example: "user@example.com"
 *     responses:
 *       200:
 *         description: Position retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     position:
 *                       type: number
 *                       example: 42
 *                     totalWaitlist:
 *                       type: number
 *                       example: 1500
 *                     referralCode:
 *                       type: string
 *                       example: "NUVIA-ABC123"
 *                     referrals:
 *                       type: number
 *                       example: 5
 *       404:
 *         description: Not found in waitlist
 */
router.get(
  '/position/:identifier',
  getPositionValidation,
  handleValidationErrors,
  waitlistController.getPosition
);

/**
 * @swagger
 * /api/waitlist/stats:
 *   get:
 *     tags: [Waitlist]
 *     summary: Get waitlist statistics
 *     description: Get overall waitlist statistics (total members, etc.)
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalMembers:
 *                       type: number
 *                       example: 1500
 *                     totalReferrals:
 *                       type: number
 *                       example: 450
 *                     averageReferrals:
 *                       type: number
 *                       example: 0.3
 */
router.get('/stats', waitlistController.getStats);

/**
 * @swagger
 * /api/waitlist/verify/{referralCode}:
 *   get:
 *     tags: [Waitlist]
 *     summary: Verify referral code
 *     description: Check if a referral code is valid
 *     parameters:
 *       - in: path
 *         name: referralCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Referral code to verify
 *         example: "NUVIA-ABC123"
 *     responses:
 *       200:
 *         description: Referral code is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                       example: true
 *                     referralCode:
 *                       type: string
 *                       example: "NUVIA-ABC123"
 *       404:
 *         description: Invalid referral code
 */
router.get(
  '/verify/:referralCode',
  verifyReferralValidation,
  handleValidationErrors,
  waitlistController.verifyReferralCode
);

module.exports = router;

