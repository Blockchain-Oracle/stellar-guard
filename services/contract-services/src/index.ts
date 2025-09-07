/**
 * StellarGuard Contract Services
 * Main export file for all contract interaction services
 */

// Import all services
import { WalletService, WalletInfo } from './services/WalletService';
import { OracleService, PriceData, TWAPData, OracleType } from './services/OracleService';
import { StopLossService, StopLossOrder, CreateOrderParams } from './services/StopLossService';
import { LiquidationService, Loan, CreateLoanParams, LoanHealth } from './services/LiquidationService';

// Re-export services
export { WalletService } from './services/WalletService';
export type { WalletInfo } from './services/WalletService';

export { OracleService } from './services/OracleService';
export type { 
  PriceData, 
  TWAPData, 
  OracleType 
} from './services/OracleService';

export { StopLossService } from './services/StopLossService';
export type { 
  StopLossOrder, 
  CreateOrderParams 
} from './services/StopLossService';

export { LiquidationService } from './services/LiquidationService';
export type { 
  Loan, 
  CreateLoanParams, 
  LoanHealth 
} from './services/LiquidationService';

// Export configuration
export { 
  CONTRACTS, 
  REFLECTOR_ORACLES,
  NETWORK,
  NETWORK_PASSPHRASE,
  RPC_URL,
  DECIMALS,
  REFLECTOR_DECIMALS,
  SUPPORTED_ASSETS
} from './config/contracts';

export type { 
  AssetSymbol,
  AssetType
} from './config/contracts';

// Export utility functions
export {
  server,
  toContractAmount,
  fromContractAmount,
  parseReflectorPrice,
  formatPrice,
  formatAmount,
  calculatePercentage,
  toBasisPoints,
  fromBasisPoints,
  buildTransaction,
  simulateTransaction,
  prepareAndSendTransaction,
  waitForTransaction,
  parseContractError,
  toScVal,
  fromScVal,
  addressToScVal,
  u64ToScVal,
  i128ToScVal,
  symbolToScVal,
  calculateHealthFactor,
  isLiquidatable,
  calculateLiquidationBonus,
  calculateRebalanceAmounts
} from './utils/stellar';

// Create convenience factory for all services
export class StellarGuardServices {
  public wallet: WalletService;
  public oracle: OracleService;
  public stopLoss: StopLossService;
  public liquidation: LiquidationService;

  constructor() {
    this.wallet = new WalletService();
    this.oracle = new OracleService();
    this.stopLoss = new StopLossService();
    this.liquidation = new LiquidationService();
  }

  /**
   * Initialize all services with wallet connection
   */
  async initialize(secretKey?: string): Promise<WalletInfo> {
    if (secretKey) {
      return await this.wallet.connectWithSecret(secretKey);
    } else {
      return await this.wallet.connectFreighter();
    }
  }

  /**
   * Disconnect all services
   */
  disconnect(): void {
    this.wallet.disconnect();
    this.oracle.clearCache();
  }

  /**
   * Get current account
   */
  async getAccount() {
    return await this.wallet.getAccount();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.wallet.isConnected();
  }
}

// Default export for convenience
export default StellarGuardServices;