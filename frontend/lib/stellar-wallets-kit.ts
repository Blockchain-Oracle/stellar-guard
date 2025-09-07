import {
  allowAllModules,
  FREIGHTER_ID,
  StellarWalletsKit,
  WalletNetwork,
} from '@creit.tech/stellar-wallets-kit';

const SELECTED_WALLET_ID = 'selectedWalletId';
const DEV_KEY_STORAGE = 'devKeyMode'; // Only for session state tracking, not the key itself

// In-memory storage for dev key (never persisted)
let devSecretKey: string | null = null;

function getSelectedWalletId() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SELECTED_WALLET_ID);
}

// Get the network from environment
function getNetwork(): WalletNetwork {
  const network = process.env.NEXT_PUBLIC_NETWORK;
  if (network === 'mainnet') return WalletNetwork.PUBLIC;
  return WalletNetwork.TESTNET;
}

// Only initialize kit on client side
let kit: StellarWalletsKit | null = null;

if (typeof window !== 'undefined') {
  kit = new StellarWalletsKit({
    modules: allowAllModules(),
    network: getNetwork(),
    selectedWalletId: getSelectedWalletId() ?? FREIGHTER_ID,
  });
}

export const signTransaction = kit ? kit.signTransaction.bind(kit) : async () => { throw new Error('Wallet kit not initialized'); };

export async function getPublicKey() {
  // Check if in dev key mode
  if (isDevKeyMode() && devSecretKey) {
    try {
      const { Keypair } = require('@stellar/stellar-sdk');
      const keypair = Keypair.fromSecret(devSecretKey);
      return keypair.publicKey();
    } catch (e) {
      console.error('Invalid dev key:', e);
      clearDevKey();
      return null;
    }
  }

  // Normal wallet mode
  if (!getSelectedWalletId() || !kit) return null;
  try {
    const { address } = await kit.getAddress();
    return address;
  } catch (e) {
    console.error('Failed to get wallet address:', e);
    return null;
  }
}

export async function setWallet(walletId: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SELECTED_WALLET_ID, walletId);
    if (kit) kit.setWallet(walletId);
  }
  // Clear dev mode when switching to wallet
  clearDevKey();
}

export async function disconnect(callback?: () => Promise<void>) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SELECTED_WALLET_ID);
  }
  clearDevKey();
  if (kit) kit.disconnect();
  if (callback) await callback();
}

export async function connect(callback?: () => Promise<void>) {
  // Clear dev mode when connecting wallet
  clearDevKey();
  
  if (!kit) {
    throw new Error('Wallet kit not initialized');
  }
  
  await kit.openModal({
    onWalletSelected: async (option) => {
      try {
        await setWallet(option.id);
        if (callback) await callback();
      } catch (e) {
        console.error(e);
      }
      return option.id;
    },
  });
}

// Dev Key Mode functions (demo only)
export function isDevKeyMode(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(DEV_KEY_STORAGE) === 'true';
}

export async function enableDevKeyMode(secretKey: string): Promise<{ success: boolean; publicKey?: string; error?: string }> {
  try {
    const { Keypair } = require('@stellar/stellar-sdk');
    const keypair = Keypair.fromSecret(secretKey);
    const publicKey = keypair.publicKey();
    
    // Store in memory only
    devSecretKey = secretKey;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(DEV_KEY_STORAGE, 'true');
    }
    
    // Clear wallet selection
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SELECTED_WALLET_ID);
    }
    
    return { success: true, publicKey };
  } catch (e) {
    return { success: false, error: 'Invalid secret key' };
  }
}

export function clearDevKey() {
  devSecretKey = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(DEV_KEY_STORAGE);
  }
}

export function getDevSecretKey(): string | null {
  return devSecretKey;
}

// Sign transaction for dev mode
export async function signTransactionDevMode(xdr: string) {
  if (!devSecretKey) throw new Error('Dev key not set');
  
  const { Keypair, TransactionBuilder, Networks } = require('@stellar/stellar-sdk');
  const keypair = Keypair.fromSecret(devSecretKey);
  
  const network = process.env.NEXT_PUBLIC_NETWORK === 'mainnet' 
    ? Networks.PUBLIC 
    : Networks.TESTNET;
  
  const transaction = TransactionBuilder.fromXDR(xdr, network);
  transaction.sign(keypair);
  
  return transaction.toXDR();
}