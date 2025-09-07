# StellarGuard Frontend V2

A modern, cyberpunk-themed frontend for the StellarGuard trading protection protocol, built with Next.js and featuring the flashy UI style from CoreLiquid.

## Features

- 🎨 **Cyberpunk UI Design**: Neon glows, glitch effects, and animated backgrounds
- 🔐 **Stellar Wallet Integration**: Connect with Freighter and other Stellar wallets
- ⚡ **Real-time Updates**: Live position monitoring and price tracking
- 🛡️ **Trading Protection**: Stop-loss orders, TWAP, and liquidation prevention
- 📊 **Portfolio Management**: Automatic rebalancing and analytics

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS with custom cyberpunk theme
- **Wallet**: Stellar Wallets Kit & Freighter API
- **UI Components**: Custom components with shadcn/ui base
- **State Management**: React Query for server state
- **Blockchain**: Stellar SDK for Soroban interactions

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Stellar wallet (Freighter recommended)

### Installation

1. Install dependencies:
```bash
pnpm install
# or
npm install
```

2. Copy the environment variables:
```bash
cp .env.local.example .env.local
```

3. Update `.env.local` with your configuration:
```env
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
# Add your contract addresses
```

4. Run the development server:
```bash
pnpm dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
frontend-v2/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles with cyberpunk theme
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Landing page
│   └── dashboard/         # Dashboard pages
├── components/            # UI Components
│   ├── ui/               # Base UI components (buttons, cards, etc.)
│   ├── cyber-button.tsx  # Cyberpunk-styled button
│   ├── glitch-text.tsx   # Glitch effect text
│   ├── neon-card.tsx     # Neon glow cards
│   ├── web3-background.tsx # Animated particle background
│   └── header.tsx        # Navigation header with wallet connect
├── lib/                  # Utilities and integrations
│   ├── stellar.ts        # Stellar blockchain functions
│   ├── stellar-wallets-kit.ts # Wallet integration
│   └── cn.ts            # Class name utility
└── public/              # Static assets
```

## UI Components

### CyberButton
Flashy button with gradient background and glow effects:
```tsx
<CyberButton variant="primary" size="lg">
  LAUNCH_APP
</CyberButton>
```

### GlitchText
Text with random glitch animations:
```tsx
<GlitchText text="STELLAR_GUARD" className="text-4xl" />
```

### NeonCard
Cards with customizable neon glow:
```tsx
<NeonCard variant="orange">
  <CardContent>...</CardContent>
</NeonCard>
```

### Web3Background
Animated particle system background with connection lines.

## Wallet Integration

The app uses Stellar Wallets Kit for wallet connections:

```typescript
import { connectWallet, disconnect, getPublicKey } from '@/lib/stellar'

// Connect wallet
const result = await connectWallet()
if (result.success) {
  console.log('Connected:', result.publicKey)
}

// Disconnect
await disconnect()
```

## Development Mode

For testing without a wallet, enable dev mode in `.env.local`:

```env
NEXT_PUBLIC_USE_DEV_KEY=true
NEXT_PUBLIC_DEV_PUBLIC_KEY=your_public_key
NEXT_PUBLIC_DEV_SECRET_KEY=your_secret_key # Only for testing!
```

## Styling Philosophy

The UI follows a cyberpunk aesthetic with:
- **Dark Background**: Near-black (#0A0A0A) with grid overlay
- **Neon Colors**: Orange (#FF6B35) as primary, Cyan (#06B6D4) as accent
- **Glowing Effects**: Box shadows and text shadows for depth
- **Monospace Fonts**: Technical feel with `font-mono`
- **Animated Elements**: Subtle animations and transitions
- **Terminal Aesthetics**: Commands and statuses in UPPER_SNAKE_CASE

## Pages

- **`/`** - Landing page with features and stats
- **`/dashboard`** - Trading dashboard with positions
- **`/stop-loss`** - Stop-loss order management
- **`/portfolio`** - Portfolio rebalancing
- **`/alerts`** - Price alerts and notifications

## Building for Production

```bash
pnpm build
# or
npm run build
```

The build output will be in `.next/` directory.

## Deployment

The app can be deployed on any platform that supports Next.js:

- **Vercel**: Push to GitHub and connect to Vercel
- **Netlify**: Use the Next.js adapter
- **Self-hosted**: Run `pnpm start` after building

## License

MIT


