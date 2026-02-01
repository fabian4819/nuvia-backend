const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/admin/xp-rules:
 *   get:
 *     tags: [Admin]
 *     summary: Get all XP rules (Admin only)
 *     description: Get all XP rules including inactive ones
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: XP rules retrieved successfully
 */
router.get('/xp-rules', protect, adminOnly, adminController.getAllXPRules);

/**
 * @swagger
 * /api/admin/xp-rules:
 *   post:
 *     tags: [Admin]
 *     summary: Create XP rule (Admin only)
 *     description: Create a new XP earning rule with cooldowns and limits
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - actionType
 *               - xpAmount
 *             properties:
 *               actionType:
 *                 type: string
 *                 example: "new_action"
 *                 description: Unique action type identifier
 *               xpAmount:
 *                 type: number
 *                 example: 75
 *                 description: XP points awarded
 *               cooldownMinutes:
 *                 type: number
 *                 example: 60
 *                 description: Cooldown period in minutes
 *               dailyLimit:
 *                 type: number
 *                 example: 5
 *                 description: Maximum times per day (0 = unlimited)
 *               weeklyLimit:
 *                 type: number
 *                 example: 20
 *                 description: Maximum times per week (0 = unlimited)
 *               minAmount:
 *                 type: string
 *                 example: "10"
 *                 description: Minimum amount required (for financial actions)
 *               validChains:
 *                 type: array
 *                 items:
 *                   type: number
 *                 example: [84532]
 *                 description: Valid chain IDs for blockchain actions
 *               description:
 *                 type: string
 *                 example: "Complete a new action"
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               metadata:
 *                 type: object
 *                 properties:
 *                   displayName:
 *                     type: string
 *                   category:
 *                     type: string
 *     responses:
 *       201:
 *         description: XP rule created successfully
 */
router.post('/xp-rules', protect, adminOnly, adminController.createXPRule);

/**
 * @swagger
 * /api/admin/xp-rules/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update XP rule (Admin only)
 *     description: Update existing XP rule including cooldowns and limits
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: XP Rule ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               xpAmount:
 *                 type: number
 *                 example: 100
 *               cooldownMinutes:
 *                 type: number
 *                 example: 30
 *               dailyLimit:
 *                 type: number
 *                 example: 10
 *               weeklyLimit:
 *                 type: number
 *                 example: 50
 *               isActive:
 *                 type: boolean
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: XP rule updated successfully
 */
router.put('/xp-rules/:id', protect, adminOnly, adminController.updateXPRule);

/**
 * @swagger
 * /api/admin/xp-rules/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete XP rule (Admin only)
 *     description: Delete an XP rule (soft delete - sets isActive to false)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: XP rule deleted successfully
 */
router.delete('/xp-rules/:id', protect, adminOnly, adminController.deleteXPRule);

/**
 * @swagger
 * /api/admin/leaderboard/generate:
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
router.post('/leaderboard/generate', protect, adminOnly, adminController.generateLeaderboard);

/**
 * @swagger
 * /api/admin/quests:
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
 *                 example: "Daily Trader"
 *               description:
 *                 type: string
 *                 example: "Make 5 trades in a day"
 *               cadence:
 *                 type: string
 *                 enum: [daily, weekly, one-time]
 *               rules:
 *                 type: object
 *                 description: Quest completion rules
 *               rewardXP:
 *                 type: number
 *                 example: 100
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Quest created successfully
 */
router.post('/quests', protect, adminOnly, adminController.createQuest);

/**
 * @swagger
 * /api/admin/quests/{id}:
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               rewardXP:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *               rules:
 *                 type: object
 *     responses:
 *       200:
 *         description: Quest updated successfully
 */
router.put('/quests/:id', protect, adminOnly, adminController.updateQuest);

module.exports = router;
