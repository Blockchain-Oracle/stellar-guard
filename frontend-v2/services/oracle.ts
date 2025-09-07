import * as StellarSdk from '@stellar/stellar-sdk';
import { getServer, getNetworkPassphrase } from '@/lib/stellar';

// Contract addresses from environment
export const REFLECTOR_EXTERNAL_ORACLE = process.env.NEXT_PUBLIC_REFLECTOR_EXTERNAL_ORACLE || '';
export const REFLECTOR_STELLAR_ORACLE = process.env.NEXT_PUBLIC_REFLECTOR_STELLAR_ORACLE || '';
export const REFLECTOR_FOREX_ORACLE = process.env.NEXT_PUBLIC_REFLECTOR_FOREX_ORACLE || '';

export type AssetType = 'crypto' | 'stellar' | 'forex';

// Get current price from appropriate Reflector oracle
export const getCurrentPrice = async (asset: string, assetType: AssetType = 'crypto'): Promise<number | null> => {
  console.log(`[getCurrentPrice] Fetching price for ${asset} (${assetType})`);
  
  try {
    // Select correct oracle based on asset type
    let oracleAddress = REFLECTOR_EXTERNAL_ORACLE;
    if (assetType === 'stellar') {
      oracleAddress = REFLECTOR_STELLAR_ORACLE;
    } else if (assetType === 'forex') {
      oracleAddress = REFLECTOR_FOREX_ORACLE;
    }
    
    console.log(`[getCurrentPrice] Oracle address: ${oracleAddress}`);
    
    if (!oracleAddress) {
      console.error(`Oracle address not configured for ${assetType}`);
      return null;
    }
    
    const contract = new StellarSdk.Contract(oracleAddress);
    
    const tx = new StellarSdk.TransactionBuilder(
      new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
      {
        fee: '100000',
        networkPassphrase: getNetworkPassphrase(),
      }
    )
      .addOperation(
        contract.call('lastprice', 
          // Create the Asset enum variant as a vec [discriminant, value]
          StellarSdk.xdr.ScVal.scvVec([
            StellarSdk.xdr.ScVal.scvSymbol('Other'),
            StellarSdk.xdr.ScVal.scvSymbol(asset)
          ])
        )
      )
      .setTimeout(30)
      .build();
    
    console.log(`[getCurrentPrice] Simulating transaction for ${asset}`);
    const simulated = await getServer().simulateTransaction(tx);
    console.log(`[getCurrentPrice] Full simulation response:`, JSON.stringify(simulated, null, 2));
    
    // Check different possible response structures
    if (simulated.error) {
      console.error(`[getCurrentPrice] Simulation error for ${asset}:`, simulated.error);
      return null;
    }
    
    // Try to get the result from different possible locations
    let result = null;
    if ('result' in simulated && simulated.result) {
      result = simulated.result;
    } else if (simulated.results && simulated.results.length > 0) {
      result = simulated.results[0];
    } else if (simulated.returnValue) {
      result = simulated.returnValue;
    }
    
    if (result) {
      console.log(`[getCurrentPrice] Found result:`, result);
      const price = parseReflectorPrice(result);
      console.log(`[getCurrentPrice] Final price for ${asset}: ${price}`);
      return price;
    }
    
    console.log(`[getCurrentPrice] No result found for ${asset}`);
    return null;
  } catch (error) {
    console.error(`[getCurrentPrice] Error fetching price for ${asset}:`, error);
    return null;
  }
};

