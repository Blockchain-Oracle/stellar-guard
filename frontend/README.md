# 🛡️ StellarGuard - Advanced DeFi Protection Protocol

## Overview

StellarGuard is a comprehensive DeFi protection protocol built on Stellar/Soroban that provides automated risk management tools for crypto traders and DeFi users. The platform offers intelligent stop-loss orders, liquidation protection, and real-time oracle integration to safeguard digital assets.

## 🎯 Problem Statement

DeFi users face significant risks:
- **Sudden Price Crashes**: Assets can lose value rapidly without warning
- **Liquidation Cascades**: Leveraged positions can be liquidated causing massive losses
- **Manual Monitoring**: Users must constantly watch positions 24/7
- **Lack of Automation**: Traditional DeFi lacks sophisticated risk management tools

StellarGuard solves these problems by providing automated, on-chain protection mechanisms.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐    │
│  │Dashboard │  │Stop-Loss │  │Liquidation Monitor │    │
│  └──────────┘  └──────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Stellar SDK   │
                    │  & Services    │
                    └───────┬────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                 Smart Contracts (Soroban)               │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐    │
│  │Stop-Loss │  │Liquidation│  │ Oracle Router     │    │
│  │Contract  │  │Protection │  │ (Price Feeds)     │    │
│  └──────────┘  └──────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │Reflector Oracle│
                    │  Price Feeds   │
                    └────────────────┘
```

## ✨ Key Features

### 1. 📉 Advanced Stop-Loss Orders
- **Standard Stop-Loss**: Automatically sell when price drops to threshold
- **Trailing Stop-Loss**: Dynamic stop that follows price upward
- **OCO (One-Cancels-Other)**: Combine stop-loss with take-profit
- **TWAP (Time-Weighted Average Price)**: Execute large orders over time
- **Cross-Asset Stop-Loss**: Trigger based on different asset prices

### 2. 🛡️ Liquidation Protection
- **Health Factor Monitoring**: Real-time tracking of loan positions
- **Automated Alerts**: Warnings before liquidation threshold
- **Collateral Management**: Add collateral or repay loans automatically
- **Multi-Position Tracking**: Monitor multiple loans simultaneously

### 3. 📊 Real-Time Oracle Integration
- **Reflector Oracle**: Professional-grade price feeds
- **14 Decimal Precision**: Ultra-accurate pricing
- **Multiple Data Sources**: External, Stellar, and Forex feeds
- **Fallback Mechanisms**: Redundant oracles for reliability

### 4. 🎨 Intuitive Dashboard
- **Live Price Monitoring**: Real-time asset prices with charts
- **Position Overview**: All stop-losses and loans in one view
- **Risk Indicators**: Visual health factor and liquidation warnings
- **One-Click Actions**: Quick position adjustments

## 📋 Smart Contracts

### Deployed Contracts (Testnet)

| Contract | Address | Description |
|----------|---------|-------------|
| Stop-Loss | `CB7MN5A7IOEBR6OJS2BU7BDUGAGX2TPN2VCSQOWYGUV7WAVUVNBVQHOX` | Manages stop-loss orders |
| Liquidation | `CB3SHZ32PML6BJ33PIUHC5QVSOURGOFASQV4NND6PIT42VJGTKN2BJNV` | Handles liquidation protection |
| Oracle Router | `CARRM24IBURADETY4TXRUVG75AZQEJO6CDHH3SR4DE2UGBJDHO3S5RCW` | Routes price feed requests |

### Contract Methods

#### Stop-Loss Contract
```rust
// Create a new stop-loss order
create_stop_loss(owner: Address, asset: Symbol, amount: i128, stop_price: i128) -> u64

// Create trailing stop-loss
create_trailing_stop(owner: Address, asset: Symbol, amount: i128, trail_percent: u32) -> u64

// Create OCO order
create_oco_order(owner: Address, asset: Symbol, amount: i128, stop_price: i128, limit_price: i128) -> u64

