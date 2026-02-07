const Waitlist = require('../models/Waitlist');
const User = require('../models/User');
const XPLedger = require('../models/XPLedger');

/**
 * Join waitlist
 * POST /api/waitlist/join
 */
exports.joinWaitlist = async (req, res, next) => {
  try {
    const { email, walletAddress, referralCode } = req.body;

    // Check if email already exists
    const existingEmail = await Waitlist.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered in waitlist'
      });
    }

    // Check if wallet address already exists
    const existingWallet = await Waitlist.findOne({ walletAddress });
    if (existingWallet) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address already registered in waitlist'
      });
    }

    // Check if this wallet already has a User account (use their referral code)
    let existingUser = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    let assignedReferralCode = null;

    if (existingUser) {
      // Use the User's referral code for consistency
      assignedReferralCode = existingUser.referralCode;
    }

    // Validate referral code if provided (check both User and Waitlist)
    let referrer = null;
    let referrerUser = null;

    if (referralCode) {
      const upperCode = referralCode.toUpperCase();

      // First try to find in User collection (preferred)
      referrerUser = await User.findOne({ referralCode: upperCode });

      if (referrerUser) {
        // Also get their waitlist entry if it exists
        referrer = await Waitlist.findOne({ walletAddress: referrerUser.walletAddress });
      } else {
        // Fallback to waitlist-only referral code
        referrer = await Waitlist.findOne({ referralCode: upperCode });
      }

      if (!referrerUser && !referrer) {
        return res.status(400).json({
          success: false,
          message: 'Invalid referral code'
        });
      }
    }

    // Create new waitlist entry
    const waitlistEntry = new Waitlist({
      email,
      walletAddress,
      referredBy: referralCode ? referralCode.toUpperCase() : null,
      referralCode: assignedReferralCode, // Use User code if exists, otherwise auto-generated
      metadata: {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        source: req.body.source || 'web'
      }
    });

    await waitlistEntry.save();

    // Update referrer's count and reward XP if applicable
    if (referrerUser) {
      // Update waitlist count if they have a waitlist entry
      if (referrer) {
        await Waitlist.incrementReferralCount(referrer.referralCode);
      }

      // Give 100 XP to referrer
      const referralXP = parseInt(process.env.WAITLIST_REFERRAL_XP) || 100;

      await XPLedger.addXP(
        referrerUser._id,
        referralXP,
        'other',
        `Waitlist referral reward - ${email} joined using your code`,
        {
          waitlistId: waitlistEntry._id,
          inviteeEmail: email,
          inviteeWallet: walletAddress
        }
      );
    } else if (referrer) {
      // Old waitlist-only referral (no User account)
      await Waitlist.incrementReferralCount(referrer.referralCode);
    }

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Successfully joined the waitlist',
      data: {
        position: waitlistEntry.position,
        referralCode: waitlistEntry.referralCode,
        email: waitlistEntry.email,
        walletAddress: waitlistEntry.walletAddress
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get position in waitlist
 * GET /api/waitlist/position/:identifier
 */
exports.getPosition = async (req, res, next) => {
  try {
    const { identifier } = req.params;

    // Try to find by email or wallet address
    const entry = await Waitlist.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { walletAddress: identifier.toLowerCase() }
      ]
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'No waitlist entry found for this identifier'
      });
    }

    res.status(200).json({
      success: true,
      data: entry.getStats()
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get waitlist statistics
 * GET /api/waitlist/stats
 */
exports.getStats = async (req, res, next) => {
  try {
    const totalEntries = await Waitlist.countDocuments();
    const pendingEntries = await Waitlist.countDocuments({ status: 'pending' });
    const approvedEntries = await Waitlist.countDocuments({ status: 'approved' });
    
    // Get top referrers
    const topReferrers = await Waitlist.find()
      .sort({ 'metadata.referralCount': -1 })
      .limit(10)
      .select('email referralCode metadata.referralCount');

    // Get recent entries
    const recentEntries = await Waitlist.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('position createdAt');

    res.status(200).json({
      success: true,
      data: {
        total: totalEntries,
        pending: pendingEntries,
        approved: approvedEntries,
        topReferrers: topReferrers.map(r => ({
          email: r.email,
          referralCode: r.referralCode,
          referralCount: r.metadata.referralCount || 0
        })),
        recentPositions: recentEntries.map(e => e.position)
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Verify referral code
 * GET /api/waitlist/verify/:referralCode
 */
exports.verifyReferralCode = async (req, res, next) => {
  try {
    const { referralCode } = req.params;

    const entry = await Waitlist.findOne({ 
      referralCode: referralCode.toUpperCase() 
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Invalid referral code'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        valid: true,
        referralCode: entry.referralCode,
        referralCount: entry.metadata.referralCount || 0
      }
    });

  } catch (error) {
    next(error);
  }
};
