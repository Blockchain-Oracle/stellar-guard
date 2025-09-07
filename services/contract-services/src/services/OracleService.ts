/**
 * Oracle Router & Reflector Service
 * Handles price feeds from Reflector oracles and oracle routing
 */

import {
  Contract,
  Account,
  xdr,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import {
  server,
  buildTransaction,
  simulateTransaction,
  fromScVal,
  parseContractError,
  parseReflectorPrice,
  symbolToScVal,
} from '../utils/stellar';
import { 
  CONTRACTS, 
  REFLECTOR_ORACLES, 
  NETWORK,
  SUPPORTED_ASSETS,
  AssetSymbol,
  AssetType,
} from '../config/contracts';

export type OracleType = 'External' | 'Stellar' | 'Forex';

export interface PriceData {
  asset: string;
  price: number;
  timestamp: number;
  source: OracleType;
}

export interface TWAPData {
  asset: string;
  twapPrice: number;
  spotPrice: number;
  periods: number;
  timestamp: number;
}

export class OracleService {
  private oracleRouter: Contract;
  private reflectorOracles: any;
  private priceCache: Map<string, { price: number; timestamp: number }>;
  private cacheTimeout: number = 30000; // 30 seconds

  constructor() {
    this.oracleRouter = new Contract(CONTRACTS.ORACLE_ROUTER);
    this.reflectorOracles = NETWORK === 'mainnet' 
      ? REFLECTOR_ORACLES.mainnet 
      : REFLECTOR_ORACLES.testnet;
    this.priceCache = new Map();
  }

  /**
   * Get the correct oracle address for an asset type
   */
  async getOracleForAsset(
    assetType: AssetType,
    sourceAccount: Account
  ): Promise<string> {
    try {
      // Map asset type to contract enum
      const typeMapping: Record<AssetType, string> = {
        'crypto': 'Crypto',
        'stablecoin': 'Crypto', // Stablecoins use External oracle
        'stellar': 'Stellar',
        'forex': 'Forex',
      };

      const tx = await buildTransaction(
        sourceAccount,
        this.oracleRouter,
        'get_oracle_for_asset',
        [symbolToScVal(typeMapping[assetType])]
      );

      const simulation = await simulateTransaction(tx);
      
      if (simulation.error) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      if (simulation.result) {
        return fromScVal(simulation.result.retval);
      }
      
      // Fallback to hardcoded addresses
      return this.getOracleAddressByType(assetType);
    } catch (error) {
      console.error('Failed to get oracle from router:', error);
      // Fallback to hardcoded addresses
      return this.getOracleAddressByType(assetType);
    }
  }

  /**
   * Get oracle address by type (fallback)
   */
  private getOracleAddressByType(assetType: AssetType): string {
    switch (assetType) {
      case 'crypto':
      case 'stablecoin':
        return this.reflectorOracles.EXTERNAL;
      case 'stellar':
        return this.reflectorOracles.STELLAR;
      case 'forex':
        return this.reflectorOracles.FOREX;
      default:
        return this.reflectorOracles.EXTERNAL;
    }
  }

  /**
   * Get spot price from Reflector oracle
   */
  async getSpotPrice(
    assetSymbol: AssetSymbol,
    sourceAccount: Account
  ): Promise<PriceData> {
    try {
      // Check cache first
      const cached = this.priceCache.get(assetSymbol);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return {
          asset: assetSymbol,
          price: cached.price,
          timestamp: cached.timestamp,
          source: this.getOracleTypeForAsset(assetSymbol),
        };
      }

      const asset = SUPPORTED_ASSETS[assetSymbol];
      if (!asset) {
        throw new Error(`Unsupported asset: ${assetSymbol}`);
      }

      const oracleAddress = await this.getOracleForAsset(asset.type, sourceAccount);
      const oracleContract = new Contract(oracleAddress);

      // Build the lastprice() call
      const tx = new TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: NETWORK === 'mainnet' 
          ? 'Public Global Stellar Network ; September 2015'
          : 'Test SDF Network ; September 2015',
      })
        .addOperation(
          oracleContract.call(
            'lastprice',
            xdr.ScVal.scvMap([
              new xdr.ScMapEntry({
                key: xdr.ScVal.scvSymbol('Other'),
                val: xdr.ScVal.scvSymbol(assetSymbol),
              }),
            ])
          )
        )
        .setTimeout(30)
        .build();

      const simulation = await server.simulateTransaction(tx);
      
      if ('error' in simulation) {
        throw new Error(`Price fetch failed: ${simulation.error}`);
      }

      if (simulation.result && simulation.result.retval) {
        const priceRaw = fromScVal(simulation.result.retval);
        const price = parseReflectorPrice(priceRaw);
        
        // Update cache
        this.priceCache.set(assetSymbol, {
          price,
          timestamp: Date.now(),
        });

        return {
          asset: assetSymbol,
          price,
          timestamp: Date.now(),
          source: this.getOracleTypeForAsset(assetSymbol),
        };
      }
      
      throw new Error('No price data returned');
    } catch (error) {
      throw new Error(`Failed to get spot price for ${assetSymbol}: ${parseContractError(error)}`);
    }
  }

  /**
   * Get TWAP price from Reflector oracle
   */
  async getTWAPPrice(
    assetSymbol: AssetSymbol,
    periods: number,
    sourceAccount: Account
  ): Promise<TWAPData> {
    try {
      const asset = SUPPORTED_ASSETS[assetSymbol];
      if (!asset) {
        throw new Error(`Unsupported asset: ${assetSymbol}`);
      }

      const oracleAddress = await this.getOracleForAsset(asset.type, sourceAccount);
      const oracleContract = new Contract(oracleAddress);

      // Build the twap() call
      const tx = new TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: NETWORK === 'mainnet' 
          ? 'Public Global Stellar Network ; September 2015'
          : 'Test SDF Network ; September 2015',
      })
        .addOperation(
          oracleContract.call(
            'twap',
            xdr.ScVal.scvMap([
              new xdr.ScMapEntry({
                key: xdr.ScVal.scvSymbol('Other'),
                val: xdr.ScVal.scvSymbol(assetSymbol),
              }),
            ]),
            xdr.ScVal.scvU32(periods)
          )
        )
        .setTimeout(30)
        .build();

      const simulation = await server.simulateTransaction(tx);
      
      if ('error' in simulation) {
        throw new Error(`TWAP fetch failed: ${simulation.error}`);
      }

      if (simulation.result && simulation.result.retval) {
        const twapRaw = fromScVal(simulation.result.retval);
        const twapPrice = parseReflectorPrice(twapRaw);
        
        // Also get spot price for comparison
        const spotData = await this.getSpotPrice(assetSymbol, sourceAccount);

        return {
          asset: assetSymbol,
          twapPrice,
          spotPrice: spotData.price,
          periods,
          timestamp: Date.now(),
        };
      }
      
      throw new Error('No TWAP data returned');
    } catch (error) {
      throw new Error(`Failed to get TWAP for ${assetSymbol}: ${parseContractError(error)}`);
    }
  }

  /**
   * Get cross price between two assets
   */
  async getCrossPrice(
    baseAsset: AssetSymbol,
    quoteAsset: AssetSymbol,
    sourceAccount: Account
  ): Promise<number> {
    try {
      const oracleAddress = this.reflectorOracles.EXTERNAL;
      const oracleContract = new Contract(oracleAddress);

      // Build the x_last_price() call
      const tx = new TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: NETWORK === 'mainnet' 
          ? 'Public Global Stellar Network ; September 2015'
          : 'Test SDF Network ; September 2015',
      })
        .addOperation(
          oracleContract.call(
            'x_last_price',
            xdr.ScVal.scvMap([
              new xdr.ScMapEntry({
                key: xdr.ScVal.scvSymbol('Other'),
                val: xdr.ScVal.scvSymbol(baseAsset),
              }),
            ]),
            xdr.ScVal.scvMap([
              new xdr.ScMapEntry({
                key: xdr.ScVal.scvSymbol('Other'),
                val: xdr.ScVal.scvSymbol(quoteAsset),
              }),
            ])
          )
        )
        .setTimeout(30)
        .build();

      const simulation = await server.simulateTransaction(tx);
      
      if ('error' in simulation) {
        throw new Error(`Cross price fetch failed: ${simulation.error}`);
      }

      if (simulation.result && simulation.result.retval) {
        const priceRaw = fromScVal(simulation.result.retval);
        return parseReflectorPrice(priceRaw);
      }
      
      throw new Error('No cross price data returned');
    } catch (error) {
      throw new Error(`Failed to get cross price ${baseAsset}/${quoteAsset}: ${parseContractError(error)}`);
    }
  }

  /**
   * Get multiple prices in batch
   */
  async getBatchPrices(
    assets: AssetSymbol[],
    sourceAccount: Account
  ): Promise<Map<string, PriceData>> {
    const prices = new Map<string, PriceData>();
    
    // Process in parallel for better performance
    const promises = assets.map(async (asset) => {
      try {
        const priceData = await this.getSpotPrice(asset, sourceAccount);
        prices.set(asset, priceData);
      } catch (error) {
        console.error(`Failed to get price for ${asset}:`, error);
      }
    });
    
    await Promise.all(promises);
    return prices;
  }

  /**
   * Check stablecoin peg deviation
   */
  async checkStablecoinPeg(
    stablecoin: AssetSymbol,
    sourceAccount: Account
  ): Promise<{ deviation: number; isStable: boolean }> {
    try {
      // Get stablecoin price
      const stablePrice = await this.getSpotPrice(stablecoin, sourceAccount);
      
      // Get USD forex rate (should be ~1.0)
      const usdPrice = await this.getSpotPrice('USD' as AssetSymbol, sourceAccount);
      
      const deviation = ((stablePrice.price - usdPrice.price) / usdPrice.price) * 10000; // basis points
      const isStable = Math.abs(deviation) < 100; // Consider stable if < 1%
      
      return { deviation, isStable };
    } catch (error) {
      throw new Error(`Failed to check peg for ${stablecoin}: ${parseContractError(error)}`);
    }
  }

  /**
   * Monitor price volatility
   */
  async calculateVolatility(
    asset: AssetSymbol,
    samples: number,
    intervalMs: number,
    sourceAccount: Account
  ): Promise<number> {
    const prices: number[] = [];
    
    for (let i = 0; i < samples; i++) {
      const priceData = await this.getSpotPrice(asset, sourceAccount);
      prices.push(priceData.price);
      
      if (i < samples - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    
    // Calculate standard deviation
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const squaredDiffs = prices.map(price => Math.pow(price - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    // Return volatility as percentage
    return (stdDev / mean) * 100;
  }

  /**
   * Get oracle type for asset
   */
  private getOracleTypeForAsset(assetSymbol: AssetSymbol): OracleType {
    const asset = SUPPORTED_ASSETS[assetSymbol];
    if (!asset) return 'External';
    
    switch (asset.type) {
      case 'stellar':
        return 'Stellar';
      case 'forex':
        return 'Forex';
      default:
        return 'External';
    }
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    this.priceCache.clear();
  }

  /**
   * Set cache timeout
   */
  setCacheTimeout(timeoutMs: number): void {
    this.cacheTimeout = timeoutMs;
  }
}