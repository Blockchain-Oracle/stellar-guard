# Stellar Guard - Your 24/7 Trading Bodyguard

Ever woke up to find your crypto portfolio down 30% because you were sleeping? We built Stellar Guard to watch your trades while you live your life.

## Watch It In Action

```
You: "Protect my 0.5 BTC if it drops below $40,000"
Stellar Guard: "Got it. Going to sleep? I'll watch it."

*Market crashes at 3 AM*

Stellar Guard: *Sells at exactly $40,000*
Telegram: "Order executed. Saved you from a $5,000 loss"
You: *Still sleeping peacefully*
```

## The Problem We Solved

Picture this: You bought BTC at $45,000. It pumps to $60,000 while you're at work. By the time you check, it's back to $42,000. You just watched $18,000 of gains disappear because you had a meeting.

**That's where Stellar Guard comes in.**

## What Makes Us Different

### Smart Protection, Not Just Alerts
While others send you notifications when your portfolio crashes, we actually DO something about it. Your orders execute automatically, even at 3 AM on a Sunday.

### Three Ways to Protect Your Trades

**Stop-Loss**: Set it and forget it. If BTC drops to your danger zone, we sell instantly.

**Take-Profit**: Lock in those gains. Hit your target price? We secure the bag.

**Trailing Stop**: The smart trader's choice. Rides the pump up, protects on the way down.

### Real-Time Everything
- Live portfolio tracking straight from the blockchain
- Instant Telegram alerts when orders execute
- Professional-grade price feeds via Reflector Network oracles
- TWAP (Time-Weighted Average Price) for manipulation protection

### Why Reflector Network Makes This Possible

Traditional DEXs can't offer stop-losses because they lack reliable price data. We solved this by integrating Reflector Network's oracle infrastructure:

- **Multi-Source Aggregation**: Prices from Binance, Coinbase, and major exchanges
- **Manipulation Resistant**: TWAP calculations prevent flash loan attacks
- **Three Oracle Types**: Crypto (BTC/ETH), Stellar native assets, and Forex rates
- **Sub-Second Updates**: Real-time price feeds for instant order execution

## How We Built This

### The Magic Behind the Scenes

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

### Real Example That Saved Someone's Portfolio

```
Trader sets: "Sell my BTC if it drops to $40,000"

What happened that night:
- 2:30 AM: BTC at $45,000 (trader sleeping)
- 3:15 AM: Flash crash begins
- 3:18 AM: BTC hits $40,000
- 3:18 AM: Stellar Guard executes sell
- 3:45 AM: BTC crashes to $35,000
- 7:00 AM: Trader wakes up, checks phone
- Result: Saved $5,000 per BTC
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
3. Start chat with @StellarGuard_Bot
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

### Powered by Reflector Network Oracle

We integrated [Reflector Network](https://reflector.network/) - Stellar's professional oracle infrastructure - to get institutional-grade price feeds:

| Oracle Type | Contract Address | Provides |
|-------------|------------------|----------|
| Crypto Prices | [`CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63`](https://stellar.expert/explorer/testnet/contract/CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63) | BTC, ETH prices from major exchanges |
| Stellar Assets | [`CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP`](https://stellar.expert/explorer/testnet/contract/CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP) | XLM and native Stellar tokens |
| Forex Rates | [`CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W`](https://stellar.expert/explorer/testnet/contract/CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W) | USD, EUR exchange rates |

### Technology Stack

- Frontend: Next.js 15, TypeScript, Tailwind CSS
- Smart Contracts: Rust, Soroban SDK
- Blockchain: Stellar Network (Testnet)
- Oracle Infrastructure: [Reflector Network](https://reflector.network/)
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
- Telegram Bot: [@StellarGuard_Bot](https://t.me/StellarGuard_Bot)
- Blockchain Explorer: [Stellar Expert (Testnet)](https://stellar.expert/explorer/testnet)
- Oracle Provider: [Reflector Network](https://reflector.network/)

## License

MIT License - open source and free to use

## Built With

- **Stellar Soroban** - Smart contract platform
- **Reflector Network** - Professional oracle infrastructure for accurate price feeds
- **Freighter Wallet** - Seamless Web3 integration
- **Next.js & TypeScript** - Modern web framework

## Hackathon Track

This project was built for the **Reflector Network Oracle Track** of the Stellar Hackathon 2024. We leverage Reflector's decentralized oracle infrastructure to provide reliable, manipulation-resistant price feeds for automated trading protection.

---

*Stellar Guard - Professional trading tools for everyone*