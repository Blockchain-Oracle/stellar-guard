import * as StellarSdk from '@stellar/stellar-sdk';
import { 
  NETWORK, 
  SOROBAN_RPC_URL, 
  STOP_LOSS_CONTRACT,
  REFLECTOR_EXTERNAL_ORACLE,
  REFLECTOR_STELLAR_ORACLE,
  REFLECTOR_FOREX_ORACLE
} from './constants';
import {
  getPublicKey as getWalletPublicKey,
  signTransaction as walletSignTransaction,
  connect as connectWalletKit,
  disconnect as disconnectWallet,
  isDevKeyMode,
  signTransactionDevMode,
} from './stellar-wallets-kit';

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
    await connectWalletKit();
    const publicKey = await getWalletPublicKey();
    
    if (publicKey) {
      return { success: true, publicKey };
    }
    return { success: false, error: 'Failed to connect wallet' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Connection failed' };
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

// Create stop-loss order
export const createStopLossOrder = async (
  userAddress: string,
  asset: string,
  amount: bigint,
  stopPrice: bigint
) => {
  const server = getServer();
  const account = await server.getAccount(userAddress);
  const contract = new StellarSdk.Contract(STOP_LOSS_CONTRACT);
  
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(
      contract.call(
        'create_stop_loss',
        StellarSdk.Address.fromString(userAddress).toScVal(),
        StellarSdk.Address.fromString(asset).toScVal(),
        StellarSdk.xdr.ScVal.scvI128(new StellarSdk.xdr.Int128Parts({
          hi: StellarSdk.xdr.Int64.fromString((amount >> 64n).toString()),
          lo: StellarSdk.xdr.Uint64.fromString((amount & 0xffffffffffffffffn).toString()),
        })),
        StellarSdk.xdr.ScVal.scvI128(new StellarSdk.xdr.Int128Parts({
          hi: StellarSdk.xdr.Int64.fromString((stopPrice >> 64n).toString()),
          lo: StellarSdk.xdr.Uint64.fromString((stopPrice & 0xffffffffffffffffn).toString()),
        }))
      )
    )
    .setTimeout(30)
    .build();
  
  const preparedTx = await server.prepareTransaction(tx);
  const signedXdr = await signTransaction(preparedTx.toXDR());
  const signedTx = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    getNetworkPassphrase()
  );
  
  const result = await server.sendTransaction(signedTx as any);
  
  if (result.status === 'PENDING') {
    // Wait for confirmation
    const hash = result.hash;
    let getResponse = await server.getTransaction(hash);
    
    while (getResponse.status === 'NOT_FOUND') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      getResponse = await server.getTransaction(hash);
    }
    
    if (getResponse.status === 'SUCCESS') {
      return getResponse.returnValue;
    } else {
      throw new Error('Transaction failed');
    }
  }
  
  throw new Error('Transaction submission failed');
};

// Get user orders
export const getUserOrders = async (userAddress: string) => {
  const contract = new StellarSdk.Contract(STOP_LOSS_CONTRACT);
  
  const tx = new StellarSdk.TransactionBuilder(
    new StellarSdk.Account(userAddress, '0'),
    {
      fee: '100000',
      networkPassphrase: getNetworkPassphrase(),
    }
  )
    .addOperation(
      contract.call(
        'get_user_orders',
        StellarSdk.Address.fromString(userAddress).toScVal()
      )
    )
    .setTimeout(30)
    .build();
  
  const simulated = await getServer().simulateTransaction(tx);
  if ('result' in simulated && simulated.result) {
    return simulated.result;
  }
  
  return [];
};

// Get current price from appropriate Reflector oracle
export const getCurrentPrice = async (asset: string, assetType: 'crypto' | 'stellar' | 'forex' = 'crypto') => {
  // Select correct oracle based on asset type
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
      contract.call(
        'lastprice',
        StellarSdk.xdr.ScVal.scvMap([
          new StellarSdk.xdr.ScMapEntry({
            key: StellarSdk.xdr.ScVal.scvSymbol('Other'),
            val: StellarSdk.xdr.ScVal.scvSymbol(asset)
          })
        ])
      )
    )
    .setTimeout(30)
    .build();
  
  const simulated = await getServer().simulateTransaction(tx);
  if ('result' in simulated && simulated.result) {
    return simulated.result;
  }
  
  return null;
};

