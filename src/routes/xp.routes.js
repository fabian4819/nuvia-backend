const express = require('express');
const router = express.Router();
const xpController = require('../controllers/xp.controller');
const { protect } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/xp/rules:
 *   get:
 *     tags: [XP System]
 *     summary: Get all active XP rules
 *     description: Retrieve list of all active XP earning rules
 *     responses:
 *       200:
 *         description: XP rules retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/XPRule'
 */
router.get('/rules', xpController.getRules);

/**
 * @swagger
 * /api/xp/me:
 *   get:
 *     tags: [XP System]
 *     summary: Get my XP summary
 *     description: Get current user's total XP and breakdown
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: XP summary retrieved successfully
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
 *                     totalXP:
 *                       type: number
 *                       example: 250
 *                     breakdown:
 *                       type: object
 *                     recentActivity:
 *                       type: array
 */
router.get('/me', protect, xpController.getMyXP);

/**
 * @swagger
 * /api/xp/ledger:
 *   get:
 *     tags: [XP System]
 *     summary: Get XP transaction history
 *     description: Get paginated XP ledger for current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of records to return
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: XP ledger retrieved successfully
 */
router.get('/ledger', protect, xpController.getMyLedger);

/**
 * @swagger
 * /api/events:
 *   post:
 *     tags: [XP System]
 *     summary: Submit event to earn XP
 *     description: Submit user action/event to earn XP points
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [connect_wallet, deposit, supply, claim_faucet, select_strategy]
 *                 example: "connect_wallet"
 *               metadata:
 *                 type: object
 *                 properties:
 *                   txHash:
 *                     type: string
 *                     example: "0x..."
 *                     description: Required for onchain events (deposit, supply, claim_faucet)
 *                   chainId:
 *                     type: number
 *                     example: 84532
 *                     description: Required for onchain events
 *                   tokenSymbol:
 *                     type: string
 *                     example: "USDC"
 *                     description: Required for deposit/supply events
 *                   amount:
 *                     type: string
 *                     example: "100"
 *                     description: Amount for deposit/supply events
 *               idempotencyKey:
 *                 type: string
 *                 example: "deposit-1234567890"
 *                 description: Optional key to prevent duplicate processing
 *     responses:
 *       200:
 *         description: Event processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Successfully earned 50 XP"
 *                 data:
 *                   type: object
 *                   properties:
 *                     eventId:
 *                       type: string
 *                     xpAwarded:
 *                       type: number
 *                       example: 50
 */
router.post('/', protect, xpController.submitEvent);

/**
 * @swagger
 * /api/events/me:
 *   get:
 *     tags: [XP System]
 *     summary: Get my event history
 *     description: Get paginated event history for current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by event type
 *     responses:
 *       200:
 *         description: Event history retrieved successfully
 */
router.get('/me', protect, xpController.getMyEvents);

module.exports = router;
