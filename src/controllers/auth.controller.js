const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Waitlist = require('../models/Waitlist');
const web3Service = require('../services/web3.service');
const logger = require('../utils/logger');

// Generate JWT token
const generateToken = (userId, walletAddress) => {
  return jwt.sign(
    { userId, walletAddress },
    process.env.JWT_SECRET || 'your-secret-key-change-this',
    { expiresIn: process.env.JWT_EXPIRY || '7d' }
  );
};

// @desc    Request nonce for wallet authentication
// @route   POST /api/auth/nonce
// @access  Public
exports.requestNonce = async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required'
      });
    }
    
    // Validate wallet address
    if (!web3Service.isValidAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address'
      });
    }
    
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Find or create user
    let user = await User.findOne({ walletAddress: normalizedAddress });

    if (!user) {
      // Check if user already has a waitlist entry with a referral code
      const waitlistEntry = await Waitlist.findOne({ walletAddress: normalizedAddress });

      const userData = {
        walletAddress: normalizedAddress
      };

      // If they have a waitlist entry, use that referral code
      if (waitlistEntry && waitlistEntry.referralCode) {
        userData.referralCode = waitlistEntry.referralCode;

        logger.info('Using existing waitlist referral code for new user', {
          walletAddress: normalizedAddress,
          referralCode: waitlistEntry.referralCode,
          requestId: req.requestId
        });
      }

      user = await User.create(userData);

      logger.info('New user created', {
        userId: user._id,
        walletAddress: normalizedAddress,
        referralCode: user.referralCode,
        fromWaitlist: !!waitlistEntry,
        requestId: req.requestId
      });
    }
    
    // Generate nonce
    const nonce = user.generateNonce();
    await user.save();
    
    logger.info('Nonce generated', {
      userId: user._id,
      walletAddress: normalizedAddress,
      requestId: req.requestId
    });
    
    res.status(200).json({
      success: true,
      data: {
        nonce,
        message: `Sign this message to authenticate with Nuvia Finance: ${nonce}`
      }
    });
  } catch (error) {
    logger.error('Request nonce error', {
      error: error.message,
      stack: error.stack,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate nonce',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify signature and authenticate
// @route   POST /api/auth/verify
// @access  Public
exports.verifySignature = async (req, res) => {
  try {
    const { walletAddress, signature, nonce } = req.body;
    
    if (!walletAddress || !signature || !nonce) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address, signature, and nonce are required'
      });
    }
    
    const normalizedAddress = walletAddress.toLowerCase();
    
    // Find user
    const user = await User.findOne({ walletAddress: normalizedAddress });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please request a nonce first.'
      });
    }
    
    // Verify nonce
    if (!user.verifyNonce(nonce)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired nonce. Please request a new one.'
      });
    }
    
    // Verify signature
    const message = `Sign this message to authenticate with Nuvia Finance: ${nonce}`;
    const verification = await web3Service.verifySignature(message, signature, walletAddress);
    
    if (!verification.isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }
    
    // Clear nonce
    user.clearNonce();
    
    // Update login metadata
    if (!user.metadata.firstLoginAt) {
      user.metadata.firstLoginAt = new Date();
    }
    user.metadata.lastLoginAt = new Date();
    user.metadata.ipAddress = req.ip;
    user.metadata.userAgent = req.get('user-agent');
    
    await user.save();
    
    // Generate JWT token
    const token = generateToken(user._id, user.walletAddress);
    
    logger.info('User authenticated', {
      userId: user._id,
      walletAddress: normalizedAddress,
      requestId: req.requestId
    });
    
    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        token,
        user: {
          walletAddress: user.walletAddress,
          email: user.email,
          referralCode: user.referralCode,
          totalXP: user.totalXP,
          isAdmin: user.isAdmin
        }
      }
    });
  } catch (error) {
    logger.error('Verify signature error', {
      error: error.message,
      stack: error.stack,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user.getStats()
    });
  } catch (error) {
    logger.error('Get me error', {
      error: error.message,
      userId: req.user?.userId,
      requestId: req.requestId
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
