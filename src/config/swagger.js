const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nuvia Finance API',
      version: '1.0.0',
      description: 'Backend API for Nuvia Finance gamification system with XP, leaderboard, referrals, and quests',
      contact: {
        name: 'Nuvia Finance',
        url: 'https://nuviafinance.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api-nuvia.vercel.app',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /api/auth/verify endpoint',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            walletAddress: {
              type: 'string',
              example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
            },
            referralCode: {
              type: 'string',
              example: 'NUV-ABC123',
            },
            totalXP: {
              type: 'number',
              example: 250,
            },
            isAdmin: {
              type: 'boolean',
              example: false,
            },
          },
        },
        XPRule: {
          type: 'object',
          properties: {
            actionType: {
              type: 'string',
              example: 'deposit',
            },
            xpAmount: {
              type: 'number',
              example: 100,
            },
            dailyLimit: {
              type: 'number',
              example: 1,
            },
            cooldownMinutes: {
              type: 'number',
              example: 1440,
            },
            description: {
              type: 'string',
              example: 'Deposit funds into protocol',
            },
          },
        },
      },
    },
  },
  // Ensure we find the files correctly in Vercel environment
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../controllers/*.js')
  ],
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi,
};
