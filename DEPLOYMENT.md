# Deployment Guide

This guide explains how to deploy the Nuvia Finance Backend to production and testing environments using GitHub Actions and Vercel.

## Branch Strategy

- **main** → Production environment (production database)
- **testing** → Testing environment (development/testing database)

## Environment Setup

### Testing Environment (testing branch)
- Uses existing `.env` configuration
- Same database as development (`MONGODB_URI` from `.env`)
- Deployed to Vercel preview URL

### Production Environment (main branch)
- Uses `.env.production` configuration (not committed to git)
- **Separate production database** (MongoDB Atlas recommended)
- Deployed to Vercel production URL

## Initial Setup

### 1. Set Up MongoDB Production Database

Create a separate MongoDB database for production:

**Option A: MongoDB Atlas (Recommended)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (M10+ recommended for production)
3. Create a database user with strong password
4. Whitelist Vercel IP addresses or use `0.0.0.0/0` (less secure)
5. Get your connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/nuvia-finance-production
   ```

**Option B: Self-hosted MongoDB**
1. Set up MongoDB on your server
2. Enable authentication
3. Configure firewall rules
4. Get connection string

### 2. Configure Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import your GitHub repository
3. Configure project settings:
   - Framework Preset: **Other**
   - Root Directory: `./`
   - Build Command: (leave empty)
   - Output Directory: (leave empty)

### 3. Set Up Vercel Environment Variables

#### Production Environment (main branch)

In Vercel Dashboard → Settings → Environment Variables, add these for **Production** environment:

```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn

# Production Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/nuvia-finance-production

# CORS - Set to your actual frontend domain
CORS_ORIGIN=https://yourdomain.com

# JWT - Generate secure secret
JWT_SECRET=<generate-with-command-below>
JWT_EXPIRY=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Web3 RPC
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ETH_RPC_URL=https://eth.llamarpc.com

# Testnet (if needed)
TESTNET_CHAIN_ID=84532
TESTNET_CONTRACTS={"faucet":"0x...","vault":"0x..."}

# Admin Wallets
ADMIN_WALLETS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# Quest & XP Config
DAILY_QUEST_RESET_HOUR=0
FAUCET_COOLDOWN_HOURS=24
DEFAULT_CONNECT_WALLET_XP=50
DEFAULT_REFERRAL_INVITER_XP=500
DEFAULT_REFERRAL_INVITEE_XP=100
```

**Generate secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Testing/Preview Environment (testing branch)

Add these for **Preview** environment (same as development):

```bash
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Testing Database (same as development)
MONGODB_URI=mongodb://localhost:27017/nuvia-finance
# OR use MongoDB Atlas testing cluster
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/nuvia-finance-testing

# CORS for testing
CORS_ORIGIN=http://localhost:5173

# Other variables same as .env.example
```

### 4. Set Up GitHub Secrets

In GitHub repository → Settings → Secrets and variables → Actions, add:

1. **VERCEL_TOKEN**
   - Get from Vercel → Settings → Tokens
   - Create new token with appropriate scope

2. **VERCEL_ORG_ID**
   - Run: `vercel --version` (install CLI if needed)
   - Run: `vercel link` in project directory
   - Find in `.vercel/project.json` → `orgId`

3. **VERCEL_PROJECT_ID**
   - Find in `.vercel/project.json` → `projectId`
   - Or get from Vercel Dashboard → Project Settings

**To get Vercel IDs:**
```bash
# Install Vercel CLI
npm install -g vercel

# Link project
vercel link

# View project.json
cat .vercel/project.json
```

## Seeding Production Database

After deploying to production for the first time, seed the database:

### Option 1: Using Vercel CLI

```bash
# Install dependencies
npm install

# Set production environment variables locally
export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/nuvia-finance-production"
export NODE_ENV=production
# ... other production env vars

# Run seed script
npm run seed
```

### Option 2: Using Vercel Function

You can also create a one-time API endpoint to seed:

```bash
# Call the seed endpoint (create this endpoint first)
curl -X POST https://your-production-url.vercel.app/api/admin/seed \
  -H "Authorization: Bearer <admin-token>"