// Get TWAP price from Reflector
export const getTWAPPrice = async (asset: string, periods: number, assetType: AssetType = 'crypto'): Promise<number | null> => {
  console.log(`[getTWAPPrice] Fetching TWAP for ${asset} (${assetType}) with ${periods} periods`);
  
  try {
    // Select correct oracle based on asset type
    let oracleAddress = REFLECTOR_EXTERNAL_ORACLE;
    if (assetType === 'stellar') {
      oracleAddress = REFLECTOR_STELLAR_ORACLE;
    } else if (assetType === 'forex') {
      oracleAddress = REFLECTOR_FOREX_ORACLE;
    }
    
    console.log(`[getTWAPPrice] Oracle address: ${oracleAddress}`);
    
    if (!oracleAddress) {
      console.error(`Oracle address not configured for ${assetType}`);
      return null;
    }
    
    const contract = new StellarSdk.Contract(oracleAddress);
    
    const tx = new StellarSdk.TransactionBuilder(
      new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
      {
        fee: '100000',
        networkPassphrase: getNetworkPassphrase(),
      }
    )
      .addOperation(
        contract.call('twap',
          // Create the Asset enum variant as a vec [discriminant, value]
          StellarSdk.xdr.ScVal.scvVec([
            StellarSdk.xdr.ScVal.scvSymbol('Other'),
            StellarSdk.xdr.ScVal.scvSymbol(asset)
          ]),
          StellarSdk.xdr.ScVal.scvU32(periods)
        )
      )
      .setTimeout(30)
      .build();
    
    console.log(`[getTWAPPrice] Simulating TWAP transaction for ${asset}`);
    const simulated = await getServer().simulateTransaction(tx);
    console.log(`[getTWAPPrice] Full TWAP simulation response:`, JSON.stringify(simulated, null, 2));
    
    // Check for errors
    if (simulated.error) {
      console.error(`[getTWAPPrice] Simulation error for ${asset}:`, simulated.error);
      return null;
    }
    
    // Try to get the result from different possible locations
    let result = null;
    if ('result' in simulated && simulated.result) {
      result = simulated.result;
    } else if (simulated.results && simulated.results.length > 0) {
      result = simulated.results[0];
    } else if (simulated.returnValue) {
      result = simulated.returnValue;
    }
    
    if (result) {
      console.log(`[getTWAPPrice] Found result:`, result);
      const price = parseReflectorPrice(result);
      console.log(`[getTWAPPrice] Final TWAP price for ${asset}: ${price}`);
      return price;
    }
    
    console.log(`[getTWAPPrice] No TWAP result found for ${asset}`);
    return null;
  } catch (error) {
    console.error(`[getTWAPPrice] Error fetching TWAP price for ${asset}:`, error);
    return null;
  }
};

