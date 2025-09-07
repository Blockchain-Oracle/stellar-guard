/**
 * Contract Service
 * Provides high-level methods to interact with StellarGuard contracts
 */

import { 
  Contract, 
  SorobanRpc,
  xdr,
  nativeToScVal,
  scValToNative,
  Address as StellarAddress
} from '@stellar/stellar-sdk';
import { 
  CONTRACTS, 
  REFLECTOR_ORACLES, 
  DECIMALS, 
  REFLECTOR_DECIMALS,
  NETWORK
} from '../config/contracts';

export class ContractService {
  private server: SorobanRpc.Server;

  constructor(rpcUrl: string) {
    this.server = new SorobanRpc.Server(rpcUrl);
  }

  /**
   * Get current price from Reflector Oracle
   */
  async getAssetPrice(assetSymbol: string): Promise<number | null> {
    try {
      const oracle = REFLECTOR_ORACLES[NETWORK as 'testnet' | 'mainnet'].EXTERNAL;
      const contract = new Contract(oracle);
      
      const asset = xdr.ScVal.scvVec([
        xdr.ScVal.scvSymbol('Other'),
        xdr.ScVal.scvSymbol(assetSymbol)
      ]);

      const result = await this.simulateContract(
        contract,
        'lastprice',
        asset
      );

      if (result && result.price) {
        // Convert from Reflector's 14 decimals
        return Number(result.price) / Math.pow(10, REFLECTOR_DECIMALS);
      }
      return null;
    } catch (error) {
      console.error(`Error fetching price for ${assetSymbol}:`, error);
      return null;
    }
  }

  /**
   * Create a stop-loss order
   */
  async createStopLossOrder(params: {
    owner: string;
    asset: string;
    amount: number;
    stopPrice: number;
  }): Promise<number | null> {
    try {
      const contract = new Contract(CONTRACTS.STOP_LOSS);
      
      const orderParams = [
        nativeToScVal(StellarAddress.fromString(params.owner), { type: 'address' }),
        xdr.ScVal.scvSymbol(params.asset),
        nativeToScVal(Math.floor(params.amount * Math.pow(10, DECIMALS)), { type: 'i128' }),
        nativeToScVal(Math.floor(params.stopPrice * Math.pow(10, DECIMALS)), { type: 'i128' })
      ];

      const orderId = await this.simulateContract(
        contract,
        'create_stop_loss',
        ...orderParams
      );

      return orderId;
    } catch (error) {
      console.error('Error creating stop-loss order:', error);
      return null;
    }
  }

