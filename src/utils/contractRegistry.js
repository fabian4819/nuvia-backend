// Utility to parse and access Nuvia smart contract addresses
const logger = require('./logger');

class ContractRegistry {
  constructor() {
    this.contracts = {};
    this.tokens = {};
    this.initialize();
  }
  
  initialize() {
    try {
      // Parse contract addresses from env
      if (process.env.TESTNET_CONTRACTS) {
        this.contracts = JSON.parse(process.env.TESTNET_CONTRACTS);
      }
      
      // Parse token addresses from env
      if (process.env.TESTNET_TOKENS) {
        this.tokens = JSON.parse(process.env.TESTNET_TOKENS);
      }
      
      logger.info('Contract registry initialized', {
        contracts: Object.keys(this.contracts),
        tokens: Object.keys(this.tokens)
      });
    } catch (error) {
      logger.error('Failed to parse contract addresses', {
        error: error.message
      });
    }
  }
  
  // Get faucet contract address
  getFaucet() {
    return this.contracts.faucet;
  }
  
  // Get vault address by token
  getVault(token) {
    const key = `vault${token}`;
    return this.contracts[key];
  }
  
  // Get strategy address by token
  getStrategy(token) {
    const key = `strategy${token}`;
    return this.contracts[key];
  }
  
  // Get token address
  getToken(symbol) {
    return this.tokens[symbol];
  }
  
  // Get all vault addresses
  getAllVaults() {
    return {
      USDC: this.contracts.vaultUSDC,
      cbBTC: this.contracts.vaultCbBTC,
      cbETH: this.contracts.vaultCbETH
    };
  }
  
  // Get all strategy addresses
  getAllStrategies() {
    return {
      USDC: this.contracts.strategyUSDC,
      cbBTC: this.contracts.strategyCbBTC,
      cbETH: this.contracts.strategyCbETH
    };
  }
  
  // Check if address is a valid Nuvia contract
  isNuviaContract(address) {
    if (!address) return false;
    
    const normalizedAddress = address.toLowerCase();
    const allContracts = Object.values(this.contracts).map(addr => addr?.toLowerCase());
    
    return allContracts.includes(normalizedAddress);
  }
  
  // Get contract type by address
  getContractType(address) {
    if (!address) return null;
    
    const normalizedAddress = address.toLowerCase();
    
    for (const [key, contractAddress] of Object.entries(this.contracts)) {
      if (contractAddress?.toLowerCase() === normalizedAddress) {
        if (key === 'faucet') return 'faucet';
        if (key.startsWith('vault')) return 'vault';
        if (key.startsWith('strategy')) return 'strategy';
      }
    }
    
    return null;
  }
  
  // Get expected contract for event type
  getExpectedContract(eventType, metadata = {}) {
    const { tokenSymbol } = metadata;
    
    switch (eventType) {
      case 'claim_faucet':
        return this.getFaucet();
      
      case 'deposit':
      case 'withdraw':
        if (tokenSymbol) {
          return this.getVault(tokenSymbol);
        }
        return null;
      
      case 'supply':
        if (tokenSymbol) {
          return this.getStrategy(tokenSymbol);
        }
        return null;
      
      default:
        return null;
    }
  }
}

module.exports = new ContractRegistry();