// Get cross price between two assets
export const getCrossPrice = async (baseAsset: string, quoteAsset: string): Promise<number | null> => {
  try {
    const contract = new StellarSdk.Contract(REFLECTOR_EXTERNAL_ORACLE);
    
    const tx = new StellarSdk.TransactionBuilder(
      new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
      {
        fee: '100000',
        networkPassphrase: getNetworkPassphrase(),
      }
    )
      .addOperation(
        contract.call(
          'x_last_price',
          // Create the Asset enum variant as a vec [discriminant, value]
          StellarSdk.xdr.ScVal.scvVec([
            StellarSdk.xdr.ScVal.scvSymbol('Other'),
            StellarSdk.xdr.ScVal.scvSymbol(baseAsset)
          ]),
          StellarSdk.xdr.ScVal.scvVec([
            StellarSdk.xdr.ScVal.scvSymbol('Other'),
            StellarSdk.xdr.ScVal.scvSymbol(quoteAsset)
          ])
        )
      )
      .setTimeout(30)
      .build();
    
    const simulated = await getServer().simulateTransaction(tx);
    if ('result' in simulated && simulated.result) {
      return parseReflectorPrice(simulated.result);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching cross price:', error);
    return null;
  }
};

// Check stablecoin peg deviation
export const checkStablecoinPeg = async (stablecoin: string): Promise<number | null> => {
  try {
    const forexPrice = await getCurrentPrice('USD', 'forex');
    const stablePrice = await getCurrentPrice(stablecoin, 'crypto');
    
    if (forexPrice && stablePrice) {
      const deviation = ((stablePrice - forexPrice) / forexPrice) * 10000; // basis points
      return deviation;
    }
    
    return null;
  } catch (error) {
    console.error('Error checking stablecoin peg:', error);
    return null;
  }
};

// Helper to parse Reflector price response
function parseReflectorPrice(value: any): number | null {
  console.log('[parseReflectorPrice] Raw value:', value);
  
  if (!value) return null;
  
  try {
    // Check if it's a retval from simulation
    if (value.retval) {
      return parseReflectorPrice(value.retval);
    }
    
    // Check if it's a map (lastprice returns a map with price and timestamp entries)
    if (value._switch?.name === 'scvMap' && value._value) {
      console.log('[parseReflectorPrice] Parsing map response');
      const entries = value._value;
      
      for (const entry of entries) {
        const key = entry._attributes?.key;
        const val = entry._attributes?.val;
        
        // Get key name
        let keyName = '';
        if (key?._arm === 'sym' && key._value) {
          keyName = Buffer.from(key._value).toString();
        } else if (key?._value?.toString) {
          keyName = key._value.toString();
        }
        
        console.log('[parseReflectorPrice] Found key:', keyName);
        
        if (keyName === 'price') {
          // Parse price value
          if (val._switch?.name === 'scvI128') {
            const lo = val._value._attributes.lo;
            const hi = val._value._attributes.hi;
            const fullValue = (BigInt(hi._value) << 64n) | BigInt(lo._value);
            const price = Number(fullValue) / Math.pow(10, 14);
            console.log('[parseReflectorPrice] Parsed price from map:', price);
            return price;
          } else if (val._switch?.name === 'scvU64' || val._switch?.name === 'scvI64') {
            const price = Number(BigInt(val._value._value)) / Math.pow(10, 14);
            console.log('[parseReflectorPrice] Parsed price (u64/i64) from map:', price);
            return price;
          }
        }
      }
    }
    
    // Check if it's a struct with price and timestamp (old format, kept for compatibility)
    if (value.price !== undefined) {
      const priceValue = value.price;
      // Convert from string or BigInt to number with 14 decimal places
      const price = Number(BigInt(priceValue)) / Math.pow(10, 14);
      console.log('[parseReflectorPrice] Parsed price from struct:', price);
      return price;
    }
    
    // Check if it's an XDR ScVal that needs decoding
    if (value.val && typeof value.val === 'function') {
      const decoded = value.val();
      if (decoded && decoded.price) {
        const price = Number(BigInt(decoded.price)) / Math.pow(10, 14);
        console.log('[parseReflectorPrice] Parsed from decoded ScVal:', price);
        return price;
      }
    }
    
    // Check for i128 formats (used by TWAP)
    if (value.i128) {
      const i128Val = value.i128();
      if (i128Val && i128Val.lo !== undefined) {
        const lo = typeof i128Val.lo === 'function' ? i128Val.lo() : i128Val.lo;
        const hi = typeof i128Val.hi === 'function' ? i128Val.hi() : i128Val.hi;
        // Combine hi and lo parts for full i128 value
        const fullValue = (BigInt(hi) << 64n) | BigInt(lo);
        const price = Number(fullValue) / Math.pow(10, 14);
        console.log('[parseReflectorPrice] Parsed from i128:', price);
        return price;
      }
    }
    
    // Check for ScVal i128 structure (common in TWAP responses)
    if (value._switch && value._switch.name === 'scvI128') {
      const i128Data = value._value;
      if (i128Data && i128Data._attributes) {
        const lo = i128Data._attributes.lo;
        const hi = i128Data._attributes.hi;
        const fullValue = (BigInt(hi) << 64n) | BigInt(lo);
        const price = Number(fullValue) / Math.pow(10, 14);
        console.log('[parseReflectorPrice] Parsed from ScVal i128:', price);
        return price;
      }
    }
    
    // Try direct conversion if it's already a number or string (TWAP often returns raw i128)
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
      const price = Number(BigInt(value)) / Math.pow(10, 14);
      console.log('[parseReflectorPrice] Direct conversion:', price);
      return price;
    }
    
    console.log('[parseReflectorPrice] Could not parse value:', JSON.stringify(value));
    return null;
    
  } catch (error) {
    console.error('[parseReflectorPrice] Error parsing:', error);
    return null;
  }
}

// Get multiple prices at once for efficiency
export const getBatchPrices = async (assets: string[], assetType: AssetType = 'crypto'): Promise<Map<string, number>> => {
  const prices = new Map<string, number>();
  
  // Fetch prices in parallel
  const promises = assets.map(async (asset) => {
    const price = await getCurrentPrice(asset, assetType);
    if (price !== null) {
      prices.set(asset, price);
    }
  });
  
  await Promise.all(promises);
  return prices;
};

// Oracle statistics and metadata
export interface OracleStats {
  lastUpdate: number;
  resolution: number;
  availability: boolean;
}

export const getOracleStats = async (assetType: AssetType = 'crypto'): Promise<OracleStats | null> => {
  try {
    let oracleAddress = REFLECTOR_EXTERNAL_ORACLE;
    if (assetType === 'stellar') {
      oracleAddress = REFLECTOR_STELLAR_ORACLE;
    } else if (assetType === 'forex') {
      oracleAddress = REFLECTOR_FOREX_ORACLE;
    }
    
    const contract = new StellarSdk.Contract(oracleAddress);
    
    const tx = new StellarSdk.TransactionBuilder(
      new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
      {
        fee: '100000',
        networkPassphrase: getNetworkPassphrase(),
      }
    )
      .addOperation(
        contract.call('resolution')
      )
      .setTimeout(30)
      .build();
    
    const simulated = await getServer().simulateTransaction(tx);
    if ('result' in simulated && simulated.result) {
      return {
        lastUpdate: Date.now(),
        resolution: Number(simulated.result),
        availability: true
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching oracle stats:', error);
    return null;
  }
};