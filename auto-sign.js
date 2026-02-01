#!/usr/bin/env node

/**
 * Auto Sign & Authenticate Script (Node.js version)
 * 
 * Usage: node auto-sign.js YOUR_PRIVATE_KEY
 * 
 * This script:
 * 1. Requests nonce from backend
 * 2. Signs message with ethers.js
 * 3. Verifies signature and gets JWT token
 * 4. Saves token to .jwt-token file
 */

const { ethers } = require('ethers');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PRIVATE_KEY = process.argv[2];

if (!PRIVATE_KEY) {
  console.log('Usage: node auto-sign.js YOUR_PRIVATE_KEY');
  console.log('');
  console.log('Example:');
  console.log('  node auto-sign.js 0x1234567890abcdef...');
  console.log('');
  console.log('This will:');
  console.log('  1. Request nonce from backend');
  console.log('  2. Sign message with your private key');
  console.log('  3. Verify signature and get JWT token');
  console.log('  4. Save token to .jwt-token file');
  process.exit(1);
}

// Colors for console
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

async function main() {
  try {
    console.log(`${colors.blue}🔐 Nuvia Finance - Auto Authentication${colors.reset}`);
    console.log('========================================');
    console.log('');

    // Create wallet from private key
    console.log(`${colors.blue}Step 1: Deriving wallet address...${colors.reset}`);
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const walletAddress = wallet.address;
    console.log(`Wallet: ${walletAddress}`);
    console.log('');

    // Request nonce
    console.log(`${colors.blue}Step 2: Requesting nonce...${colors.reset}`);
    const nonceResponse = await fetch(`${BASE_URL}/api/auth/nonce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletAddress }),
    });

    const nonceData = await nonceResponse.json();
    
    if (!nonceData.success) {
      console.log(`${colors.yellow}⚠️  Failed to get nonce${colors.reset}`);
      console.log(JSON.stringify(nonceData, null, 2));
      process.exit(1);
    }

    const { nonce, message } = nonceData.data;
    console.log(`Nonce: ${nonce}`);
    console.log('');

    // Sign message
    console.log(`${colors.blue}Step 3: Signing message...${colors.reset}`);
    console.log(`Message: ${message}`);
    const signature = await wallet.signMessage(message);
    console.log(`Signature: ${signature.substring(0, 50)}...`);
    console.log('');

    // Verify signature and get JWT
    console.log(`${colors.blue}Step 4: Verifying signature...${colors.reset}`);
    const authResponse = await fetch(`${BASE_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        signature,
        nonce,
      }),
    });

    const authData = await authResponse.json();

    if (!authData.success) {
      console.log(`${colors.yellow}⚠️  Authentication failed${colors.reset}`);
      console.log(JSON.stringify(authData, null, 2));
      process.exit(1);
    }

    const { token, user } = authData.data;
    console.log(`${colors.green}✅ Authentication successful!${colors.reset}`);
    console.log('');

    // Save token to file
    fs.writeFileSync('.jwt-token', token);
    console.log('JWT Token saved to: .jwt-token');
    console.log('');

    // Display info
    console.log('========================================');
    console.log(`${colors.green}Authentication Complete!${colors.reset}`);
    console.log('');
    console.log(`Wallet Address: ${walletAddress}`);
    console.log(`Referral Code: ${user.referralCode}`);
    console.log(`JWT Token: ${token.substring(0, 50)}...`);
    console.log('');
    console.log('Token saved to .jwt-token file');
    console.log('');
    console.log('You can now use this token in your API requests:');
    console.log('');
    console.log('  # Bash');
    console.log('  export JWT_TOKEN=$(cat .jwt-token)');
    console.log(`  curl -H "Authorization: Bearer $JWT_TOKEN" ${BASE_URL}/api/xp/me`);
    console.log('');
    console.log('  # Node.js');
    console.log('  const token = fs.readFileSync(".jwt-token", "utf8");');
    console.log('  fetch("/api/xp/me", { headers: { Authorization: `Bearer ${token}` } });');
    console.log('');
    console.log('Or in Swagger UI:');
    console.log(`  1. Open ${BASE_URL}/api-docs`);
    console.log('  2. Click "Authorize" button');
    console.log(`  3. Enter: Bearer ${token}`);
    console.log('');

  } catch (error) {
    console.error(`${colors.yellow}Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

main();
