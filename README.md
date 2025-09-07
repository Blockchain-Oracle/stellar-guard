# Stellar Guard - Automated Trading Protection on Stellar

A decentralized trading protection system that executes stop-loss, take-profit, and trailing stop orders automatically using Stellar's Soroban smart contracts.

## Problem Statement

Crypto markets run 24/7 but traders can't monitor positions constantly. This leads to:
- Overnight crashes causing major losses
- Missed profit-taking opportunities
- Emotional trading decisions
- No advanced order types on most DEXs

Stellar Guard brings professional trading tools to DeFi, allowing users to set automated trading rules that execute without intermediaries.

## Core Features

### 1. Stop-Loss Orders
Automatically sell assets when price drops to a specified level. Protects against major losses during market downturns.

### 2. Take-Profit Orders
Secure gains by auto-selling when assets reach target prices. Never miss profit opportunities due to timezone differences or work schedules.

### 3. Trailing Stop Orders
Dynamic stop-loss that adjusts upward with price increases but locks in place during declines. Maximizes upside while protecting downside.

### 4. Portfolio Management
- Real-time balance tracking from blockchain
- Performance analytics and P&L calculations
- Rebalancing recommendations based on target allocations
- Support for all Stellar assets

### 5. Telegram Notifications
Instant alerts for:
- Order executions
- Price threshold breaches
- Portfolio rebalancing needs
- Market volatility warnings

### 6. Oracle Integration
Professional-grade price feeds via Reflector Network:
- External oracle for CEX/DEX prices
- Stellar oracle for native assets
- Forex oracle for stablecoin peg monitoring
- TWAP (Time-Weighted Average Price) for manipulation resistance

## Architecture Overview

### How It Works

```
    USER                    STELLAR GUARD                    BLOCKCHAIN
      │                           │                               │
      │    1. Create Order        │                               │
      ├──────────────────────────►│                               │
      │                           │                               │
      │                           │    2. Store on Chain          │
      │                           ├──────────────────────────────►│
      │                           │                               │
      │                           │    3. Monitor Prices 24/7     │
      │                           │◄──────────────────────────────│
      │                           │                               │
      │                           │    4. Execute When Triggered  │
      │                           ├──────────────────────────────►│
      │                           │                               │
      │    5. Get Notification    │                               │
      │◄──────────────────────────│                               │
```

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         WEB INTERFACE                           │
│                     (React + Next.js + TypeScript)             │
└─────────────────┬───────────────────────────┬──────────────────┘
                  │                           │
                  ▼                           ▼
        ┌─────────────────┐         ┌─────────────────┐
        │  Freighter      │         │   Telegram Bot   │
        │  Wallet         │         │   Notifications  │
        └────────┬────────┘         └─────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│                    SMART CONTRACTS (Soroban)                 │
├───────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │  Stop-Loss   │   │ Liquidation  │   │    Oracle    │   │
│  │   Orders     │   │  Protection  │   │    Router    │   │
│  └──────────────┘   └──────────────┘   └──────────────┘   │
│                                                  │          │
└──────────────────────────────────────────────────┼──────────┘
                                                   │
                                                   ▼
                                    ┌──────────────────────┐
                                    │  REFLECTOR ORACLES   │
                                    ├──────────────────────┤
                                    │ • Binance/Coinbase   │
                                    │ • Stellar DEX        │
                                    │ • Forex Rates        │
                                    └──────────────────────┘
```

### Simple Example: Stop-Loss Order

```
1. You set: "Sell my BTC if price drops below $40,000"
   
2. What happens next:

   Your Order → Smart Contract → Watches Price → Auto-Sells at $40,000
                                       ↑
                                  Oracle Feed
                                  (Real prices)
```

### Price Feed System

```
Multiple Exchanges          Reflector Oracle         Your Orders
─────────────────          ─────────────────        ────────────
                                    
Binance    ─┐                                      Stop-Loss
             ├──► Aggregates ──► Reliable Price ──► Take-Profit
Coinbase   ─┤     & Filters                        Trailing Stop
             │                                      Liquidation
Stellar DEX ─┘                                      Protection
```

### Project Structure

```
stellar-guard/
│
├── contracts/              # Smart Contracts (Rust/Soroban)
│   ├── stop_loss/         # Order execution engine
│   │   ├── src/
│   │   │   └── lib.rs    # Core stop-loss logic
│   │   └── Cargo.toml
│   │
│   ├── oracle_router/     # Price feed aggregator
│   │   ├── src/
│   │   │   └── lib.rs    # Oracle integration
│   │   └── Cargo.toml
│   │
│   └── liquidation/       # Collateral monitoring
│       ├── src/
│       │   └── lib.rs    # Health factor checks
│       └── Cargo.toml
│
├── frontend-v2/           # Web Application (Next.js)
│   ├── app/              # Page routes
│   │   ├── dashboard/    # Main trading view
│   │   ├── orders/       # Order management
│   │   ├── portfolio/    # Asset tracking
│   │   └── alerts/       # Notification center
│   │
│   ├── components/       # Reusable UI
│   │   ├── neon-card.tsx
│   │   ├── cyber-button.tsx
│   │   └── wallet-guard.tsx
│   │
│   ├── services/         # Blockchain integration
│   │   ├── oracle.ts     # Price feeds
│   │   ├── stop-loss.ts  # Order contracts
│   │   ├── portfolio.ts  # Balance tracking
│   │   └── telegram.ts   # Alert system
│   │
│   └── lib/              # Utilities
│       └── stellar.ts    # SDK wrapper
│
└── docs/                 # Documentation
    └── README.md         # This file
```

## Installation

### Prerequisites
- Node.js 18+
- pnpm package manager
- Freighter wallet extension

### Setup

```bash
# Clone repository
git clone https://github.com/your-team/stellar-guard
cd stellar-guard/frontend-v2

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Application runs at `http://localhost:3000`

