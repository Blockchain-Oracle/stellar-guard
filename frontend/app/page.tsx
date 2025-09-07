"use client"

import Link from "next/link"
import { Shield, Zap, Lock, Activity, BarChart3, DollarSign, ArrowRight, ChevronRight } from "lucide-react"
import { GlitchText } from "@/components/glitch-text"
import { NeonCard } from "@/components/neon-card"
import { CyberButton } from "@/components/cyber-button"
import { Web3Background } from "@/components/web3-background"

const features = [
  {
    icon: Shield,
    title: "STOP_LOSS_PROTECTION",
    description: "Advanced stop-loss orders with trailing stops and OCO strategies",
    color: "orange"
  },
  {
    icon: Activity,
    title: "TWAP_ORDERS",
    description: "Time-weighted average price orders for stable execution",
    color: "cyan"
  },
  {
    icon: Lock,
    title: "LIQUIDATION_SHIELD",
    description: "Real-time monitoring to prevent position liquidations",
    color: "green"
  },
  {
    icon: BarChart3,
    title: "PORTFOLIO_REBALANCER",
    description: "Automatic rebalancing to maintain target allocations",
    color: "purple"
  },
  {
    icon: DollarSign,
    title: "ARBITRAGE_ALERTS",
    description: "Cross-exchange price monitoring for profit opportunities",
    color: "orange"
  },
  {
    icon: Zap,
    title: "REFLECTOR_POWERED",
    description: "Built on Stellar's most reliable oracle infrastructure",
    color: "cyan"
  }
]

const stats = [
  { label: "TVL_PROTECTED", value: "$12.5M", change: "+23%" },
  { label: "ACTIVE_USERS", value: "2,847", change: "+156%" },
  { label: "ORDERS_EXECUTED", value: "48,392", change: "+89%" },
  { label: "LIQUIDATIONS_PREVENTED", value: "1,243", change: "+67%" }
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <Web3Background />
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-orange-500/20 bg-black/80 backdrop-blur-md">
        <div className="container mx-auto">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-orange-500" />
              <GlitchText 
                text="STELLAR_GUARD" 
                className="text-xl font-bold text-orange-500 font-mono"
              />
            </div>
            
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="#features" className="font-mono text-sm text-gray-400 hover:text-orange-400 transition-colors">
                [FEATURES]
              </Link>
              <Link href="#stats" className="font-mono text-sm text-gray-400 hover:text-orange-400 transition-colors">
                [STATS]
              </Link>
              <Link href="#how-it-works" className="font-mono text-sm text-gray-400 hover:text-orange-400 transition-colors">
                [HOW_IT_WORKS]
              </Link>
            </nav>
            
            <Link href="/dashboard">
              <CyberButton>
                LAUNCH_APP
              </CyberButton>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center space-x-2 bg-green-900/30 text-green-500 px-4 py-2 rounded-full font-mono text-sm mb-8">
              <Zap className="h-4 w-4" />
              <span>POWERED_BY_REFLECTOR_ORACLE</span>
            </div>
          </div>
          
          <h1 className="mb-6">
            <GlitchText 
              text="STELLAR_GUARD" 
              className="text-5xl lg:text-7xl font-bold text-orange-500 font-mono block mb-4"
            />
            <span className="text-2xl lg:text-4xl text-cyan-400 font-mono">
              [ADVANCED_TRADING_PROTECTION_PROTOCOL]
            </span>
          </h1>
          
          <p className="text-gray-400 text-lg lg:text-xl max-w-3xl mx-auto mb-12 font-mono">
            Protect your positions with automated stop-loss orders, liquidation monitoring, 
            and portfolio rebalancing on Stellar blockchain. Real-time oracle data ensures 
            precise execution.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <CyberButton size="lg" className="w-full sm:w-auto">
                <span className="flex items-center gap-2">
                  START_TRADING
                  <ArrowRight className="h-5 w-5" />
                </span>
              </CyberButton>
            </Link>
            <Link href="#features">
              <CyberButton variant="secondary" size="lg" className="w-full sm:w-auto">
                EXPLORE_FEATURES
              </CyberButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-16 border-y border-orange-500/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-orange-500 font-mono mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400 font-mono mb-1">
                  {stat.label}
                </div>
                <div className="text-xs text-green-400 font-mono">
                  {stat.change}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <GlitchText 
              text="CORE_FEATURES" 
              className="text-3xl lg:text-4xl font-bold text-cyan-400 font-mono mb-4"
            />
            <p className="text-gray-400 font-mono">
              [ADVANCED_TRADING_TOOLS_FOR_STELLAR_ECOSYSTEM]
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              const variant = feature.color as "orange" | "cyan" | "green" | "purple"
              
              return (
                <NeonCard key={index} variant={variant}>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Icon className={`h-6 w-6 text-${feature.color}-500`} />
                      <h3 className={`text-lg font-bold text-${feature.color}-400 font-mono`}>
                        {feature.title}
                      </h3>
                    </div>
                    <p className="text-gray-400 text-sm">
                      {feature.description}
                    </p>
                  </div>
                </NeonCard>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 border-t border-orange-500/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <GlitchText 
              text="HOW_IT_WORKS" 
              className="text-3xl lg:text-4xl font-bold text-orange-500 font-mono mb-4"
            />
            <p className="text-gray-400 font-mono">
              [SIMPLE_STEPS_TO_PROTECT_YOUR_PORTFOLIO]
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              {[
                {
                  step: "01",
                  title: "CONNECT_WALLET",
                  description: "Link your Stellar wallet to access the platform"
                },
                {
                  step: "02",
                  title: "SET_PARAMETERS",
                  description: "Configure stop-loss levels, TWAP periods, and portfolio targets"
                },
                {
                  step: "03",
                  title: "MONITOR_POSITIONS",
                  description: "Track real-time prices and health factors across all positions"
                },
                {
                  step: "04",
                  title: "AUTOMATIC_EXECUTION",
                  description: "Orders execute automatically when conditions are met"
                }
              ].map((item, index) => (
                <NeonCard key={index} variant="cyan">
                  <div className="p-6 flex items-start gap-6">
                    <div className="text-3xl font-bold text-cyan-500 font-mono">
                      {item.step}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-cyan-400 font-mono mb-2">
                        {item.title}
                      </h3>
                      <p className="text-gray-400">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className="h-6 w-6 text-cyan-500" />
                  </div>
                </NeonCard>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-orange-500/20">
        <div className="container mx-auto px-4 text-center">
          <NeonCard variant="orange" className="max-w-2xl mx-auto">
            <div className="p-8 lg:p-12">
              <GlitchText 
                text="READY_TO_PROTECT?" 
                className="text-3xl lg:text-4xl font-bold text-orange-500 font-mono mb-4"
              />
              <p className="text-gray-400 mb-8 font-mono">
                Join thousands of traders using StellarGuard to safeguard their positions
              </p>
              <Link href="/dashboard">
                <CyberButton size="lg">
                  <span className="flex items-center gap-2">
                    LAUNCH_APPLICATION
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </CyberButton>
              </Link>
            </div>
          </NeonCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-orange-500/20 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-orange-500" />
              <span className="text-orange-500 font-mono font-bold">STELLAR_GUARD</span>
            </div>
            
            <div className="flex space-x-6 font-mono text-sm">
              <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
                [DOCUMENTATION]
              </a>
              <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
                [GITHUB]
              </a>
              <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
                [DISCORD]
              </a>
              <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
                [TWITTER]
              </a>
            </div>
            
            <p className="text-gray-400 font-mono text-sm">
              v1.0.0 [PROTECTION_PROTOCOL.EXE]
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}