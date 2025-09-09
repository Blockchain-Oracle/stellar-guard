// Oracle Service - SDK v14 Compatible Version
// This version removes all internal _value references and uses proper SDK v14 methods

import * as StellarSdk from '@stellar/stellar-sdk';

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';

// Reflector Oracle addresses for different asset types
const REFLECTOR_ORACLES = {
  testnet: {
    EXTERNAL: 'CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63', // CEX & DEX
    STELLAR: 'CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP',  // Stellar Pubnet
    FOREX: 'CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W',    // Foreign Exchange
  },
  mainnet: {
    EXTERNAL: 'CA2V4IXNCEKV6XQJR42FA25KXUMFQMBJLW3ZKRVU4FXCJUPUMDZMDM5S',
    STELLAR: 'CBMS4EXBYPTVGBH6CB5QM4I5OY4P2QQ6L7HGFPFBRLNV5P7524L4G66I',
    FOREX: 'CAHBESFLDZEUK5FMJOUSFRKPJJKXWKTLYF4HRLC7VGJJRMGD2X6V3EK5',
  }
};

// Map assets to their oracle types
const ASSET_ORACLE_MAP: { [key: string]: 'EXTERNAL' | 'STELLAR' | 'FOREX' } = {
  // Crypto assets (use External Oracle)
  'BTC': 'EXTERNAL',
  'ETH': 'EXTERNAL',
  'SOL': 'EXTERNAL',
  
  // Stablecoins (use External Oracle)
  'USDC': 'EXTERNAL',
  'USDT': 'EXTERNAL',
  
  // Stellar native (use Stellar Oracle)
  'XLM': 'STELLAR',
  
  // Forex (use Forex Oracle)
  'EUR': 'FOREX',
  'GBP': 'FOREX',
  'USD': 'FOREX',
};

// Get the appropriate oracle for an asset
function getOracleForAsset(asset: string): string {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
  const oracleType = ASSET_ORACLE_MAP[asset.toUpperCase()];
  
  if (!oracleType) {
    console.warn(`[getOracleForAsset] Unknown asset ${asset}, defaulting to EXTERNAL oracle`);
    return REFLECTOR_ORACLES[network].EXTERNAL;
  }
  
  return REFLECTOR_ORACLES[network][oracleType];
}

// Parse Reflector price response - SDK v14 compatible
function parseReflectorPrice(value: any): number | null {
  console.log('[parseReflectorPrice] Parsing value:', JSON.stringify(value, null, 2));
  
  try {
    // Use scValToNative - this is the proper SDK v14 method
    const nativeValue = StellarSdk.scValToNative(value);
    console.log('[parseReflectorPrice] Native value:', nativeValue);
    
    // If it's a map (like the result from lastprice), extract the price field
    if (typeof nativeValue === 'object' && nativeValue !== null && 'price' in nativeValue) {
      const price = Number(nativeValue.price) / Math.pow(10, 14);
      console.log('[parseReflectorPrice] Parsed price from native map:', price);
      return price;
    }
    
    // If it's a direct number (could be bigint)
    if (typeof nativeValue === 'bigint' || typeof nativeValue === 'number') {
      const price = Number(nativeValue) / Math.pow(10, 14);
      console.log('[parseReflectorPrice] Parsed price from native number:', price);
      return price;
    }
    
    // If it's an array (some responses may return arrays)
    if (Array.isArray(nativeValue) && nativeValue.length > 0) {
      const firstElement = nativeValue[0];
      if (typeof firstElement === 'bigint' || typeof firstElement === 'number') {
        const price = Number(firstElement) / Math.pow(10, 14);
        console.log('[parseReflectorPrice] Parsed price from array:', price);
        return price;
      }
    }
  } catch (e) {
    console.log('[parseReflectorPrice] scValToNative failed:', e);
  }
  
  // Fallback: Check for direct i128 values (some responses may have this structure)
  try {
    if (value.lo !== undefined && value.hi !== undefined) {
      console.log('[parseReflectorPrice] Found direct i128 structure');
      const lo = BigInt(value.lo);
      const hi = BigInt(value.hi);
      
      // Check if hi is negative (for signed i128)
      const isNegative = hi < 0n;
      let fullValue;
      
      if (isNegative) {
        // Handle negative values (two's complement)
        fullValue = -((~hi << BigInt(64)) | ~lo) - 1n;
      } else {
        fullValue = (hi << BigInt(64)) | lo;
      }
      
      const price = Number(fullValue) / Math.pow(10, 14);
      if (price > 0 && price < 1000000) { // Sanity check
        console.log('[parseReflectorPrice] Parsed from i128:', price);
        return price;
      }
    }
  } catch (e) {
    console.log('[parseReflectorPrice] i128 parsing failed:', e);
  }
  
  console.log('[parseReflectorPrice] Failed to parse price from value');
  return null;
}

// Oracle service class - SDK v14 compatible
export class OracleService {
  private server: StellarSdk.rpc.Server;

  constructor() {
    this.server = new StellarSdk.rpc.Server(RPC_URL);
  }