```

**Important:** Remove or protect the seed endpoint after initial setup!

## Deployment Workflow

### Automatic Deployment

The GitHub Actions workflow automatically deploys when you push to either branch:

**Deploy to Production:**
```bash
git checkout main
git add .
git commit -m "Update production"
git push origin main
# → Deploys to Vercel production
```

**Deploy to Testing:**
```bash
git checkout testing
git add .
git commit -m "Update testing"
git push origin testing
# → Deploys to Vercel preview
```

### Manual Deployment

If needed, you can deploy manually:

**Production:**
```bash
vercel --prod
```

**Testing/Preview:**
```bash
vercel
```

## Workflow File

The workflow (`.github/workflows/deploy.yml`) handles:

1. ✅ Checkout code
2. ✅ Install dependencies
3. ✅ Install Vercel CLI
4. ✅ Pull Vercel environment configuration
5. ✅ Build project
6. ✅ Deploy to appropriate environment

## Monitoring Deployments

### GitHub Actions
- View deployment status: Repository → Actions tab
- Check logs for each deployment
- Monitor for failures

### Vercel Dashboard
- View deployments: Project → Deployments
- Check build logs
- Monitor function logs
- View analytics

## Environment URLs

After deployment, you'll have:

- **Production:** `https://your-project.vercel.app`
- **Testing:** `https://your-project-<hash>.vercel.app`

Configure these URLs in your frontend application.

## Troubleshooting

### Deployment Fails

**Check GitHub Actions logs:**
1. Go to repository → Actions
2. Click on failed workflow
3. View step logs

**Common issues:**
- Missing GitHub secrets (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
- Missing environment variables in Vercel
- Build errors (check dependencies)

### Database Connection Issues

**Production environment:**
- Verify MongoDB URI is correct
- Check IP whitelist in MongoDB Atlas
- Ensure credentials are correct
- Test connection locally with production URI

**Testing environment:**
- Use MongoDB Atlas for testing (not localhost)
- Vercel functions can't connect to localhost

### Environment Variables Not Loading

1. Check Vercel Dashboard → Settings → Environment Variables
2. Ensure variables are set for correct environment (Production/Preview)
3. Redeploy after adding variables
4. Check logs for missing variables

## Best Practices

1. **Never commit secrets** - Use .gitignore for .env files
2. **Test in testing branch first** - Always test changes before merging to main
3. **Monitor production** - Set up alerts for errors (Sentry, LogRocket, etc.)
4. **Backup database regularly** - MongoDB Atlas has automatic backups
5. **Use strong JWT secrets** - Generate with crypto.randomBytes(64)
6. **Rotate secrets periodically** - Update JWT_SECRET every 3-6 months
7. **Enable Vercel password protection** - For testing deployments if needed

## Rolling Back

If production deployment has issues:

**Option 1: Redeploy previous version (Vercel Dashboard)**
1. Go to Deployments
2. Find previous working deployment
3. Click "Promote to Production"

**Option 2: Git revert**
```bash
git checkout main
git revert HEAD
git push origin main
# → Triggers new deployment with reverted code
```

## Adding New Features

1. Create feature branch from testing
2. Develop and test locally
3. Merge to testing branch
4. Test in testing environment
5. If good, merge to main for production deployment

```bash
# Create feature branch
git checkout testing
git checkout -b feature/new-feature

# Develop...
git add .
git commit -m "Add new feature"

# Merge to testing
git checkout testing
git merge feature/new-feature
git push origin testing
# → Test in preview environment

# If good, merge to main
git checkout main
git merge testing
git push origin main
# → Deploy to production
```

## Security Checklist

- [ ] Production database has authentication enabled
- [ ] Strong JWT_SECRET generated
- [ ] CORS_ORIGIN set to specific domain (not *)
- [ ] Admin wallets verified
- [ ] Environment variables not exposed in code
- [ ] Rate limiting configured appropriately
- [ ] MongoDB IP whitelist configured
- [ ] Vercel environment variables secured
- [ ] GitHub secrets properly set

## Support

For deployment issues:
- Check GitHub Actions logs
- Check Vercel deployment logs
- Review environment variables
- Test database connectivity

---

**Built for Nuvia Finance** 🚀
