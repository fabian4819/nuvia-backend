require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Waitlist = require('../models/Waitlist');
const logger = require('../utils/logger');

/**
 * Sync Referral Codes Migration Script
 *
 * This script syncs waitlist referral codes with User referral codes:
 * - Finds waitlist entries that have a matching User account (by wallet address)
 * - Updates the waitlist referralCode to match the User's NUV- format code
 * - Ensures consistency across both systems
 */

async function syncReferralCodes() {
  try {
    logger.info('Starting referral code synchronization...');

    // Connect to database
    await connectDB();

    // Get all waitlist entries
    const waitlistEntries = await Waitlist.find({});
    logger.info(`Found ${waitlistEntries.length} waitlist entries`);

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const waitlistEntry of waitlistEntries) {
      try {
        // Find matching User by wallet address
        const user = await User.findOne({
          walletAddress: waitlistEntry.walletAddress.toLowerCase()
        });

        if (user) {
          // Check if codes are different
          if (waitlistEntry.referralCode !== user.referralCode) {
            const oldCode = waitlistEntry.referralCode;

            // Update waitlist referral code to match User code
            waitlistEntry.referralCode = user.referralCode;
            await waitlistEntry.save();

            logger.info(`Synced: ${waitlistEntry.walletAddress}`, {
              oldCode,
              newCode: user.referralCode
            });

            syncedCount++;
          } else {
            logger.info(`Already synced: ${waitlistEntry.walletAddress}`);
            skippedCount++;
          }
        } else {
          logger.info(`No User account found for: ${waitlistEntry.walletAddress}`);
          skippedCount++;
        }
      } catch (error) {
        logger.error(`Error processing ${waitlistEntry.walletAddress}`, {
          error: error.message
        });
        errorCount++;
      }
    }

    logger.info('Referral code synchronization completed!', {
      total: waitlistEntries.length,
      synced: syncedCount,
      skipped: skippedCount,
      errors: errorCount
    });

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Synced: ${syncedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📝 Total: ${waitlistEntries.length}`);

    process.exit(0);
  } catch (error) {
    logger.error('Referral code synchronization failed', {
      error: error.message,
      stack: error.stack
    });

    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
syncReferralCodes();