  // Get price from Reflector oracle
  async getAssetPrice(asset: string): Promise<number | null> {
    try {
      console.log(`[getAssetPrice] Fetching price for ${asset}`);
      
      const oracleAddress = getOracleForAsset(asset);
      console.log(`[getAssetPrice] Using oracle: ${oracleAddress}`);
      
      const contract = new StellarSdk.Contract(oracleAddress);
      const sourceAccount = new StellarSdk.Account(
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
        '0'
      );
      
      // Try different price functions
      const functionNames = ['lastprice', 'twap'];
      
      for (const funcName of functionNames) {
        try {
          console.log(`[getAssetPrice] Trying ${funcName} for ${asset}`);
          
          // Build transaction with proper asset parameter
          const assetParam = StellarSdk.xdr.ScVal.scvSymbol(asset.toUpperCase());
          
          const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: '100000',
            networkPassphrase: StellarSdk.Networks.TESTNET,
          })
            .addOperation(contract.call(funcName, assetParam))
            .setTimeout(30)
            .build();
          
          const simulated = await this.server.simulateTransaction(tx);
          
          if ('result' in simulated && simulated.result && simulated.result.retval) {
            const price = parseReflectorPrice(simulated.result.retval);
            if (price !== null) {
              console.log(`[getAssetPrice] Got price for ${asset} using ${funcName}: ${price}`);
              return price;
            }
          }
        } catch (error) {
          console.log(`[getAssetPrice] ${funcName} failed for ${asset}:`, error);
          continue;
        }
      }
      
      console.log(`[getAssetPrice] No price found for ${asset}`);
      return null;
      
    } catch (error) {
      console.error(`[getAssetPrice] Error fetching price for ${asset}:`, error);
      return null;
    }
  }

  // Get multiple asset prices
  async getAssetPrices(assets: string[]): Promise<{ [key: string]: number | null }> {
    const prices: { [key: string]: number | null } = {};
    
    // Fetch prices in parallel for better performance
    const pricePromises = assets.map(async (asset) => {
      const price = await this.getAssetPrice(asset);
      return { asset, price };
    });
    
    const results = await Promise.all(pricePromises);
    results.forEach(({ asset, price }) => {
      prices[asset] = price;
    });
    
    return prices;
  }

  // Get TWAP (Time-Weighted Average Price)
  async getTWAP(asset: string, period: number = 300): Promise<number | null> {
    try {
      console.log(`[getTWAP] Fetching TWAP for ${asset} with period ${period}`);
      
      const oracleAddress = getOracleForAsset(asset);
      const contract = new StellarSdk.Contract(oracleAddress);
      const sourceAccount = new StellarSdk.Account(
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
        '0'
      );
      
      // Build transaction with asset and period parameters
      const assetParam = StellarSdk.xdr.ScVal.scvSymbol(asset.toUpperCase());
      const periodParam = StellarSdk.nativeToScVal(BigInt(period), { type: 'u64' });
      
      const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(contract.call('twap', assetParam, periodParam))
        .setTimeout(30)
        .build();
      
      const simulated = await this.server.simulateTransaction(tx);
      
      if ('result' in simulated && simulated.result && simulated.result.retval) {
        const price = parseReflectorPrice(simulated.result.retval);
        if (price !== null) {
          console.log(`[getTWAP] Got TWAP for ${asset}: ${price}`);
          return price;
        }
      }
      
      console.log(`[getTWAP] No TWAP found for ${asset}`);
      return null;
      
    } catch (error) {
      console.error(`[getTWAP] Error fetching TWAP for ${asset}:`, error);
      return null;
    }
  }
}

// Export a singleton instance
export const oracleService = new OracleService();

// Export convenience functions
export async function getAssetPrice(asset: string): Promise<number | null> {
  return oracleService.getAssetPrice(asset);
}

export async function getAssetPrices(assets: string[]): Promise<{ [key: string]: number | null }> {
  return oracleService.getAssetPrices(assets);
}

export async function getTWAP(asset: string, period: number = 300): Promise<number | null> {
  return oracleService.getTWAP(asset, period);
}

// Compatibility aliases for existing code
export const getCurrentPrice = getAssetPrice;
export const getTWAPPrice = getTWAP;
export const getBatchPrices = getAssetPrices;

// Additional utility functions for compatibility
export async function checkStablecoinPeg(stablecoin: string): Promise<{ isPegged: boolean; deviation: number; price: number }> {
  const price = await getAssetPrice(stablecoin) || 1.0;
  const deviation = Math.abs(price - 1.0);
  const isPegged = deviation <= 0.02; // 2% deviation threshold
  
  return {
    isPegged,
    deviation: deviation * 100, // Return as percentage
    price
  };
}

export async function getCrossPrice(baseAsset: string, quoteAsset: string): Promise<number | null> {
  const [basePrice, quotePrice] = await Promise.all([
    getAssetPrice(baseAsset),
    getAssetPrice(quoteAsset)
  ]);
  
  if (!basePrice || !quotePrice) return null;
  return basePrice / quotePrice;
}

export async function getOracleStats(): Promise<{
  totalAssets: number;
  activeOracles: number;
  lastUpdate: Date;
  avgResponseTime: number;
}> {
  // Mock implementation for now - would normally fetch from oracle
  return {
    totalAssets: Object.keys(ASSET_ORACLE_MAP).length,
    activeOracles: 3, // EXTERNAL, STELLAR, FOREX
    lastUpdate: new Date(),
    avgResponseTime: 250 // ms
  };
}