const mongoose = require('mongoose');

const xpLedgerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null,
    index: true
  },
  deltaXP: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'connect_wallet',
      'deposit',
      'supply',
      'borrow',
      'swap',
      'claim_faucet',
      'complete_quest',
      'referral_reward_inviter',
      'referral_reward_invitee',
      'select_strategy',
      'admin_adjustment',
      'penalty',
      'other'
    ]
  },
  description: {
    type: String,
    default: ''
  },
  metadata: {
    questId: mongoose.Schema.Types.ObjectId,
    referralId: mongoose.Schema.Types.ObjectId,
    ruleId: mongoose.Schema.Types.ObjectId,
    adminWallet: String,
    extra: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
xpLedgerSchema.index({ userId: 1, createdAt: -1 });
xpLedgerSchema.index({ reason: 1 });
// eventId already indexed via "index: true" on field definition

// Static method to add XP entry
xpLedgerSchema.statics.addXP = async function(userId, deltaXP, reason, description = '', metadata = {}, eventId = null) {
  const User = mongoose.model('User');
  
  // Get current user XP
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  const balanceAfter = user.totalXP + deltaXP;
  
  // Ensure balance doesn't go negative
  if (balanceAfter < 0) {
    throw new Error('Insufficient XP balance');
  }
  
  // Create ledger entry
  const entry = await this.create({
    userId,
    eventId,
    deltaXP,
    balanceAfter,
    reason,
    description,
    metadata
  });
  
  // Update user total XP
  await User.findByIdAndUpdate(userId, { totalXP: balanceAfter });
  
  return entry;
};

// Static method to get user ledger
xpLedgerSchema.statics.getUserLedger = async function(userId, options = {}) {
  const {
    reason = null,
    limit = 50,
    skip = 0,
    startDate = null,
    endDate = null
  } = options;
  
  const query = { userId };
  
  if (reason) query.reason = reason;
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .populate('eventId')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to calculate total XP for a user (for verification)
xpLedgerSchema.statics.calculateTotalXP = async function(userId) {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, total: { $sum: '$deltaXP' } } }
  ]);
  
  return result.length > 0 ? result[0].total : 0;
};

// Static method to get XP summary by reason
xpLedgerSchema.statics.getXPSummary = async function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$reason',
        totalXP: { $sum: '$deltaXP' },
        count: { $sum: 1 }
      }
    },
    { $sort: { totalXP: -1 } }
  ]);
};

const XPLedger = mongoose.model('XPLedger', xpLedgerSchema);

module.exports = XPLedger;
