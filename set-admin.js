#!/usr/bin/env node

/**
 * Set Admin User Script
 * 
 * This script updates a user's admin status in the database.
 * 
 * Usage: node set-admin.js <wallet_address>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./src/utils/logger');

async function setAdmin() {
  try {
    const walletAddress = process.argv[2];
    
    if (!walletAddress) {
      console.error('❌ Error: Wallet address required');
      console.log('Usage: node set-admin.js <wallet_address>');
      process.exit(1);
    }
    
    // Normalize wallet address to lowercase
    const normalizedAddress = walletAddress.toLowerCase();
    
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.model('User', require('./src/models/User').schema);

    // Find user by wallet address
    console.log(`🔍 Looking for user: ${normalizedAddress}`);
    const user = await User.findOne({ walletAddress: normalizedAddress });
    
    if (!user) {
      console.log('❌ User not found in database');
      console.log('\nℹ️  User needs to connect wallet first to create account');
      await mongoose.connection.close();
      process.exit(1);
    }
    
    console.log('✅ User found!');
    console.log(`   - ID: ${user._id}`);
    console.log(`   - Wallet: ${user.walletAddress}`);
    console.log(`   - Current isAdmin: ${user.isAdmin}`);
    console.log(`   - Total XP: ${user.totalXP}`);
    
    if (user.isAdmin) {
      console.log('\n⚠️  User is already an admin');
    } else {
      console.log('\n📝 Setting user as admin...');
      user.isAdmin = true;
      await user.save();
      console.log('✅ User is now an admin!');
    }
    
    console.log('\n📊 Admin Status:');
    console.log(`   - isAdmin: ${user.isAdmin}`);
    console.log(`   - Wallet: ${user.walletAddress}`);
    
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error setting admin:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

setAdmin();
