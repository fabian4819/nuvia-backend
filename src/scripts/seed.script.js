require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const xpService = require('../services/xp.service');
const questService = require('../services/quest.service');
const logger = require('../utils/logger');

// Import all models to ensure collections are created
const User = require('../models/User');
const Event = require('../models/Event');
const XPLedger = require('../models/XPLedger');
const XPRule = require('../models/XPRule');
const Referral = require('../models/Referral');
const Quest = require('../models/Quest');
const QuestProgress = require('../models/QuestProgress');
const LeaderboardSnapshot = require('../models/LeaderboardSnapshot');
const LeaderboardRow = require('../models/LeaderboardRow');
const Waitlist = require('../models/Waitlist');

async function seedData() {
  try {
    logger.info('Starting data seeding...');

    // Connect to database
    await connectDB();

    // Initialize all collections (creates them if they don't exist)
    logger.info('Initializing collections...');
    await Promise.all([
      User.createCollection().catch(() => logger.info('Users collection already exists')),
      Event.createCollection().catch(() => logger.info('Events collection already exists')),
      XPLedger.createCollection().catch(() => logger.info('XPLedger collection already exists')),
      XPRule.createCollection().catch(() => logger.info('XPRule collection already exists')),
      Referral.createCollection().catch(() => logger.info('Referral collection already exists')),
      Quest.createCollection().catch(() => logger.info('Quest collection already exists')),
      QuestProgress.createCollection().catch(() => logger.info('QuestProgress collection already exists')),
      LeaderboardSnapshot.createCollection().catch(() => logger.info('LeaderboardSnapshot collection already exists')),
      LeaderboardRow.createCollection().catch(() => logger.info('LeaderboardRow collection already exists')),
      Waitlist.createCollection().catch(() => logger.info('Waitlist collection already exists'))
    ]);

    // Seed XP rules
    logger.info('Seeding XP rules...');
    await xpService.seedDefaultRules();

    // Seed quests
    logger.info('Seeding quests...');
    await questService.seedDefaultQuests();

    logger.info('Data seeding completed successfully!');
    logger.info('All collections have been initialized');

    process.exit(0);
  } catch (error) {
    logger.error('Data seeding failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Run seeding
seedData();
