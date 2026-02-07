const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  inviterUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  inviteeUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referralCode: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rewarded', 'rejected'],
    default: 'pending',
    index: true
  },
  verificationCriteria: {
    firstLogin: {
      type: Boolean,
      default: false
    },
    firstOnchainAction: {
      type: Boolean,
      default: false
    },
    minXPReached: {
      type: Boolean,
      default: false
    },
    minXPThreshold: {
      type: Number,
      default: 100
    }
  },
  rewardDistributed: {
    inviterXP: {
      type: Number,
      default: 0
    },
    inviteeXP: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceFingerprint: String,
    source: String,
    isSuspicious: {
      type: Boolean,
      default: false
    },
    suspiciousReasons: [String]
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  rewardedAt: {
    type: Date,
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes
referralSchema.index({ inviterUserId: 1, status: 1 });
referralSchema.index({ referralCode: 1, status: 1 });
referralSchema.index({ status: 1, createdAt: 1 });

// Ensure one invitee can only be referred once (this also creates the index for inviteeUserId)
referralSchema.index({ inviteeUserId: 1 }, { unique: true });

// Static method to create referral
referralSchema.statics.createReferral = async function(inviterUserId, inviteeUserId, referralCode, metadata = {}) {
  try {
    // Check if invitee already has a referral
    const existing = await this.findOne({ inviteeUserId });
    if (existing) {
      throw new Error('User has already been referred');
    }
    
    const referral = await this.create({
      inviterUserId,
      inviteeUserId,
      referralCode,
      metadata
    });
    
    return referral;
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('User has already been referred');
    }
    throw error;
  }
};

// Static method to get user referrals (as inviter)
referralSchema.statics.getUserReferrals = async function(userId, options = {}) {
  const {
    status = null,
    limit = 50,
    skip = 0
  } = options;
  
  const query = { inviterUserId: userId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('inviteeUserId', 'walletAddress email totalXP createdAt')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get referral stats
referralSchema.statics.getReferralStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { inviterUserId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalXP: { $sum: '$rewardDistributed.inviterXP' }
      }
    }
  ]);
  
  const result = {
    total: 0,
    pending: 0,
    verified: 0,
    rewarded: 0,
    rejected: 0,
    totalXPEarned: 0
  };
  
  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
    if (stat._id === 'rewarded') {
      result.totalXPEarned = stat.totalXP;
    }
  });
  
  return result;
};

// Instance method to check verification criteria
referralSchema.methods.checkVerification = async function() {
  const User = mongoose.model('User');
  const Event = mongoose.model('Event');
  
  const invitee = await User.findById(this.inviteeUserId);
  if (!invitee) {
    return { verified: false, reason: 'Invitee not found' };
  }
  
  // Check first login
  if (!this.verificationCriteria.firstLogin && invitee.metadata.firstLoginAt) {
    this.verificationCriteria.firstLogin = true;
  }
  
  // Check first onchain action
  if (!this.verificationCriteria.firstOnchainAction) {
    const onchainEvent = await Event.findOne({
      userId: this.inviteeUserId,
      'metadata.txHash': { $exists: true, $ne: null },
      status: { $in: ['verified', 'processed'] }
    });
    
    if (onchainEvent) {
      this.verificationCriteria.firstOnchainAction = true;
    }
  }
  
  // Check min XP threshold
  if (!this.verificationCriteria.minXPReached && invitee.totalXP >= this.verificationCriteria.minXPThreshold) {
    this.verificationCriteria.minXPReached = true;
  }
  
  // All criteria must be met
  const allMet = this.verificationCriteria.firstLogin &&
                 this.verificationCriteria.firstOnchainAction &&
                 this.verificationCriteria.minXPReached;
  
  if (allMet && this.status === 'pending') {
    this.status = 'verified';
    this.verifiedAt = new Date();
    await this.save();
    return { verified: true };
  }
  
  return { verified: false, criteria: this.verificationCriteria };
};

// Instance method to distribute rewards
referralSchema.methods.distributeRewards = async function(inviterXP = 500, inviteeXP = 100) {
  if (this.status !== 'verified') {
    throw new Error('Referral must be verified before distributing rewards');
  }
  
  const XPLedger = mongoose.model('XPLedger');
  
  // Add XP to inviter
  await XPLedger.addXP(
    this.inviterUserId,
    inviterXP,
    'referral_reward_inviter',
    `Referral reward for inviting user`,
    { referralId: this._id }
  );
  
  // Add XP to invitee
  await XPLedger.addXP(
    this.inviteeUserId,
    inviteeXP,
    'referral_reward_invitee',
    `Referral reward for joining`,
    { referralId: this._id }
  );
  
  // Update referral record
  this.rewardDistributed.inviterXP = inviterXP;
  this.rewardDistributed.inviteeXP = inviteeXP;
  this.status = 'rewarded';
  this.rewardedAt = new Date();
  
  await this.save();
  
  return this;
};

// Instance method to reject referral
referralSchema.methods.reject = async function(reason) {
  this.status = 'rejected';
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  await this.save();
  return this;
};

const Referral = mongoose.model('Referral', referralSchema);

module.exports = Referral;
