const mongoose = require('mongoose');

const leaderboardRowSchema = new mongoose.Schema({
  snapshotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaderboardSnapshot',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: {
    type: Number,
    required: true,
    default: 0
  },
  rank: {
    type: Number,
    required: true,
    index: true
  },
  metadata: {
    walletAddress: String,
    referralCount: Number,
    questsCompleted: Number,
    extra: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
leaderboardRowSchema.index({ snapshotId: 1, rank: 1 });
leaderboardRowSchema.index({ snapshotId: 1, score: -1 });

// Ensure unique user per snapshot (this also creates the compound index for snapshotId + userId)
leaderboardRowSchema.index({ snapshotId: 1, userId: 1 }, { unique: true });

// Static method to get leaderboard for a snapshot
leaderboardRowSchema.statics.getLeaderboard = async function(snapshotId, options = {}) {
  const {
    limit = 100,
    skip = 0,
    minRank = null,
    maxRank = null
  } = options;
  
  const query = { snapshotId };
  
  if (minRank !== null || maxRank !== null) {
    query.rank = {};
    if (minRank !== null) query.rank.$gte = minRank;
    if (maxRank !== null) query.rank.$lte = maxRank;
  }
  
  return this.find(query)
    .populate('userId', 'walletAddress email totalXP')
    .sort({ rank: 1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get user rank in a snapshot
leaderboardRowSchema.statics.getUserRank = async function(snapshotId, userId) {
  return this.findOne({ snapshotId, userId })
    .populate('userId', 'walletAddress email totalXP');
};

// Static method to bulk insert leaderboard rows
leaderboardRowSchema.statics.bulkInsertRows = async function(snapshotId, rows) {
  const documents = rows.map((row, index) => ({
    snapshotId,
    userId: row.userId,
    score: row.score,
    rank: index + 1,
    metadata: row.metadata || {}
  }));
  
  return this.insertMany(documents, { ordered: false });
};

const LeaderboardRow = mongoose.model('LeaderboardRow', leaderboardRowSchema);

module.exports = LeaderboardRow;
