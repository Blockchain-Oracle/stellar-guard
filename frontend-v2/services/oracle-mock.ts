// Mock Oracle Service - Returns realistic mock prices for demo purposes
// This is used when the Reflector oracle is not functioning properly

export type AssetType = 'crypto' | 'stellar' | 'forex';

// Mock prices (realistic as of Dec 2024)
const MOCK_PRICES: { [key: string]: number } = {
  // Crypto
  'BTC': 98543.21,
  'ETH': 3856.42,
  'SOL': 235.67,
  'USDC': 1.0001,
  'USDT': 0.9998,
  
  // Stellar
  'XLM': 0.4823,
  
  // Forex
  'EUR': 1.0523,
  'GBP': 1.2641,
  'USD': 1.0000,
  'JPY': 0.0067,
  'CHF': 1.1342,
};

// Get current price with slight random variation
export const getCurrentPrice = async (asset: string, assetType?: AssetType): Promise<number | null> => {
  const basePrice = MOCK_PRICES[asset.toUpperCase()];
  if (!basePrice) {
    console.warn(`[Mock Oracle] No price for ${asset}`);
    return null;
  }
  
  // Add small random variation (±0.5%)
  const variation = (Math.random() - 0.5) * 0.01;
  const price = basePrice * (1 + variation);
  
  console.log(`[Mock Oracle] Price for ${asset}: ${price}`);
  return price;
};

// Get TWAP price (just returns current price with less variation)
export const getTWAPPrice = async (asset: string, periods: number = 5, assetType?: AssetType): Promise<number | null> => {
  const basePrice = MOCK_PRICES[asset.toUpperCase()];
  if (!basePrice) {
    console.warn(`[Mock Oracle] No TWAP for ${asset}`);
    return null;
  }
  
  // Add smaller random variation (±0.2%)
  const variation = (Math.random() - 0.5) * 0.004;
  const price = basePrice * (1 + variation);
  
  console.log(`[Mock Oracle] TWAP for ${asset}: ${price}`);
  return price;
};

// Get cross price between two assets
export const getCrossPrice = async (baseAsset: string, quoteAsset: string): Promise<number | null> => {
  const basePrice = await getCurrentPrice(baseAsset);
  const quotePrice = await getCurrentPrice(quoteAsset);
  
  if (!basePrice || !quotePrice) return null;
  
  return basePrice / quotePrice;
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
export const getBatchPrices = async (assets: string[], assetType?: AssetType): Promise<Map<string, number>> => {
  const prices = new Map<string, number>();
  
  for (const asset of assets) {
    const price = await getCurrentPrice(asset, assetType);
    if (price !== null) {
      prices.set(asset, price);
    }
  }
  
  return prices;
};

// Oracle statistics
export const getOracleStats = async (): Promise<{
  totalAssets: number;
  activeOracles: number;
  lastUpdate: Date;
  avgResponseTime: number;
}> => {
  return {
    totalAssets: Object.keys(MOCK_PRICES).length,
    activeOracles: 3, // EXTERNAL, STELLAR, FOREX
    lastUpdate: new Date(),
    avgResponseTime: 50 // ms (mock is fast!)
  };
};

// Compatibility exports
export const REFLECTOR_EXTERNAL_ORACLE = 'MOCK_ORACLE';
export const REFLECTOR_STELLAR_ORACLE = 'MOCK_ORACLE';
export const REFLECTOR_FOREX_ORACLE = 'MOCK_ORACLE';

export interface OracleStats {
  lastUpdate: number;
  resolution: number;
  availability: boolean;
}