  /**
   * Check stop-loss trigger
   */
  async checkStopLossTrigger(orderId: number): Promise<boolean> {
    try {
      const contract = new Contract(CONTRACTS.STOP_LOSS);
      
      const result = await this.simulateContract(
        contract,
        'check_trigger',
        nativeToScVal(orderId, { type: 'u64' })
      );

      return result === true;
    } catch (error) {
      console.error(`Error checking stop-loss trigger for order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Create a loan position
   */
  async createLoan(params: {
    owner: string;
    collateralAsset: { type: 'Crypto' | 'Stellar'; value: string };
    collateralAmount: number;
    borrowedAsset: { type: 'Crypto' | 'Stellar'; value: string };
    borrowedAmount: number;
    liquidationThreshold: number; // in percentage (e.g., 150 for 150%)
  }): Promise<number | null> {
    try {
      const contract = new Contract(CONTRACTS.LIQUIDATION);
      
      const collateralAssetScVal = params.collateralAsset.type === 'Crypto'
        ? xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Crypto'), xdr.ScVal.scvSymbol(params.collateralAsset.value)])
        : xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Stellar'), nativeToScVal(StellarAddress.fromString(params.collateralAsset.value), { type: 'address' })]);

      const borrowedAssetScVal = params.borrowedAsset.type === 'Crypto'
        ? xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Crypto'), xdr.ScVal.scvSymbol(params.borrowedAsset.value)])
        : xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Stellar'), nativeToScVal(StellarAddress.fromString(params.borrowedAsset.value), { type: 'address' })]);

      const loanParams = [
        nativeToScVal(StellarAddress.fromString(params.owner), { type: 'address' }),
        collateralAssetScVal,
        nativeToScVal(Math.floor(params.collateralAmount * Math.pow(10, DECIMALS)), { type: 'i128' }),
        borrowedAssetScVal,
        nativeToScVal(Math.floor(params.borrowedAmount * Math.pow(10, DECIMALS)), { type: 'i128' }),
        nativeToScVal(params.liquidationThreshold * 100, { type: 'i128' }) // Convert to basis points
      ];

      const loanId = await this.simulateContract(
        contract,
        'create_loan',
        ...loanParams
      );

      return loanId;
    } catch (error) {
      console.error('Error creating loan:', error);
      return null;
    }
  }

  /**
   * Check if loan needs liquidation
   */
  async checkLiquidation(loanId: number): Promise<boolean> {
    try {
      const contract = new Contract(CONTRACTS.LIQUIDATION);
      
      const result = await this.simulateContract(
        contract,
        'check_liquidation',
        nativeToScVal(loanId, { type: 'u64' })
      );

      return result === true;
    } catch (error) {
      console.error(`Error checking liquidation for loan ${loanId}:`, error);
      return false;
    }
  }

  /**
   * Get loan health factor using TWAP
   */
  async getLoanHealthFactor(loanId: number, periods: number = 10): Promise<number | null> {
    try {
      const contract = new Contract(CONTRACTS.LIQUIDATION);
      
      const healthFactor = await this.simulateContract(
        contract,
        'get_health_factor_twap',
        nativeToScVal(loanId, { type: 'u64' }),
        nativeToScVal(periods, { type: 'u32' })
      );

      return healthFactor ? Number(healthFactor) / 10000 : null; // Convert from basis points
    } catch (error) {
      console.error(`Error getting health factor for loan ${loanId}:`, error);
      return null;
    }
  }

  /**
   * Check for arbitrage opportunities
   */
  async checkArbitrage(assetSymbol: string): Promise<number | null> {
    try {
      const contract = new Contract(CONTRACTS.ORACLE_ROUTER);
      
      const result = await this.simulateContract(
        contract,
        'check_arbitrage',
        xdr.ScVal.scvSymbol(assetSymbol)
      );

      return result ? Number(result) / 100 : null; // Convert from basis points to percentage
    } catch (error) {
      console.error(`Error checking arbitrage for ${assetSymbol}:`, error);
      return null;
    }
  }

  /**
   * Check stablecoin peg deviation
   */
  async checkStablecoinPeg(stablecoin: string): Promise<number | null> {
    try {
      const contract = new Contract(CONTRACTS.ORACLE_ROUTER);
      
      const result = await this.simulateContract(
        contract,
        'check_stablecoin_peg',
        xdr.ScVal.scvSymbol(stablecoin)
      );

      return result ? Number(result) / 100 : null; // Convert from basis points to percentage
    } catch (error) {
      console.error(`Error checking peg for ${stablecoin}:`, error);
      return null;
    }
  }

  /**
   * Helper to simulate contract calls
   */
  private async simulateContract(
    contract: Contract,
    method: string,
    ...params: xdr.ScVal[]
  ): Promise<any> {
    // This is a simplified version - in production you'd need:
    // 1. Get source account
    // 2. Build transaction
    // 3. Simulate transaction
    // 4. Parse results
    
    // For now, returning mock data for testing
    console.log(`Simulating ${method} on contract ${contract.contractId()} with params:`, params);
    
    // Mock responses for testing
    if (method === 'lastprice') {
      return { price: BigInt(1115790000000000000), timestamp: BigInt(Date.now() / 1000) };
    }
    if (method === 'create_stop_loss' || method === 'create_loan') {
      return 1;
    }
    if (method === 'check_trigger' || method === 'check_liquidation') {
      return false;
    }
    if (method === 'get_health_factor_twap') {
      return BigInt(15000); // 1.5 health factor
    }
    
    return null;
  }
}