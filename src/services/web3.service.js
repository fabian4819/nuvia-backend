const { ethers } = require('ethers');
const logger = require('../utils/logger');

class Web3Service {
  constructor() {
    this.providers = {};
    this.initializeProviders();
  }
  
  // Initialize providers for different chains
  initializeProviders() {
    try {
      // Base Sepolia Testnet only
      const rpcUrls = {
        84532: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org', // Base Sepolia
      };
      
      for (const [chainId, rpcUrl] of Object.entries(rpcUrls)) {
        if (rpcUrl) {
          this.providers[chainId] = new ethers.JsonRpcProvider(rpcUrl);
        }
      }
      
      logger.info('Web3 providers initialized', { chains: Object.keys(this.providers) });
    } catch (error) {
      logger.error('Failed to initialize Web3 providers', { error: error.message });
    }
  }
  
  // Get provider for a specific chain
  getProvider(chainId) {
    const provider = this.providers[chainId];
    if (!provider) {
      throw new Error(`No provider configured for chain ID: ${chainId}`);
    }
    return provider;
  }
  
  // Verify wallet signature
  async verifySignature(message, signature, expectedAddress) {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      // Compare addresses (case-insensitive)
      const isValid = recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
      
      logger.info('Signature verification', {
        expectedAddress,
        recoveredAddress,
        isValid
      });
      
      return {
        isValid,
        recoveredAddress
      };
    } catch (error) {
      logger.error('Signature verification failed', {
        error: error.message,
        expectedAddress
      });
      
      return {
        isValid: false,
        error: error.message
      };
    }
  }
  
  // Verify transaction on blockchain
  async verifyTransaction(txHash, chainId, expectedContract = null) {
    try {
      const provider = this.getProvider(chainId);
      
      // Get transaction receipt
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return {
          verified: false,
          reason: 'Transaction not found or not confirmed'
        };
      }
      
      // Check if transaction was successful
      if (receipt.status !== 1) {
        return {
          verified: false,
          reason: 'Transaction failed'
        };
      }
      
      // Verify contract address if provided
      if (expectedContract) {
        const normalizedExpected = expectedContract.toLowerCase();
        const normalizedActual = receipt.to?.toLowerCase();
        
        if (normalizedActual !== normalizedExpected) {
          return {
            verified: false,
            reason: 'Transaction not sent to expected contract',
            expected: normalizedExpected,
            actual: normalizedActual
          };
        }
      }
      
      logger.info('Transaction verified', {
        txHash,
        chainId,
        blockNumber: receipt.blockNumber,
        from: receipt.from,
        to: receipt.to
      });
      
      return {
        verified: true,
        receipt: {
          blockNumber: receipt.blockNumber,
          from: receipt.from,
          to: receipt.to,
          gasUsed: receipt.gasUsed.toString(),
          logs: receipt.logs.length
        }
      };
    } catch (error) {
      logger.error('Transaction verification failed', {
        error: error.message,
        txHash,
        chainId
      });
      
      return {
        verified: false,
        reason: error.message
      };
    }
  }
  
  // Parse transaction logs for specific events
  async parseTransactionLogs(txHash, chainId, contractABI, eventName) {
    try {
      const provider = this.getProvider(chainId);
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        throw new Error('Transaction not found');
      }
      
      const iface = new ethers.Interface(contractABI);
      const parsedLogs = [];
      
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed && parsed.name === eventName) {
            parsedLogs.push({
              name: parsed.name,
              args: parsed.args,
              signature: parsed.signature
            });
          }
        } catch (e) {
          // Skip logs that don't match the ABI
          continue;
        }
      }
      
      return parsedLogs;
    } catch (error) {
      logger.error('Failed to parse transaction logs', {
        error: error.message,
        txHash,
        chainId,
        eventName
      });
      throw error;
    }
  }
  
  // Validate Ethereum address
  isValidAddress(address) {
    return ethers.isAddress(address);
  }
  
  // Normalize address to checksum format
  normalizeAddress(address) {
    try {
      return ethers.getAddress(address);
    } catch (error) {
      throw new Error('Invalid Ethereum address');
    }
  }
}

// Export singleton instance
module.exports = new Web3Service();
