const Event = require('../models/Event');
const XPLedger = require('../models/XPLedger');
const XPRule = require('../models/XPRule');
const User = require('../models/User');
const QuestProgress = require('../models/QuestProgress');
const web3Service = require('./web3.service');
const logger = require('../utils/logger');

class XPService {
  // Process event and award XP
  async processEvent(userId, eventType, metadata = {}, dedupKey = null) {
    try {
      // Create event with dedup key
      const event = await Event.createEvent(userId, eventType, metadata, dedupKey);
      
      logger.info('Event created', {
        eventId: event._id,
        userId,
        eventType,
        dedupKey
      });
      
      // Get XP rule for this event type
      const rule = await XPRule.getRuleByAction(eventType);
      
      if (!rule) {
        logger.warn('No XP rule found for event type', { eventType });
        await event.markProcessed();
        return {
          success: true,
          event,
          xpAwarded: 0,
          message: 'Event recorded but no XP rule configured'
        };
      }
      
      // Validate event against rule
      const validation = await XPRule.validateEvent(eventType, metadata);
      
      if (!validation.valid) {
        await event.markFailed(validation.reason);
        return {
          success: false,
          event,
          xpAwarded: 0,
          message: validation.reason
        };
      }
      
      // Check cooldown
      const cooldownCheck = await rule.canUserEarnXP(userId);
      if (!cooldownCheck.canEarn) {
        await event.markFailed(cooldownCheck.reason);
        return {
          success: false,
          event,
          xpAwarded: 0,
          message: cooldownCheck.reason,
          nextAvailableAt: cooldownCheck.nextAvailableAt
        };
      }
      
      // Check daily limit
      const limitCheck = await rule.checkDailyLimit(userId);
      if (!limitCheck.withinLimit) {
        await event.markFailed(limitCheck.reason);
        return {
          success: false,
          event,
          xpAwarded: 0,
          message: limitCheck.reason
        };
      }
      
      // Verify onchain event if applicable
      if (metadata.txHash && metadata.chainId) {
        const verification = await this.verifyOnchainEvent(metadata);
        
        if (!verification.verified) {
          await event.markFailed(verification.reason);
          return {
            success: false,
            event,
            xpAwarded: 0,
            message: `Onchain verification failed: ${verification.reason}`
          };
        }
        
        await event.markVerified();
      }
      
      // Award XP
      const xpAmount = rule.xpAmount;
      await XPLedger.addXP(
        userId,
        xpAmount,
        eventType,
        `XP from ${eventType}`,
        { eventId: event._id },
        event._id
      );
      
      await event.markProcessed();
      
      // Update quest progress if applicable
      await this.updateQuestProgress(userId, eventType, event._id);
      
      logger.info('XP awarded', {
        userId,
        eventType,
        xpAmount,
        eventId: event._id
      });
      
      return {
        success: true,
        event,
        xpAwarded: xpAmount,
        message: `Successfully earned ${xpAmount} XP`
      };
    } catch (error) {
      if (error.message.includes('duplicate')) {
        logger.warn('Duplicate event detected', { userId, eventType, dedupKey });
        return {
          success: false,
          xpAwarded: 0,
          message: 'Event already processed (duplicate)'
        };
      }
      
      logger.error('Process event error', {
        error: error.message,
        stack: error.stack,
        userId,
        eventType
      });
      
      throw error;
    }
  }
  
  // Verify onchain event
  async verifyOnchainEvent(metadata) {
    try {
      const { txHash, chainId, contractAddress, tokenSymbol } = metadata;
      const contractRegistry = require('../utils/contractRegistry');
      
      // Get expected contract address from registry if not provided
      let expectedContract = contractAddress;
      
      if (!expectedContract && tokenSymbol) {
        // Auto-detect expected contract based on event type
        const eventType = metadata.eventType || 'deposit'; // Default to deposit
        expectedContract = contractRegistry.getExpectedContract(eventType, metadata);
        
        logger.info('Auto-detected expected contract', {
          eventType,
          tokenSymbol,
          expectedContract
        });
      }
      
      const verification = await web3Service.verifyTransaction(
        txHash,
        chainId,
        expectedContract
      );
      
      // Additional check: verify contract is a Nuvia contract
      if (verification.verified && verification.receipt?.to) {
        const isNuviaContract = contractRegistry.isNuviaContract(verification.receipt.to);
        const contractType = contractRegistry.getContractType(verification.receipt.to);
        
        if (!isNuviaContract) {
          logger.warn('Transaction not sent to Nuvia contract', {
            txHash,
            contractAddress: verification.receipt.to
          });
          
          return {
            verified: false,
            reason: 'Transaction not sent to a valid Nuvia contract'
          };
        }
        
        logger.info('Nuvia contract verified', {
          txHash,
          contractType,
          contractAddress: verification.receipt.to
        });
      }
      
      return verification;
    } catch (error) {
      logger.error('Onchain verification error', {
        error: error.message,
        metadata
      });
      
      return {
        verified: false,
        reason: error.message
      };
    }
  }
  