### Testnet Configuration

1. Install Freighter wallet browser extension
2. Switch to testnet in Freighter settings
3. Get test XLM from [Stellar Laboratory](https://laboratory.stellar.org/#account-creator)
4. Connect wallet in the application

## Usage Guide

### Creating Orders

1. Navigate to "Create Order" page
2. Select asset (BTC, ETH, XLM, etc.)
3. Enter order parameters:
   - Amount: Quantity to trade
   - Stop Price: Trigger price
   - Order Type: Stop-loss, take-profit, or trailing
4. Review and sign transaction
5. Order becomes active immediately

### Telegram Integration

1. Open Alerts page
2. Find Telegram Notifications section
3. Start chat with @core_dot_fun_bot
4. Send `/start` to receive chat ID
5. Enter chat ID in application
6. Verify connection
7. Receive real-time notifications

### Portfolio Monitoring

- Dashboard displays all active orders
- Real-time price updates from oracles
- Order history and execution logs
- Performance metrics and analytics

## Technical Specifications

### Deployed Contracts (Stellar Testnet)

All contracts are live on Stellar's test network. You can view them on [Stellar Expert](https://stellar.expert/explorer/testnet).

| Contract | Address | What it does |
|----------|---------|--------------|
| Stop-Loss Engine | [`CDSKXUU5BDMKMLDS4T3PL6RUX7XLVG3DW7ZSV7LL5LS2WJVJ6ZP5EUMM`](https://stellar.expert/explorer/testnet/contract/CDSKXUU5BDMKMLDS4T3PL6RUX7XLVG3DW7ZSV7LL5LS2WJVJ6ZP5EUMM) | Handles all your trading orders |
| Oracle Router | [`CB3AWIGZ66E3DNPWY22T2RRKW2VYYKQNJOYTT56FD4LOVKVGTFF5L3FN`](https://stellar.expert/explorer/testnet/contract/CB3AWIGZ66E3DNPWY22T2RRKW2VYYKQNJOYTT56FD4LOVKVGTFF5L3FN) | Gets accurate prices from markets |
| Liquidation Monitor | [`CACBFLZ2IDRV45WZ2SYZ27C5ILPJTP6TUS5PQDXZBPNXCOHOP7CPLRJW`](https://stellar.expert/explorer/testnet/contract/CACBFLZ2IDRV45WZ2SYZ27C5ILPJTP6TUS5PQDXZBPNXCOHOP7CPLRJW) | Watches collateral health |

### Price Feed Sources (Powered by Reflector Network)

We use Reflector Network's professional oracles for real-time prices:

| Oracle Type | Contract Address | Provides |
|-------------|------------------|----------|
| Crypto Prices | [`CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63`](https://stellar.expert/explorer/testnet/contract/CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63) | BTC, ETH prices from major exchanges |
| Stellar Assets | [`CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP`](https://stellar.expert/explorer/testnet/contract/CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP) | XLM and native Stellar tokens |
| Forex Rates | [`CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W`](https://stellar.expert/explorer/testnet/contract/CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W) | USD, EUR exchange rates |

### Technology Stack

- Frontend: Next.js 15, TypeScript, Tailwind CSS
- Smart Contracts: Rust, Soroban SDK
- Blockchain: Stellar Network (Testnet)
- Price Feeds: Reflector Oracle Network
- Notifications: Telegram Bot API

## Use Cases

### Risk Management
- Set stop-loss 10% below entry to limit downside
- Example: BTC purchased at $50,000, stop at $45,000
- Protects capital during market corrections

### Profit Taking
- Take-profit orders at resistance levels
- Example: ETH entry at $2,000, take-profit at $2,500
- Secures 25% gain automatically

### Trend Following
- Trailing stop maintains 5% distance from peak
- Example: XLM rises from $0.10 to $0.20
- Stop adjusts from $0.095 to $0.19
- Captures majority of trend while protecting gains

## Key Advantages

### Market Need
- Most DeFi platforms lack advanced order types
- Traders need 24/7 position monitoring
- Manual trading leads to emotional decisions
- Current solutions are centralized or complex

### Our Approach
- Non-custodial: Users maintain full control
- Decentralized: No single point of failure
- Transparent: All logic on-chain
- Efficient: Stellar's low transaction costs
- Reliable: Professional oracle integration
- Accessible: Intuitive interface for all skill levels  

## Development Roadmap

### Current Features (v1.0)
- Stop-loss order execution
- Take-profit automation
- Trailing stop implementation
- Portfolio tracking
- Telegram notifications
- Reflector oracle integration

### Planned Features (v2.0)
- Mobile application
- Advanced charting tools
- Strategy backtesting
- Social trading features
- Cross-chain support
- Limit order functionality

## Team

Built for the Stellar Hackathon 2024. We're a team of DeFi enthusiasts who believe trading protection should be accessible to everyone, not just institutional traders.

## Links and Resources

- GitHub Repository: [https://github.com/Blockchain-Oracle/stellar-guard](https://github.com/Blockchain-Oracle/stellar-guard)
- Live Demo: Run locally with `pnpm dev` (see Installation)
- Telegram Bot: [@core_dot_fun_bot](https://t.me/core_dot_fun_bot)
- Blockchain Explorer: [Stellar Expert (Testnet)](https://stellar.expert/explorer/testnet)
- Oracle Provider: [Reflector Network](https://reflector.network)

## License

MIT License - open source and free to use

## Acknowledgments

- Stellar Foundation for Soroban platform
- Reflector Network for reliable oracle feeds
- Freighter team for wallet integration

---

*Stellar Guard - Professional trading tools for everyone*