// Get TWAP price from Reflector
export const getTWAPPrice = async (asset: string, periods: number, assetType: 'crypto' | 'stellar' | 'forex' = 'crypto') => {
  // Select correct oracle based on asset type
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
      contract.call(
        'twap',
        StellarSdk.xdr.ScVal.scvMap([
          new StellarSdk.xdr.ScMapEntry({
            key: StellarSdk.xdr.ScVal.scvSymbol('Other'),
            val: StellarSdk.xdr.ScVal.scvSymbol(asset)
          })
        ]),
        StellarSdk.xdr.ScVal.scvU32(periods)
      )
    )
    .setTimeout(30)
    .build();
  
  const simulated = await getServer().simulateTransaction(tx);
  if ('result' in simulated && simulated.result) {
    return simulated.result;
  }
  
  return null;
};

// Get cross price between two assets
export const getCrossPrice = async (baseAsset: string, quoteAsset: string) => {
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
        StellarSdk.xdr.ScVal.scvMap([
          new StellarSdk.xdr.ScMapEntry({
            key: StellarSdk.xdr.ScVal.scvSymbol('Other'),
            val: StellarSdk.xdr.ScVal.scvSymbol(baseAsset)
          })
        ]),
        StellarSdk.xdr.ScVal.scvMap([
          new StellarSdk.xdr.ScMapEntry({
            key: StellarSdk.xdr.ScVal.scvSymbol('Other'),
            val: StellarSdk.xdr.ScVal.scvSymbol(quoteAsset)
          })
        ])
      )
    )
    .setTimeout(30)
    .build();
  
  const simulated = await getServer().simulateTransaction(tx);
  if ('result' in simulated && simulated.result) {
    return simulated.result;
  }
  
  return null;
};

// Check stablecoin peg deviation
export const checkStablecoinPeg = async (stablecoin: string) => {
  const forexPrice = await getCurrentPrice('USD', 'forex');
  const stablePrice = await getCurrentPrice(stablecoin, 'crypto');
  
  if (forexPrice && stablePrice) {
    const deviation = ((Number(stablePrice) - Number(forexPrice)) / Number(forexPrice)) * 10000; // basis points
    return deviation;
  }
  
  return null;
};

// Cancel order
export const cancelOrder = async (userAddress: string, orderId: bigint) => {
  const server = getServer();
  const account = await server.getAccount(userAddress);
  const contract = new StellarSdk.Contract(STOP_LOSS_CONTRACT);
  
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(
      contract.call(
        'cancel_order',
        StellarSdk.Address.fromString(userAddress).toScVal(),
        StellarSdk.xdr.ScVal.scvU64(StellarSdk.xdr.Uint64.fromString(orderId.toString()))
      )
    )
    .setTimeout(30)
    .build();
  
  const preparedTx = await server.prepareTransaction(tx);
  const signedXdr = await signTransaction(preparedTx.toXDR());
  const signedTx = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    getNetworkPassphrase()
  );
  
  const result = await server.sendTransaction(signedTx as any);
  return result;
};

// Formatting helpers used by UI components
export const formatPrice = (value: number): string => {
  if (Number.isNaN(value) || !Number.isFinite(value)) return '-';
  const opts = value < 1
    ? { minimumFractionDigits: 4, maximumFractionDigits: 4 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return value.toLocaleString(undefined, opts);
};

export const formatPercentage = (value: number): string => {
  if (Number.isNaN(value) || !Number.isFinite(value)) return '-';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

// Health factor helpers used by UI components
export const getHealthFactorColor = (hf: number): string => {
  if (hf < 1.2) return 'text-red-500';
  if (hf < 1.5) return 'text-orange-500';
  if (hf < 2) return 'text-yellow-500';
  return 'text-green-500';
};

export const getHealthFactorStatus = (hf: number): { color: string; icon: string } => {
  if (hf < 1.2) return { color: 'text-red-500', icon: '⚠️' };
  if (hf < 1.5) return { color: 'text-orange-500', icon: '⛔' };
  if (hf < 2) return { color: 'text-yellow-500', icon: '☑️' };
  return { color: 'text-green-500', icon: '✅' };
};