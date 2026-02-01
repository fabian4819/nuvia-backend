const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboard.controller');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/leaderboard:
 *   get:
 *     tags: [Leaderboard]
 *     summary: Get leaderboard
 *     description: Get paginated leaderboard for specified period
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [all-time, daily, weekly]
 *           default: all-time
 *         description: Leaderboard period
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of results
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number to skip for pagination
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
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
 *                     leaderboard:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           rank:
 *                             type: number
 *                           walletAddress:
 *                             type: string
 *                           score:
 *                             type: number
 *                     snapshot:
 *                       type: object
 */
router.get('/', leaderboardController.getLeaderboard);

/**
 * @swagger
 * /api/leaderboard/me:
 *   get:
 *     tags: [Leaderboard]
 *     summary: Get my rank
 *     description: Get current user's rank in leaderboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [all-time, daily, weekly]
 *           default: all-time
 *     responses:
 *       200:
 *         description: Rank retrieved successfully
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
 *                     found:
 *                       type: boolean
 *                     rank:
 *                       type: number
 *                       example: 5
 *                     score:
 *                       type: number
 *                       example: 250
 */
router.get('/me', protect, leaderboardController.getMyRank);

/**
 * @swagger
 * /api/leaderboard/snapshot/latest:
 *   get:
 *     tags: [Leaderboard]
 *     summary: Get latest snapshot metadata
 *     description: Get metadata for the latest leaderboard snapshot
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [all-time, daily, weekly]
 *           default: all-time
 *     responses:
 *       200:
 *         description: Snapshot metadata retrieved
 */
router.get('/snapshot/latest', leaderboardController.getLatestSnapshot);

/**
 * @swagger
 * /api/leaderboard/admin/generate:
 *   post:
 *     tags: [Admin]
 *     summary: Generate leaderboard snapshot (Admin only)
 *     description: Manually trigger leaderboard snapshot generation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               period:
 *                 type: string
 *                 enum: [all-time, daily, weekly]
 *                 default: all-time
 *     responses:
 *       200:
 *         description: Snapshot generated successfully
 */
router.post('/admin/generate', protect, adminOnly, leaderboardController.generateSnapshot);

module.exports = router;
