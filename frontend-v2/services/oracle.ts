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
    
    // SDK v14: Create the Asset enum variant as a vec ['Other', asset]
    const assetParam = StellarSdk.xdr.ScVal.scvVec([
      StellarSdk.xdr.ScVal.scvSymbol('Other'),
      StellarSdk.xdr.ScVal.scvSymbol(asset)
    ]);
    
    const tx = new StellarSdk.TransactionBuilder(
      new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
      {
        fee: '100000',
        networkPassphrase: getNetworkPassphrase(),
      }
    )
      .addOperation(contract.call('lastprice', assetParam))
      .setTimeout(30)
      .build();
    
    console.log(`[getCurrentPrice] Simulating transaction for ${asset}`);
    const simulated = await getServer().simulateTransaction(tx);
    console.log(`[getCurrentPrice] Simulation response:`, simulated);
    
    // Check if it's an error response
    if ('error' in simulated && simulated.error) {
      console.error(`[getCurrentPrice] Simulation error for ${asset}:`, simulated.error);
      return null;
    }
    
    // Check for successful result with retval
    if ('result' in simulated && simulated.result?.retval) {
      console.log(`[getCurrentPrice] Found result:`, simulated.result.retval);
      const nativeValue = StellarSdk.scValToNative(simulated.result.retval);
      console.log(`[getCurrentPrice] Native value:`, nativeValue);
      
      if (nativeValue && typeof nativeValue === 'object' && 'price' in nativeValue) {
        const price = Number(nativeValue.price) / Math.pow(10, 14);
        console.log(`[getCurrentPrice] Final price for ${asset}: ${price}`);
        return price;
      }
    }
    
    console.log(`[getCurrentPrice] No result found for ${asset}`);
    return null;
  } catch (error) {
    console.error(`[getCurrentPrice] Error fetching price for ${asset}:`, error);
    return null;
  }
};

// Get TWAP price from Reflector
export const getTWAPPrice = async (asset: string, periods: number = 5, assetType: AssetType = 'crypto'): Promise<number | null> => {
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
    
    // SDK v14: Create the Asset enum variant as a vec ['Other', asset]
    const assetParam = StellarSdk.xdr.ScVal.scvVec([
      StellarSdk.xdr.ScVal.scvSymbol('Other'),
      StellarSdk.xdr.ScVal.scvSymbol(asset)
    ]);
    
    const tx = new StellarSdk.TransactionBuilder(
      new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
      {
        fee: '100000',
        networkPassphrase: getNetworkPassphrase(),
      }
    )
      .addOperation(contract.call('twap', assetParam, StellarSdk.xdr.ScVal.scvU32(periods)))
      .setTimeout(30)
      .build();
    
    console.log(`[getTWAPPrice] Simulating TWAP transaction for ${asset}`);
    const simulated = await getServer().simulateTransaction(tx);
    
    // Check if it's an error response
    if ('error' in simulated && simulated.error) {
      console.error(`[getTWAPPrice] Simulation error for ${asset}:`, simulated.error);
      return null;
    }
    
    // Check for successful result with retval
    if ('result' in simulated && simulated.result?.retval) {
      console.log(`[getTWAPPrice] Found result:`, simulated.result.retval);
      const nativeValue = StellarSdk.scValToNative(simulated.result.retval);
      console.log(`[getTWAPPrice] Native TWAP value:`, nativeValue);
      
      // TWAP returns i128 directly
      if (typeof nativeValue === 'bigint' || typeof nativeValue === 'number') {
        const price = Number(nativeValue) / Math.pow(10, 14);
        console.log(`[getTWAPPrice] Final TWAP price for ${asset}: ${price}`);
        return price;
      }
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
    
    // SDK v14: Create Asset enum variants
    const baseAssetParam = StellarSdk.xdr.ScVal.scvVec([
      StellarSdk.xdr.ScVal.scvSymbol('Other'),
      StellarSdk.xdr.ScVal.scvSymbol(baseAsset)
    ]);
    
    const quoteAssetParam = StellarSdk.xdr.ScVal.scvVec([
      StellarSdk.xdr.ScVal.scvSymbol('Other'),
      StellarSdk.xdr.ScVal.scvSymbol(quoteAsset)
    ]);
    
    const tx = new StellarSdk.TransactionBuilder(
      new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
      {
        fee: '100000',
        networkPassphrase: getNetworkPassphrase(),
      }
    )
      .addOperation(contract.call('x_last_price', baseAssetParam, quoteAssetParam))
      .setTimeout(30)
      .build();
    
    const simulated = await getServer().simulateTransaction(tx);
    
    // Check if it's an error response
    if ('error' in simulated && simulated.error) {
      console.error('Cross price simulation error:', simulated.error);
      return null;
    }
    
    // Check for successful result with retval
    if ('result' in simulated && simulated.result?.retval) {
      const nativeValue = StellarSdk.scValToNative(simulated.result.retval);
      if (typeof nativeValue === 'bigint' || typeof nativeValue === 'number') {
        const price = Number(nativeValue) / Math.pow(10, 14);
        return price;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching cross price:', error);
    return null;
  }
};

// Check stablecoin peg deviation
export const checkStablecoinPeg = async (stablecoin: string): Promise<{ isPegged: boolean; deviation: number; price: number }> => {
  const price = await getCurrentPrice(stablecoin) || 1.0;
  const deviation = Math.abs(price - 1.0) * 100; // Return as percentage
  const isPegged = deviation <= 2; // 2% deviation threshold
  
  return {
    isPegged,
    deviation,
    price
  };
};

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
      .addOperation(contract.call('resolution'))
      .setTimeout(30)
      .build();
    
    const simulated = await getServer().simulateTransaction(tx);
    
    // Check for successful result with retval
    if ('result' in simulated && simulated.result?.retval) {
      const resolution = StellarSdk.scValToNative(simulated.result.retval);
      return {
        lastUpdate: Date.now(),
        resolution: Number(resolution),
        availability: true
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching oracle stats:', error);
    return null;
  }
};