import * as StellarSdk from '@stellar/stellar-sdk';
import { 
  isDevKeyMode,
  getPublicKey as getWalletPublicKey,
  signTransaction as walletSignTransaction,
  connect as connectWalletKit,
  disconnect as disconnectWallet,
  signTransactionDevMode,
  checkWalletConnection,
} from './stellar-wallets-kit';

// Constants
export const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
export const SOROBAN_RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 
  (NETWORK === 'mainnet' 
    ? 'https://soroban-rpc.mainnet.stellar.gateway.fm'
    : 'https://soroban-testnet.stellar.org');

// Lazy-initialize Soroban RPC (avoid SSR import issues)
let cachedServer: StellarSdk.rpc.Server | null = null;
export const getServer = (): StellarSdk.rpc.Server => {
  if (!cachedServer) {
    cachedServer = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
  }
  return cachedServer;
};

// Get network passphrase
export const getNetworkPassphrase = () => {
  return NETWORK === 'mainnet' 
    ? StellarSdk.Networks.PUBLIC 
    : StellarSdk.Networks.TESTNET;
};

// Connect wallet (supports both Freighter via StellarWalletsKit and Dev Mode)
export const connectWallet = async (): Promise<{ success: boolean; publicKey?: string; error?: string }> => {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Not in browser environment' };
  }
  
  try {
    // If in dev mode, return dev public key
    if (isDevKeyMode()) {
      const publicKey = await getWalletPublicKey();
      if (publicKey) {
        return { success: true, publicKey };
      }
      return { success: false, error: 'Dev key not configured' };
    }
    
    // Otherwise use wallet kit
    const publicKey = await connectWalletKit();
    
    if (publicKey) {
      return { success: true, publicKey };
    }
    return { success: false, error: 'Failed to connect wallet' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Connection failed' };
  }
};

// Disconnect wallet
export const disconnect = async () => {
  try {
    await disconnectWallet();
  } catch (error) {
    console.error('Failed to disconnect wallet:', error);
  }
};

// Sign transaction (supports both wallet and dev mode)
export const signTransaction = async (xdr: string): Promise<string> => {
  if (isDevKeyMode()) {
    return await signTransactionDevMode(xdr);
  }
  
  // Use wallet kit for normal signing
  const signedTx = await walletSignTransaction(xdr, {
    networkPassphrase: getNetworkPassphrase(),
    address: await getWalletPublicKey(),
  });
  
  return signedTx.signedTxXdr;
};

// Format address for display
export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Check if wallet is connected
export const isWalletConnected = async (): Promise<boolean> => {
  return await checkWalletConnection();
};

// Get public key (safe version that doesn't throw)
export const getPublicKey = async (): Promise<string> => {
  return await getWalletPublicKey();
};

// Get public key safely (returns null instead of throwing)
export const getPublicKeySafe = async (): Promise<string | null> => {
  try {
    return await getWalletPublicKey();
  } catch {
    return null;
  }
};
