// Network Configuration
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
export const HORIZON_URL = NETWORK === 'mainnet' 
  ? 'https://horizon.stellar.org' 
  : 'https://horizon-testnet.stellar.org';
export const SOROBAN_RPC_URL = NETWORK === 'mainnet'
  ? 'https://soroban-rpc.stellar.org'
  : 'https://soroban-testnet.stellar.org';

// Reflector Oracle Addresses - MAINNET
export const MAINNET_EXTERNAL_ORACLE = 'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN'; // CEX & DEX prices
export const MAINNET_STELLAR_ORACLE = 'CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M'; // Stellar native assets
export const MAINNET_FOREX_ORACLE = 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC'; // Forex rates

// Reflector Oracle Addresses - TESTNET
export const TESTNET_EXTERNAL_ORACLE = 'CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63'; // CEX & DEX prices
export const TESTNET_STELLAR_ORACLE = 'CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP'; // Stellar native assets
export const TESTNET_FOREX_ORACLE = 'CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W'; // Forex rates

// Get correct oracle based on network
export const REFLECTOR_EXTERNAL_ORACLE = NETWORK === 'mainnet' ? MAINNET_EXTERNAL_ORACLE : TESTNET_EXTERNAL_ORACLE;
export const REFLECTOR_STELLAR_ORACLE = NETWORK === 'mainnet' ? MAINNET_STELLAR_ORACLE : TESTNET_STELLAR_ORACLE;
export const REFLECTOR_FOREX_ORACLE = NETWORK === 'mainnet' ? MAINNET_FOREX_ORACLE : TESTNET_FOREX_ORACLE;

// Contract Addresses (will be set after deployment)
export const STOP_LOSS_CONTRACT = process.env.NEXT_PUBLIC_STOP_LOSS_CONTRACT || '';
export const EXECUTION_ENGINE_CONTRACT = process.env.NEXT_PUBLIC_EXECUTION_ENGINE_CONTRACT || '';

// Oracle Settings
export const ORACLE_DECIMALS = 14;
export const ORACLE_RESOLUTION_SECONDS = 300; // 5 minutes
export const PRICE_STALENESS_THRESHOLD = 600; // 10 minutes

// Order Settings
export const MAX_ORDERS_PER_USER = 100;
export const MIN_ORDER_AMOUNT = 1_000_000; // 0.1 token (7 decimals)
export const MAX_SLIPPAGE_PERCENT = 10;

// Fee Settings
export const PROTOCOL_FEE_BPS = 10; // 0.1%

// Supported Assets
export const SUPPORTED_ASSETS = [
  { symbol: 'XLM', name: 'Stellar Lumens', address: 'native' },
  { symbol: 'BTC', name: 'Bitcoin', address: '' },
  { symbol: 'ETH', name: 'Ethereum', address: '' },
  { symbol: 'USDC', name: 'USD Coin', address: '' },
];

// Order Types
export enum OrderType {
  StopLoss = 'stop_loss',
  TrailingStop = 'trailing_stop',
  TakeProfit = 'take_profit',
  OCO = 'oco',
}

// Order Status
export enum OrderStatus {
  Active = 'active',
  Executed = 'executed',
  Cancelled = 'cancelled',
}