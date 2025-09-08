// Stellar Wallets Kit wrapper
import { 
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
  ISupportedWallet 
} from '@creit.tech/stellar-wallets-kit';

let kit: StellarWalletsKit | null = null;

// Store selected wallet ID in localStorage
const SELECTED_WALLET_ID = 'selectedWalletId';

function getSelectedWalletId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SELECTED_WALLET_ID);
}

function setSelectedWalletId(walletId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SELECTED_WALLET_ID, walletId);
}

// Initialize the wallet kit
export const initializeWalletKit = () => {
  if (typeof window === 'undefined') return null;
  
  if (!kit) {
    kit = new StellarWalletsKit({
      network: process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet' 
        ? WalletNetwork.PUBLIC 
        : WalletNetwork.TESTNET,
      selectedWalletId: getSelectedWalletId() || FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }
  
  return kit;
};

// Check if dev mode is enabled
export const isDevKeyMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return process.env.NEXT_PUBLIC_USE_DEV_KEY === 'true';
};

// Check if wallet is connected (doesn't throw errors)
export const checkWalletConnection = async (): Promise<boolean> => {
  if (isDevKeyMode()) {
    return !!process.env.NEXT_PUBLIC_DEV_PUBLIC_KEY;
  }
  
  const walletKit = initializeWalletKit();
  if (!walletKit) return false;
  
  try {
    // Try to reconnect if we have a stored wallet ID
    const storedWalletId = getSelectedWalletId();
    if (storedWalletId) {
      try {
        walletKit.setWallet(storedWalletId);
        const { address } = await walletKit.getAddress();
        return !!address;
      } catch {
        // If getting address fails, wallet is not connected
        // Don't clear the stored ID yet - user might reconnect
        return false;
      }
    }
    
    // No stored wallet ID means not connected
    return false;
  } catch {
    return false;
  }
};

// Get public key from wallet or dev mode
export const getPublicKey = async (): Promise<string> => {
  // Dev mode
  if (isDevKeyMode()) {
    const devKey = process.env.NEXT_PUBLIC_DEV_PUBLIC_KEY;
    if (!devKey) throw new Error('Dev public key not configured');
    return devKey;
  }

  // Wallet mode
  const walletKit = initializeWalletKit();
  if (!walletKit) throw new Error('Wallet kit not initialized');
  
  try {
    // Try to reconnect if we have a stored wallet ID
    const storedWalletId = getSelectedWalletId();
    if (storedWalletId) {
      try {
        walletKit.setWallet(storedWalletId);
        const { address } = await walletKit.getAddress();
        if (!address) throw new Error('No address available from wallet');
        return address;
      } catch (reconnectError) {
        console.error('Failed to get address with stored wallet:', reconnectError);
        // Don't clear the stored wallet ID here - let the user reconnect manually
        throw new Error('Wallet not connected - please reconnect');
      }
    }
    
    // No stored wallet ID
    throw new Error('No wallet selected');
  } catch (error) {
    // Re-throw if it's already our error
    if (error instanceof Error && (error.message.includes('Wallet not connected') || error.message.includes('No wallet selected'))) {
      throw error;
    }
    console.error('Error getting address from wallet:', error);
    throw new Error('Failed to get wallet address');
  }
};

// Connect wallet
export const connect = async (): Promise<string> => {
  if (isDevKeyMode()) {
    // In dev mode, return dev public key
    return await getPublicKey();
  }

  const walletKit = initializeWalletKit();
  if (!walletKit) throw new Error('Wallet kit not initialized');
  
  return new Promise((resolve, reject) => {
    walletKit.openModal({
      modalTitle: 'Connect to StellarGuard',
      onWalletSelected: async (option: ISupportedWallet) => {
        try {
          walletKit.setWallet(option.id);
          setSelectedWalletId(option.id);
          const { address } = await walletKit.getAddress();
          resolve(address);
        } catch (error) {
          console.error('Error connecting wallet:', error);
          reject(error);
        }
      },
    });
  });
};

// Disconnect wallet
export const disconnect = async (): Promise<void> => {
  if (isDevKeyMode()) {
    // In dev mode, nothing to disconnect
    return;
  }

  const walletKit = initializeWalletKit();
  if (!walletKit) return;
  
  try {
    walletKit.disconnect();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SELECTED_WALLET_ID);
    }
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
  }
};

// Sign transaction
export const signTransaction = async (
  xdr: string, 
  opts?: { networkPassphrase?: string; address?: string }
): Promise<{ signedTxXdr: string }> => {
  if (isDevKeyMode()) {
    return { signedTxXdr: await signTransactionDevMode(xdr) };
  }

  const walletKit = initializeWalletKit();
  if (!walletKit) throw new Error('Wallet kit not initialized');
  
  const signedXdr = await walletKit.signTransaction(xdr, {
    networkPassphrase: opts?.networkPassphrase,
    address: opts?.address,
  });
  
  return signedXdr;
};

// Sign transaction in dev mode
export const signTransactionDevMode = async (xdr: string): Promise<string> => {
  // In dev mode, we'd need the secret key to sign
  // For now, we'll just return the XDR unchanged as a placeholder
  // In production, you'd use the actual secret key to sign
  const devSecretKey = process.env.NEXT_PUBLIC_DEV_SECRET_KEY;
  
  if (!devSecretKey) {
    console.warn('Dev secret key not configured, returning unsigned transaction');
    return xdr;
  }
  
  // Import stellar SDK dynamically to sign with secret key
  const StellarSdk = await import('@stellar/stellar-sdk');
  const keypair = StellarSdk.Keypair.fromSecret(devSecretKey);
  const transaction = new StellarSdk.Transaction(xdr, StellarSdk.Networks.TESTNET);
  transaction.sign(keypair);
  
  return transaction.toXDR();
};





