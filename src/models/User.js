const mongoose = require('mongoose');
const { customAlphabet } = require('nanoid');

// Generate custom referral code: NUV-XXXXXX format
const generateReferralCode = () => {
  const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);
  return `NUV-${nanoid()}`;
};

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: [true, 'Wallet address is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^0x[a-fA-F0-9]{40}$/,
      'Please provide a valid Ethereum wallet address'
    ],
    index: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Allow null but enforce uniqueness when present
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address'
    ]
  },
  referralCode: {
    type: String,
    unique: true,
    uppercase: true,
    index: true
  },
  totalXP: {
    type: Number,
    default: 0,
    min: 0
  },
  nonce: {
    type: String,
    default: null
  },
  nonceExpiry: {
    type: Date,
    default: null
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceFingerprint: String,
    source: String,
    firstLoginAt: Date,
    lastLoginAt: Date,
    isSuspicious: {
      type: Boolean,
      default: false
    },
    suspiciousReasons: [String]
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance (walletAddress, email, referralCode already indexed via unique/index options)
userSchema.index({ totalXP: -1 }); // For leaderboard queries
userSchema.index({ createdAt: 1 });
userSchema.index({ isActive: 1 });

// Pre-save middleware to generate referral code
userSchema.pre('save', async function(next) {
  if (this.isNew && !this.referralCode) {
    // Generate unique referral code
    let code;
    let isUnique = false;
    
    while (!isUnique) {
      code = generateReferralCode();
      const existing = await this.constructor.findOne({ referralCode: code });
      if (!existing) {
        isUnique = true;
      }
    }
    
    this.referralCode = code;
  }
  
  next();
});

// Static method to find by wallet or email
userSchema.statics.findByIdentifier = async function(identifier) {
  const normalized = identifier.toLowerCase().trim();
  
  // Check if it's an email or wallet address
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
  
  if (isEmail) {
    return this.findOne({ email: normalized });
  } else {
    return this.findOne({ walletAddress: normalized });
  }
};

// Static method to increment XP
userSchema.statics.incrementXP = async function(walletAddress, deltaXP) {
  return this.findOneAndUpdate(
    { walletAddress: walletAddress.toLowerCase() },
    { $inc: { totalXP: deltaXP } },
    { new: true }
  );
};

// Instance method to get user stats
userSchema.methods.getStats = function() {
  return {
    walletAddress: this.walletAddress,
    email: this.email,
    referralCode: this.referralCode,
    totalXP: this.totalXP,
    joinedAt: this.createdAt,
    isActive: this.isActive
  };
};

// Instance method to generate nonce for authentication
userSchema.methods.generateNonce = function() {
  const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 32);
  this.nonce = nanoid();
  this.nonceExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  return this.nonce;
};

// Instance method to verify nonce
userSchema.methods.verifyNonce = function(nonce) {
  if (!this.nonce || !this.nonceExpiry) {
    return false;
  }
  
  if (this.nonce !== nonce) {
    return false;
  }
  
  if (new Date() > this.nonceExpiry) {
    return false;
  }
  
  return true;
};

// Instance method to clear nonce after successful auth
userSchema.methods.clearNonce = function() {
  this.nonce = null;
  this.nonceExpiry = null;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
