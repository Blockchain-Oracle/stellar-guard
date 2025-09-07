import * as StellarSdk from '@stellar/stellar-sdk';
import { getServer } from '@/lib/stellar';
import { getCurrentPrice, getBatchPrices } from './oracle';

export interface StellarBalance {
  assetType: 'native' | 'credit_alphanum4' | 'credit_alphanum12';
  assetCode?: string;
  assetIssuer?: string;
  balance: string;
  limit?: string;
  buyingLiabilities?: string;
  sellingLiabilities?: string;
}

export interface PortfolioAsset {
  asset: string;
  assetType: string;
  issuer?: string;
  amount: number;
  value: number;
  price: number;
}

// Map of known testnet assets to their issuers
const TESTNET_ASSETS: Record<string, string> = {
  // These are example testnet asset issuers - replace with actual testnet issuers
  'USDC': 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  'USDT': 'GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V',
  'BTC': 'GAUTUYY2THLF7SGITDFMXJVYH3LHDSMGEAKSBU267M2K7A3W543CKUEF',
  'ETH': 'GBDEVU63Y6NTHJQQZIKVTC23NWLQVP3WJ2RI2OTSJTNYOIGICST6DUXR'
};

// Fetch user balances from Stellar
export const getUserBalances = async (userAddress: string): Promise<PortfolioAsset[]> => {
  try {
    const server = getServer();
    console.log('Fetching account for:', userAddress);
    const account = await server.getAccount(userAddress);
    console.log('Account response:', account);
    
    const portfolioAssets: PortfolioAsset[] = [];
    
    // Check if balances exist and is an array
    if (!account || !account.balances || !Array.isArray(account.balances)) {
      console.warn('No balances found for account:', userAddress);
      console.log('Account object:', account);
      return [];
    }
    
    console.log('Found balances:', account.balances.length);
    
    // Process each balance
    for (const balance of account.balances) {
      let asset = '';
      let assetType = '';
      let issuer = '';
      
      if (balance.asset_type === 'native') {
        // Native XLM
        asset = 'XLM';
        assetType = 'native';
      } else if (balance.asset_code) {
        // Issued asset (token)
        asset = balance.asset_code;
        assetType = balance.asset_type;
        issuer = balance.asset_issuer || '';
      } else {
        continue; // Skip unknown assets
      }
      
      // Parse balance amount (Stellar uses 7 decimal places)
      const amount = parseFloat(balance.balance);
      
      // Skip zero balances unless it's a trustline we want to show
      if (amount === 0 && balance.asset_type !== 'native') {
        continue;
      }
      
      portfolioAssets.push({
        asset,
        assetType,
        issuer,
        amount,
        value: 0, // Will be calculated with prices
        price: 0  // Will be fetched from oracle
      });
    }
    
    // Fetch prices for all assets
    const assetCodes = portfolioAssets.map(a => a.asset);
    const uniqueAssets = [...new Set(assetCodes)];
    
    // Get prices from oracle
    const pricePromises = uniqueAssets.map(async (asset) => {
      try {
        // Determine source based on asset
        let source: 'crypto' | 'stellar' | 'forex' = 'crypto';
        
        if (asset === 'XLM' || asset === 'USDC' || asset === 'USDT') {
          source = 'crypto'; // These are in the external oracle
        }
        
        const price = await getCurrentPrice(asset, source);
        return { asset, price: price || 0 };
      } catch (error) {
        console.error(`Error fetching price for ${asset}:`, error);
        return { asset, price: 0 };
      }
    });
    
    const prices = await Promise.all(pricePromises);
    const priceMap = new Map(prices.map(p => [p.asset, p.price]));
    
    // Update portfolio assets with prices and values
    portfolioAssets.forEach(asset => {
      asset.price = priceMap.get(asset.asset) || 0;
      asset.value = asset.amount * asset.price;
    });
    
    // Sort by value descending
    portfolioAssets.sort((a, b) => b.value - a.value);
    
    return portfolioAssets;
  } catch (error: any) {
    console.error('Error fetching user balances:', error);
    
    // If account not found on network, return empty array
    if (error?.response?.status === 404) {
      console.log('Account not found on network - returning empty portfolio');
      return [];
    }
    
    // For other errors, return empty array instead of throwing
    return [];
  }
};

// Calculate portfolio statistics
export const calculatePortfolioStats = (assets: PortfolioAsset[]) => {
  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
  
  const stats = {
    totalValue,
    assetCount: assets.length,
    topAsset: assets[0] || null,
    distribution: assets.map(asset => ({
      asset: asset.asset,
      percentage: totalValue > 0 ? (asset.value / totalValue) * 100 : 0
    }))
  };
  
  return stats;
};

// Get user's stop-loss orders value
export const getOrdersValue = async (userAddress: string): Promise<number> => {
  try {
    // Import getUserOrders from stop-loss service
    const { getUserOrders } = await import('./stop-loss');
    const orders = await getUserOrders(userAddress);
    
    // Calculate total value of active orders
    let totalValue = 0;
    for (const order of orders) {
      if (order.status === 'active') {
        // Convert amount from contract format (assuming 7 decimals)
        const amount = Number(order.amount) / Math.pow(10, 7);
        // For now, we'll estimate value - in production, you'd fetch actual asset prices
        totalValue += amount;
      }
    }
    
    return totalValue;
  } catch (error) {
    console.error('Error calculating orders value:', error);
    return 0;
  }
};