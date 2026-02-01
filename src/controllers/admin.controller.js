const logger = require('../utils/logger');
const XPRule = require('../models/XPRule');
const Quest = require('../models/Quest');
const leaderboardService = require('../services/leaderboard.service');
const questService = require('../services/quest.service');

// ==================== XP RULES MANAGEMENT ====================

// @desc    Get all XP rules (including inactive)
// @route   GET /api/admin/xp-rules
// @access  Private (Admin only)
exports.getAllXPRules = async (req, res) => {
  try {
    const rules = await XPRule.find({}).sort({ actionType: 1 });
    
    res.status(200).json({
      success: true,
      data: rules
    });
  } catch (error) {
    logger.error('Get all XP rules error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get XP rules',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Create XP rule
// @route   POST /api/admin/xp-rules
// @access  Private (Admin only)
exports.createXPRule = async (req, res) => {
  try {
    const {
      actionType,
      xpAmount,
      cooldownMinutes,
      dailyLimit,
      weeklyLimit,
      minAmount,
      validChains,
      description,
      isActive,
      metadata
    } = req.body;
    
    // Validate required fields
    if (!actionType || xpAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'actionType and xpAmount are required'
      });
    }
    
    // Check if action type already exists
    const existing = await XPRule.findOne({ actionType });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `XP rule for action type '${actionType}' already exists`
      });
    }
    
    // Create new rule
    const rule = await XPRule.create({
      actionType,
      xpAmount,
      cooldownMinutes: cooldownMinutes || 0,
      dailyLimit: dailyLimit || 0,
      weeklyLimit: weeklyLimit || 0,
      minAmount,
      validChains,
      description,
      isActive: isActive !== undefined ? isActive : true,
      metadata
    });
    
    logger.info('XP rule created', {
      actionType,
      xpAmount,
      adminWallet: req.user.walletAddress
    });
    
    res.status(201).json({
      success: true,
      data: rule,
      message: 'XP rule created successfully'
    });
  } catch (error) {
    logger.error('Create XP rule error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to create XP rule',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update XP rule
// @route   PUT /api/admin/xp-rules/:id
// @access  Private (Admin only)
exports.updateXPRule = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Don't allow changing actionType
    delete updates.actionType;
    
    const rule = await XPRule.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'XP rule not found'
      });
    }
    
    logger.info('XP rule updated', {
      ruleId: id,
      actionType: rule.actionType,
      updates,
      adminWallet: req.user.walletAddress
    });
    
    res.status(200).json({
      success: true,
      data: rule,
      message: 'XP rule updated successfully'
    });
  } catch (error) {
    logger.error('Update XP rule error', {
      error: error.message,
      ruleId: req.params.id,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to update XP rule',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete XP rule (soft delete)
// @route   DELETE /api/admin/xp-rules/:id
// @access  Private (Admin only)
exports.deleteXPRule = async (req, res) => {
  try {
    const { id } = req.params;
    
    const rule = await XPRule.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    );
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'XP rule not found'
      });
    }
    
    logger.info('XP rule deleted', {
      ruleId: id,
      actionType: rule.actionType,
      adminWallet: req.user.walletAddress
    });
    
    res.status(200).json({
      success: true,
      data: rule,
      message: 'XP rule deleted successfully'
    });
  } catch (error) {
    logger.error('Delete XP rule error', {
      error: error.message,
      ruleId: req.params.id,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete XP rule',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== LEADERBOARD MANAGEMENT ====================

// @desc    Generate leaderboard snapshot
// @route   POST /api/admin/leaderboard/generate
// @access  Private (Admin only)
exports.generateLeaderboard = async (req, res) => {
  try {
    const { period = 'all-time' } = req.body;
    
    const snapshot = await leaderboardService.generateSnapshot(period);
    
    logger.info('Leaderboard snapshot generated by admin', {
      period,
      snapshotId: snapshot._id,
      adminWallet: req.user.walletAddress
    });
    
    res.status(200).json({
      success: true,
      data: snapshot,
      message: `${period} leaderboard snapshot generated successfully`
    });
  } catch (error) {
    logger.error('Generate leaderboard error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate leaderboard snapshot',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==================== QUEST MANAGEMENT ====================

// @desc    Create quest
// @route   POST /api/admin/quests
// @access  Private (Admin only)
exports.createQuest = async (req, res) => {
  try {
    const quest = await questService.createQuest(req.body);
    
    logger.info('Quest created by admin', {
      questId: quest._id,
      name: quest.name,
      adminWallet: req.user.walletAddress
    });
    
    res.status(201).json({
      success: true,
      data: quest,
      message: 'Quest created successfully'
    });
  } catch (error) {
    logger.error('Create quest error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to create quest',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update quest
// @route   PUT /api/admin/quests/:id
// @access  Private (Admin only)
exports.updateQuest = async (req, res) => {
  try {
    const { id } = req.params;
    const quest = await questService.updateQuest(id, req.body);
    
    logger.info('Quest updated by admin', {
      questId: id,
      updates: req.body,
      adminWallet: req.user.walletAddress
    });
    
    res.status(200).json({
      success: true,
      data: quest,
      message: 'Quest updated successfully'
    });
  } catch (error) {
    logger.error('Update quest error', {
      error: error.message,
      questId: req.params.id,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to update quest',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = exports;