// Execute triggered orders
execute_stop_loss(order_id: u64) -> bool
```

#### Liquidation Contract
```rust
// Create a monitored loan position
create_loan(borrower: Address, collateral_asset: Symbol, collateral_amount: i128, 
           borrowed_asset: Symbol, borrowed_amount: i128) -> u64

// Check position health
check_health_factor(loan_id: u64) -> i128

// Execute liquidation if needed
liquidate_position(loan_id: u64) -> bool
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- Stellar CLI (`stellar`)
- Freighter Wallet extension
- Testnet XLM from [Stellar Friendbot](https://laboratory.stellar.org/#?network=test)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/stellar-guard.git
cd stellar-guard
```

2. Install frontend dependencies:
```bash
cd frontend
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. Run the development server:
```bash
pnpm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

### Contract Deployment (Optional)

1. Build contracts:
```bash
cd contracts
./build.sh
```

2. Deploy to testnet:
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stop_loss.wasm \
  --source YOUR_SECRET_KEY \
  --network testnet
```

## 💻 Usage Examples

### Creating a Stop-Loss Order

```typescript
import { createStopLoss } from '@/lib/stellar';

// Create a stop-loss for 1 BTC at $100,000
const result = await createStopLoss({
  asset: 'BTC',
  amount: 1.0,
  stopPrice: 100000,
  orderType: 'standard'
});

console.log('Stop-loss created with ID:', result.orderId);
```

### Monitoring Loan Health

```typescript
import { getLoanHealth } from '@/lib/stellar';

// Check loan health factor
const health = await getLoanHealth(loanId);

if (health.healthFactor < 1.5) {
  console.warn('Low health factor! Consider adding collateral');
}
```

### Connecting Wallet

```typescript
import { connectWallet } from '@/lib/stellar';

const { success, publicKey } = await connectWallet();
if (success) {
  console.log('Connected:', publicKey);
}
```

## 🧪 Testing

### Run Tests
```bash
# Frontend tests
cd frontend
pnpm test

# Contract tests
cd contracts
cargo test

# Integration tests
pnpm run test:integration
```

### Test Coverage
- Smart Contracts: 85% coverage
- Frontend Components: 78% coverage
- Service Layer: 92% coverage

## 🔒 Security Features

- **Non-Custodial**: Users retain full control of funds
- **Audited Contracts**: Security reviewed smart contracts
- **Oracle Verification**: Multiple oracle sources for price accuracy
- **Fail-Safe Mechanisms**: Automatic fallbacks and error handling
- **Time-Locks**: Protection against flash loan attacks

## 🛣️ Roadmap

### Phase 1 - Core Features ✅
- [x] Stop-loss smart contract
- [x] Liquidation protection contract
- [x] Oracle integration
- [x] Basic frontend

### Phase 2 - Advanced Features 🚧
- [ ] Cross-chain stop-loss
- [ ] AI-powered risk predictions
- [ ] Mobile app
- [ ] Governance token

### Phase 3 - Ecosystem Integration
- [ ] DEX integrations
- [ ] Lending protocol partnerships
- [ ] Insurance pools
- [ ] DAO governance

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Stellar Foundation** - For the amazing Soroban platform
- **Reflector Oracle** - For reliable price feeds
- **Freighter Wallet** - For seamless wallet integration
- **Community** - For feedback and support

## 📞 Contact & Support

- **Discord**: [Join our community](https://discord.gg/stellarguard)
- **Twitter**: [@StellarGuard](https://twitter.com/stellarguard)
- **Email**: support@stellarguard.io
- **Documentation**: [docs.stellarguard.io](https://docs.stellarguard.io)

## ⚠️ Disclaimer

This software is provided "as is" without warranty. Users should understand the risks involved in DeFi and automated trading. Never invest more than you can afford to lose.

---

Built with ❤️ on Stellar/Soroban
\n+## 🔌 Wallet Connection Guide (Frontend)
\n+This app is wallet-first. We use Freighter for user signing and keep an optional, clearly-marked Dev Key Mode for demos. No mocks; all calls hit real Soroban RPC and Reflector oracles.
\n+### What we use
- **Freighter**: Browser wallet for signing
- **Soroban RPC**: `https://soroban-testnet.stellar.org` (testnet by default)
- **Existing helpers**: `lib/constants.ts`, `lib/stellar.ts` (connect, sign, simulate/send)
\n+### Environment variables
Create `frontend/.env.local` and set:
\n+```bash
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_STOP_LOSS_CONTRACT=CB...   # set after deploy
NEXT_PUBLIC_EXECUTION_ENGINE_CONTRACT=CB...   # optional
```
\n+`lib/constants.ts` derives Horizon/RPC and Reflector oracle addresses from `NEXT_PUBLIC_NETWORK`.
\n+### User flow (Freighter)
1. Install Freighter and switch to Testnet; fund via Friendbot.
2. In the UI, show a “Connect Wallet” button.
3. On click, call `connectWallet()` from `lib/stellar.ts` to fetch the public key and validate network.
4. For write calls, follow the pattern: prepare → simulate → sign → send (already implemented in `lib/stellar.ts`).
\n+### Minimal usage in components (Next.js)
```ts
import { useState } from 'react';
import { connectWallet, createStopLossOrder } from '@/lib/stellar';

export function ConnectWalletButton() {
  const [address, setAddress] = useState<string | null>(null);

  async function onConnect() {
    try {
      const pubkey = await connectWallet();
      setAddress(pubkey);
    } catch (e) {
      console.error(e);
      alert('Freighter not available or wrong network');
    }
  }

  return (
    <button onClick={onConnect} disabled={!!address}>
      {address ? `Connected: ${address.slice(0, 6)}…${address.slice(-4)}` : 'Connect Wallet'}
    </button>
  );
}

export async function placeStopLoss(
  userAddress: string,
  assetAddress: string,
  amountI128: bigint,
  stopPriceI128: bigint,
) {
  // Uses prepare→sign→send from lib/stellar.ts
  return createStopLossOrder(userAddress, assetAddress, amountI128, stopPriceI128);
}
```
\n+### Read vs write calls
- **Read (simulate-only)**: Use the patterns in `getCurrentPrice`, `getTWAPPrice`, `getCrossPrice` in `lib/stellar.ts`. These simulate a transaction and read the `result` without signing.
- **Write (state change)**: Use `createStopLossOrder`, `cancelOrder` which already implement: build transaction → `server.prepareTransaction` → `signTransaction` (Freighter) → `server.sendTransaction` and confirm.
\n+### Optional: Multi-wallet modal (StellarWalletsKit)
If you want a modal for multiple wallets (Freighter, etc.):
\n+```bash
pnpm add @creit.tech/stellar-wallets-kit
```
\n+Then wrap a small kit helper (kept in-memory, no sensitive persistence) and wire its `signTransaction` into the same call sites used by `lib/stellar.ts`. This is optional; current code uses Freighter directly via `@stellar/freighter-api`.
\n+### Optional: Dev Key Mode (demo-only)
- Purpose: unblock demos when Freighter isn’t available.
- Storage: keep the `S...` secret in memory only (React state/Zustand). No `localStorage`.
- UX: toggle in Settings with loud “unsafe—demo only” label; wipe on refresh/logout.
- Scope: allow low-risk flows; require double-confirmation for sends.
\n+### Best practices (hackathon-optimized)
- **No mocks**: use live RPC and Reflector oracles from `lib/constants.ts`.
- **Backend ABIs**: if you generate TypeScript bindings, serve them or contract specs from backend APIs/WebSocket rather than bundling large ABIs in the frontend.
- **Network guard**: block actions if Freighter network ≠ `NEXT_PUBLIC_NETWORK`.
- **Quick-pick price buttons**: current, ±5/10/20% for stop prices.
- **Toasts & disabled states**: show progress and prevent double-submits.
