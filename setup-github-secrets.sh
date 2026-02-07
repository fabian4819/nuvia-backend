#!/bin/bash

# Script to help set up GitHub secrets for Vercel deployment
# Run this script to get the values needed for GitHub secrets

echo "🔧 Nuvia Backend - GitHub Secrets Setup Helper"
echo "================================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "📝 Linking Vercel project..."
echo "   (Login to Vercel when prompted)"
echo ""

vercel link

if [ -f .vercel/project.json ]; then
    echo ""
    echo "✅ Project linked successfully!"
    echo ""
    echo "================================================"
    echo "📋 GitHub Secrets to Add"
    echo "================================================"
    echo ""

    ORG_ID=$(cat .vercel/project.json | grep -o '"orgId": "[^"]*' | cut -d'"' -f4)
    PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId": "[^"]*' | cut -d'"' -f4)

    echo "1. VERCEL_ORG_ID"
    echo "   Value: $ORG_ID"
    echo ""

    echo "2. VERCEL_PROJECT_ID"
    echo "   Value: $PROJECT_ID"
    echo ""

    echo "3. VERCEL_TOKEN"
    echo "   Get from: https://vercel.com/account/tokens"
    echo "   Create a new token and paste it in GitHub secrets"
    echo ""

    echo "================================================"
    echo "📍 Where to add these secrets:"
    echo "================================================"
    echo ""
    echo "1. Go to: https://github.com/Nuvia-Labs/nuvia-backend/settings/secrets/actions"
    echo "2. Click 'New repository secret'"
    echo "3. Add each secret with the name and value above"
    echo ""
    echo "✅ After adding secrets, push to main or testing branch to trigger deployment!"
    echo ""
else
    echo "❌ Failed to link project. Please try manually:"
    echo "   1. Run: vercel link"
    echo "   2. Follow the prompts"
    echo "   3. Run this script again"
fi