  // Update quest progress based on event
  async updateQuestProgress(userId, eventType, eventId) {
    try {
      const Quest = require('../models/Quest');
      
      // Get active quests that match this event type
      const activeQuests = await Quest.find({
        isActive: true,
        'rules.type': 'event_count',
        'rules.eventType': eventType
      });
      
      for (const quest of activeQuests) {
        // Get or create progress for current period
        const now = new Date();
        let periodStart, periodEnd;
        
        if (quest.cadence === 'daily') {
          periodStart = new Date(now.setHours(0, 0, 0, 0));
          periodEnd = new Date(now.setHours(23, 59, 59, 999));
        } else if (quest.cadence === 'weekly') {
          const dayOfWeek = now.getDay();
          periodStart = new Date(now.setDate(now.getDate() - dayOfWeek));
          periodStart.setHours(0, 0, 0, 0);
          periodEnd = new Date(periodStart);
          periodEnd.setDate(periodEnd.getDate() + 6);
          periodEnd.setHours(23, 59, 59, 999);
        }
        
        const progress = await QuestProgress.getOrCreate(
          userId,
          quest._id,
          periodStart,
          periodEnd
        );
        
        await progress.updateProgress(1, eventId);
        
        logger.info('Quest progress updated', {
          userId,
          questId: quest._id,
          eventType,
          progressValue: progress.progressValue
        });
      }
    } catch (error) {
      logger.error('Update quest progress error', {
        error: error.message,
        userId,
        eventType
      });
      // Don't throw, quest progress update failure shouldn't block XP award
    }
  }
  
  // Get user XP summary
  async getUserXPSummary(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const ledgerSummary = await XPLedger.getXPSummary(userId);
      const recentLedger = await XPLedger.getUserLedger(userId, { limit: 10 });
      
      return {
        totalXP: user.totalXP,
        breakdown: ledgerSummary,
        recentActivity: recentLedger
      };
    } catch (error) {
      logger.error('Get user XP summary error', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
  
  // Get active XP rules
  async getActiveRules() {
    try {
      return await XPRule.getActiveRules();
    } catch (error) {
      logger.error('Get active rules error', { error: error.message });
      throw error;
    }
  }
  
  // Seed default XP rules
  async seedDefaultRules() {
    try {
      const defaultRules = [
        {
          actionType: 'connect_wallet',
          xpAmount: parseInt(process.env.DEFAULT_CONNECT_WALLET_XP) || 50,
          dailyLimit: parseInt(process.env.CONNECT_WALLET_DAILY_LIMIT) || 1,
          cooldownMinutes: parseInt(process.env.CONNECT_WALLET_COOLDOWN_MINUTES) || 1440, // Default 24 hours
          description: 'Connect wallet for the first time each day',
          metadata: {
            displayName: 'Connect Wallet',
            category: 'onboarding'
          }
        },
        {
          actionType: 'deposit',
          xpAmount: 100,
          minAmount: '10',
          validChains: [84532], // Base Sepolia only
          description: 'Deposit funds into protocol',
          metadata: {
            displayName: 'Deposit',
            category: 'defi'
          }
        },
        {
          actionType: 'supply',
          xpAmount: 150,
          minAmount: '10',
          validChains: [84532], // Base Sepolia only
          description: 'Supply assets to lending protocol',
          metadata: {
            displayName: 'Supply Assets',
            category: 'defi'
          }
        },
        {
          actionType: 'claim_faucet',
          xpAmount: 25,
          dailyLimit: 1,
          cooldownMinutes: parseInt(process.env.FAUCET_COOLDOWN_HOURS) * 60 || 1440,
          description: 'Claim testnet faucet',
          metadata: {
            displayName: 'Claim Faucet',
            category: 'testnet'
          }
        },
        {
          actionType: 'select_strategy',
          xpAmount: 30,
          dailyLimit: 1,
          description: 'Select investment strategy',
          metadata: {
            displayName: 'Select Strategy',
            category: 'platform'
          }
        }
      ];
      
      for (const ruleData of defaultRules) {
        const existing = await XPRule.findOne({ actionType: ruleData.actionType });
        if (!existing) {
          await XPRule.create(ruleData);
          logger.info('Default XP rule created', { actionType: ruleData.actionType });
        }
      }
      
      return { success: true, message: 'Default XP rules seeded' };
    } catch (error) {
      logger.error('Seed default rules error', { error: error.message });
      throw error;
    }
  }
}

module.exports = new XPService();
