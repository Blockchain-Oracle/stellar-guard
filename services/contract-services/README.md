# StellarGuard Contract Services

TypeScript library for interacting with StellarGuard smart contracts on the Stellar network.

## Installation

```bash
pnpm install @stellar-guard/contract-services
```

## Features

- **Wallet Management**: Connect to Freighter or use secret keys
- **Oracle Integration**: Real-time price feeds from Reflector oracles
- **Stop-Loss Orders**: Create and manage stop-loss orders on-chain
- **Liquidation Engine**: Monitor and execute liquidations
- **TWAP Pricing**: Time-weighted average price calculations
- **Cross-Price**: Direct asset pair pricing

## Quick Start

```typescript
import { StellarGuardServices } from '@stellar-guard/contract-services';

// Initialize all services
const services = new StellarGuardServices();

// Connect wallet (Freighter or secret key)
const wallet = await services.initialize('YOUR_SECRET_KEY');
console.log('Connected:', wallet.publicKey);

// Get account for transactions
const account = await services.getAccount();
```

## Services

### WalletService

Manages wallet connections and account operations.

```typescript
// Connect with Freighter
const walletInfo = await services.wallet.connectFreighter();

// Connect with secret key
const walletInfo = await services.wallet.connectWithSecret(secretKey);

// Get account balances
const balances = await services.wallet.getBalances();

// Check if account exists
const exists = await services.wallet.accountExists(publicKey);
```

### OracleService

Integrates with Reflector oracles for price feeds.

```typescript
// Get spot price
const price = await services.oracle.getSpotPrice('BTC', account);
console.log(`BTC: $${price.price}`);

// Get TWAP price
const twap = await services.oracle.getTWAPPrice('ETH', 5, account);
console.log(`ETH TWAP: $${twap.twapPrice}`);

// Get cross price
const crossPrice = await services.oracle.getCrossPrice('BTC', 'ETH', account);
console.log(`BTC/ETH: ${crossPrice}`);

// Batch prices
const prices = await services.oracle.getBatchPrices(['BTC', 'ETH', 'XLM'], account);

// Check stablecoin peg
const peg = await services.oracle.checkStablecoinPeg('USDC', account);
console.log(`USDC deviation: ${peg.deviation} bps`);
```

### StopLossService

Create and manage stop-loss orders on-chain.

```typescript
// Create stop-loss order
const orderId = await services.stopLoss.createStopLossOrder({
  owner: publicKey,
  asset: 'BTC',
  amount: 0.1,
  stopPrice: 30000,
}, account, keypair);

// Get order details
const order = await services.stopLoss.getOrder(orderId, account);

// Check if would trigger
const wouldTrigger = services.stopLoss.wouldTrigger(order, currentPrice);

// Cancel order
await services.stopLoss.cancelOrder(orderId, owner, account, keypair);

// Get active orders
const activeOrders = await services.stopLoss.getActiveOrders(owner, account);
```

### LiquidationService

Monitor and execute loan liquidations.

```typescript
// Create loan
const loanId = await services.liquidation.createLoan({
  borrower: publicKey,
  collateralAsset: 'ETH',
  collateralAmount: 1,
  borrowedAsset: 'USDC',
  borrowedAmount: 1500,
  liquidationThreshold: 150, // 150%
}, account, keypair);

// Check liquidation status
const canLiquidate = await services.liquidation.checkLiquidation(
  loanId,
  ethPrice,
  usdcPrice,
  account
);

// Get health factor
const healthFactor = await services.liquidation.getHealthFactor(
  loanId,
  ethPrice,
  usdcPrice,
  account
);

// Execute liquidation
if (canLiquidate) {
  await services.liquidation.liquidate(loanId, liquidator, account, keypair);
}

// Monitor multiple loans
const healthStatuses = await services.liquidation.monitorLoans(
  loanIds,
  priceMap,
  account
);
```

## Configuration

The library uses centralized configuration for contract addresses and network settings.

```typescript
import { CONTRACTS, REFLECTOR_ORACLES, NETWORK } from '@stellar-guard/contract-services';

// Access deployed contracts
console.log(CONTRACTS.STOP_LOSS);
console.log(CONTRACTS.LIQUIDATION);
console.log(CONTRACTS.ORACLE_ROUTER);

// Access Reflector oracle addresses
console.log(REFLECTOR_ORACLES.testnet.EXTERNAL);
console.log(REFLECTOR_ORACLES.testnet.STELLAR);
console.log(REFLECTOR_ORACLES.testnet.FOREX);
```

## Utility Functions

```typescript
import {
  toContractAmount,
  fromContractAmount,
  formatPrice,
  formatAmount,
  calculateHealthFactor,
  isLiquidatable,
  calculateRebalanceAmounts
} from '@stellar-guard/contract-services';

// Convert amounts
const contractAmount = toContractAmount(100.5); // Convert to bigint
const normalAmount = fromContractAmount(contractAmount); // Convert back

// Format for display
const formattedPrice = formatPrice(1234.56); // $1,234.56
const formattedAmount = formatAmount(0.001, 'BTC'); // 0.0010 BTC

// Health calculations
const health = calculateHealthFactor(3000, 1500, 150);
const liquidatable = isLiquidatable(health);

// Rebalancing
const { action, amount } = calculateRebalanceAmounts(
  currentValue,
  totalValue,
  targetPercentage
);
```

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

## Building

```bash
# Build TypeScript
pnpm build

# Lint
pnpm lint
```

## Deployed Contracts (Testnet)

- **Stop-Loss**: `CDSKXUU5BDMKMLDS4T3PL6RUX7XLVG3DW7ZSV7LL5LS2WJVJ6ZP5EUMM`
- **Liquidation**: `CACBFLZ2IDRV45WZ2SYZ27C5ILPJTP6TUS5PQDXZBPNXCOHOP7CPLRJW`
- **Oracle Router**: `CB3AWIGZ66E3DNPWY22T2RRKW2VYYKQNJOYTT56FD4LOVKVGTFF5L3FN`

## Reflector Oracle Addresses

### Testnet
- **External**: `CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN`
- **Stellar**: `CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M`
- **Forex**: `CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC`

### Mainnet
- **External**: `CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63`
- **Stellar**: `CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP`
- **Forex**: `CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W`

## Error Handling

All services throw descriptive errors that can be caught and handled:

```typescript
try {
  const order = await services.stopLoss.createStopLossOrder(params, account, keypair);
} catch (error) {
  console.error('Failed to create order:', error.message);
}
```

## License

MIT