const express = require('express');
const router = express.Router();
const questController = require('../controllers/quest.controller');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/quests/today:
 *   get:
 *     tags: [Quests]
 *     summary: Get today's quests
 *     description: Get today's daily quests with progress
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's quests retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       quest:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "Daily Login"
 *                           description:
 *                             type: string
 *                           rewardXP:
 *                             type: number
 *                             example: 25
 *                       progress:
 *                         type: object
 *                         properties:
 *                           progressValue:
 *                             type: number
 *                           isCompleted:
 *                             type: boolean
 *                           isClaimed:
 *                             type: boolean
 */
router.get('/today', protect, questController.getTodayQuests);

/**
 * @swagger
 * /api/quests:
 *   get:
 *     tags: [Quests]
 *     summary: Get all active quests
 *     description: Get all active quests with user progress
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active quests retrieved successfully
 */
router.get('/', protect, questController.getAllQuests);

/**
 * @swagger
 * /api/quests/claim:
 *   post:
 *     tags: [Quests]
 *     summary: Claim quest reward
 *     description: Claim XP reward for completed quest
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - questId
 *             properties:
 *               questId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Quest reward claimed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Quest reward claimed: +25 XP"
 *                 data:
 *                   type: object
 *                   properties:
 *                     xpAwarded:
 *                       type: number
 *                       example: 25
 */
router.post('/claim', protect, questController.claimQuestReward);

/**
 * @swagger
 * /api/quests/history:
 *   get:
 *     tags: [Quests]
 *     summary: Get quest history
 *     description: Get claimed quest history for current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Quest history retrieved successfully
 */
router.get('/history', protect, questController.getQuestHistory);

/**
 * @swagger
 * /api/quests/admin:
 *   post:
 *     tags: [Admin]
 *     summary: Create quest (Admin only)
 *     description: Create a new quest
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - cadence
 *               - rules
 *               - rewardXP
 *             properties:
 *               name:
 *                 type: string
 *                 example: "New Quest"
 *               description:
 *                 type: string
 *               cadence:
 *                 type: string
 *                 enum: [daily, weekly, one-time]
 *               rules:
 *                 type: object
 *               rewardXP:
 *                 type: number
 *                 example: 100
 *     responses:
 *       201:
 *         description: Quest created successfully
 */
router.post('/admin', protect, adminOnly, questController.createQuest);

/**
 * @swagger
 * /api/quests/admin/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update quest (Admin only)
 *     description: Update existing quest
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rewardXP:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Quest updated successfully
 */
router.put('/admin/:id', protect, adminOnly, questController.updateQuest);

module.exports = router;
