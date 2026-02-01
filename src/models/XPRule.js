const mongoose = require('mongoose');

const xpRuleSchema = new mongoose.Schema({
  actionType: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    lowercase: true
  },
  xpAmount: {
    type: Number,
    required: true,
    min: 0
  },
  dailyLimit: {
    type: Number,
    default: null, // null means no limit
    min: 0
  },
  minAmount: {
    type: String, // Store as string to avoid precision issues
    default: null // For deposit/supply/borrow actions
  },
  validChains: {
    type: [Number], // Array of chain IDs
    default: []
  },
  validProtocols: {
    type: [String], // Array of protocol names
    default: []
  },
  cooldownMinutes: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  description: {
    type: String,
    default: ''
  },
  metadata: {
    displayName: String,
    icon: String,
    category: String,
    extra: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
xpRuleSchema.index({ actionType: 1, isActive: 1 });

// Static method to get active rules
xpRuleSchema.statics.getActiveRules = async function() {
  return this.find({ isActive: true }).sort({ actionType: 1 });
};

// Static method to get rule by action type
xpRuleSchema.statics.getRuleByAction = async function(actionType) {
  return this.findOne({ actionType, isActive: true });
};

// Static method to validate event against rule
xpRuleSchema.statics.validateEvent = async function(actionType, eventMetadata = {}) {
  const rule = await this.getRuleByAction(actionType);
  
  if (!rule) {
    return { valid: false, reason: 'No active rule found for this action' };
  }
  
  // Check chain validation
  if (rule.validChains.length > 0 && eventMetadata.chainId) {
    if (!rule.validChains.includes(eventMetadata.chainId)) {
      return { valid: false, reason: 'Invalid chain ID' };
    }
  }
  
  // Check protocol validation
  if (rule.validProtocols.length > 0 && eventMetadata.protocol) {
    if (!rule.validProtocols.includes(eventMetadata.protocol)) {
      return { valid: false, reason: 'Invalid protocol' };
    }
  }
  
  // Check minimum amount
  if (rule.minAmount && eventMetadata.amount) {
    const minAmount = parseFloat(rule.minAmount);
    const eventAmount = parseFloat(eventMetadata.amount);
    
    if (eventAmount < minAmount) {
      return { valid: false, reason: `Minimum amount is ${rule.minAmount}` };
    }
  }
  
  return { valid: true, rule };
};

// Instance method to check if user can earn XP (cooldown check)
xpRuleSchema.methods.canUserEarnXP = async function(userId) {
  if (this.cooldownMinutes === 0) {
    return { canEarn: true };
  }
  
  const Event = mongoose.model('Event');
  const cooldownMs = this.cooldownMinutes * 60 * 1000;
  const cutoffTime = new Date(Date.now() - cooldownMs);
  
  const recentEvent = await Event.findOne({
    userId,
    type: this.actionType,
    status: { $in: ['verified', 'processed'] },
    occurredAt: { $gte: cutoffTime }
  }).sort({ occurredAt: -1 });
  
  if (recentEvent) {
    const remainingMs = cooldownMs - (Date.now() - recentEvent.occurredAt.getTime());
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    
    return {
      canEarn: false,
      reason: `Cooldown active. Try again in ${remainingMinutes} minutes.`,
      nextAvailableAt: new Date(recentEvent.occurredAt.getTime() + cooldownMs)
    };
  }
  
  return { canEarn: true };
};

// Instance method to check daily limit
xpRuleSchema.methods.checkDailyLimit = async function(userId) {
  if (!this.dailyLimit) {
    return { withinLimit: true };
  }
  
  const Event = mongoose.model('Event');
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const todayCount = await Event.countDocuments({
    userId,
    type: this.actionType,
    status: { $in: ['verified', 'processed'] },
    occurredAt: { $gte: startOfDay }
  });
  
  if (todayCount >= this.dailyLimit) {
    return {
      withinLimit: false,
      reason: `Daily limit of ${this.dailyLimit} reached`,
      currentCount: todayCount
    };
  }
  
  return {
    withinLimit: true,
    currentCount: todayCount,
    remaining: this.dailyLimit - todayCount
  };
};

const XPRule = mongoose.model('XPRule', xpRuleSchema);

module.exports = XPRule;
