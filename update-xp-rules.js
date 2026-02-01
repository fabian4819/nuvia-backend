#!/usr/bin/env node

/**
 * Update XP Rules Script
 * 
 * This script updates existing XP rules in the database
 * to match the current environment configuration.
 * 
 * Usage: node update-xp-rules.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./src/utils/logger');

async function updateXPRules() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const XPRule = mongoose.model('XPRule', require('./src/models/XPRule').schema);

    // Update connect_wallet rule
    const connectWalletUpdate = {
      cooldownMinutes: parseInt(process.env.CONNECT_WALLET_COOLDOWN_MINUTES) || 1440,
      dailyLimit: parseInt(process.env.CONNECT_WALLET_DAILY_LIMIT) || 1,
      xpAmount: parseInt(process.env.DEFAULT_CONNECT_WALLET_XP) || 50
    };

    console.log('📝 Updating connect_wallet rule...');
    console.log('New values:', connectWalletUpdate);
    
    const connectWalletResult = await XPRule.findOneAndUpdate(
      { actionType: 'connect_wallet' },
      { $set: connectWalletUpdate },
      { new: true }
    );

    if (connectWalletResult) {
      console.log('✅ connect_wallet rule updated successfully');
      console.log('   - Cooldown:', connectWalletResult.cooldownMinutes, 'minutes');
      console.log('   - Daily Limit:', connectWalletResult.dailyLimit);
      console.log('   - XP Amount:', connectWalletResult.xpAmount);
    } else {
      console.log('⚠️  connect_wallet rule not found in database');
    }

    console.log('\n📊 Current XP Rules:');
    const allRules = await XPRule.find({}).sort({ actionType: 1 });
    
    allRules.forEach(rule => {
      console.log(`\n${rule.actionType}:`);
      console.log(`  - XP: ${rule.xpAmount}`);
      console.log(`  - Cooldown: ${rule.cooldownMinutes || 'none'} minutes`);
      console.log(`  - Daily Limit: ${rule.dailyLimit || 'unlimited'}`);
      console.log(`  - Active: ${rule.isActive}`);
    });

    console.log('\n✅ XP rules update completed!');
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error updating XP rules:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

updateXPRules();
