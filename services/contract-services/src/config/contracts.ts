/**
 * Contract addresses and configuration for all deployed StellarGuard contracts
 * These are the actual deployed contract addresses on Stellar Testnet
 */

export const NETWORK = process.env.STELLAR_NETWORK || 'testnet';
export const NETWORK_PASSPHRASE = NETWORK === 'mainnet' 
  ? 'Public Global Stellar Network ; September 2015'
  : 'Test SDF Network ; September 2015';

export const RPC_URL = NETWORK === 'mainnet'
  ? 'https://soroban-rpc.stellar.org'
  : 'https://soroban-testnet.stellar.org';

export const HORIZON_URL = NETWORK === 'mainnet'
  ? 'https://horizon.stellar.org'
  : 'https://horizon-testnet.stellar.org';

// Contract Addresses by Network
export const CONTRACTS = NETWORK === 'mainnet' ? {
  // Mainnet contracts (TO BE DEPLOYED)
  STOP_LOSS: '', // To deploy on mainnet
  LIQUIDATION: '', // To deploy on mainnet
  ORACLE_ROUTER: '', // To deploy on mainnet
  REBALANCER: '',
  EXECUTION_ENGINE: '',
} : {
  // Testnet contracts (DEPLOYED & WORKING - Updated with SDK v23.0.2)
  STOP_LOSS: 'CC2VFR2DSZ4DYB52YXTTDHUMFF6SFN3OMRZH6PAKN7K5BH22PPWOGWFL', // Updated: SDK v23.0.2 with new functions
  LIQUIDATION: 'CACBFLZ2IDRV45WZ2SYZ27C5ILPJTP6TUS5PQDXZBPNXCOHOP7CPLRJW', // Updated liquidation contract
  ORACLE_ROUTER: 'CB3AWIGZ66E3DNPWY22T2RRKW2VYYKQNJOYTT56FD4LOVKVGTFF5L3FN', // Updated oracle router
  REBALANCER: '',
  EXECUTION_ENGINE: '',
} as const;

// Reflector Oracle Addresses
// Source: https://reflector.network/docs
export const REFLECTOR_ORACLES = {
  testnet: {
    EXTERNAL: 'CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63', // Testnet External CEX & DEX
    STELLAR: 'CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP',  // Testnet Stellar Pubnet
    FOREX: 'CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W',    // Testnet Foreign Exchange
  },
  mainnet: {
    EXTERNAL: 'CA2V4IXNCEKV6XQJR42FA25KXUMFQMBJLW3ZKRVU4FXCJUPUMDZMDM5S', // Mainnet External CEX & DEX
    STELLAR: 'CBMS4EXBYPTVGBH6CB5QM4I5OY4P2QQ6L7HGFPFBRLNV5P7524L4G66I',  // Mainnet Stellar Pubnet  
    FOREX: 'CAHBESFLDZEUK5FMJOUSFRKPJJKXWKTLYF4HRLC7VGJJRMGD2X6V3EK5',    // Mainnet Foreign Exchange
  },
} as const;

// Contract Constants
export const DECIMALS = 7; // 7 decimals for amounts and prices
export const REFLECTOR_DECIMALS = 14; // Reflector uses 14 decimals
export const MAX_SLIPPAGE_BPS = 100; // 1% max slippage
export const PROTOCOL_FEE_BPS = 10; // 0.1% protocol fee

// Supported Assets
export const SUPPORTED_ASSETS = {
  // Crypto assets (use External Oracle)
  BTC: { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
  ETH: { symbol: 'ETH', name: 'Ethereum', type: 'crypto' },
  SOL: { symbol: 'SOL', name: 'Solana', type: 'crypto' },
  
  // Stablecoins (use External Oracle)
  USDC: { symbol: 'USDC', name: 'USD Coin', type: 'stablecoin' },
  USDT: { symbol: 'USDT', name: 'Tether', type: 'stablecoin' },
  
  // Stellar native (use Stellar Oracle)
  XLM: { symbol: 'XLM', name: 'Stellar Lumens', type: 'stellar' },
  
  // Forex (use Forex Oracle)
  EUR: { symbol: 'EUR', name: 'Euro', type: 'forex' },
  GBP: { symbol: 'GBP', name: 'British Pound', type: 'forex' },
  USD: { symbol: 'USD', name: 'US Dollar', type: 'forex' },
} as const;

export type AssetSymbol = keyof typeof SUPPORTED_ASSETS;
export type AssetType = 'crypto' | 'stablecoin' | 'stellar' | 'forex';