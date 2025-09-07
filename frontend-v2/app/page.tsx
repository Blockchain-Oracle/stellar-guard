"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Shield, Zap, TrendingUp, Users, DollarSign, Lock, Activity, BarChart3, ChevronRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { NeonCard } from "@/components/neon-card"
import { CyberButton } from "@/components/cyber-button"
import { GlitchText } from "@/components/glitch-text"

export default function HomePage() {
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null)

  const features = [
    {
      id: "stop-loss",
      icon: Shield,
      title: "STOP_LOSS_PROTECTION",
      description: "Advanced stop-loss orders with trailing stops and OCO strategies to protect your positions",
      color: "orange" as const,
      link: "/stop-loss"
    },
    {
      id: "twap",
      icon: Activity,
      title: "TWAP_ORDERS",
      description: "Time-weighted average price orders for stable execution across volatile markets",
      color: "cyan" as const,
      link: "/twap"
    },
    {
      id: "liquidation",
      icon: Lock,
      title: "LIQUIDATION_SHIELD",
      description: "Real-time monitoring to prevent position liquidations with automatic protection",
      color: "green" as const,
      link: "/liquidation"
    },
    {
      id: "portfolio",
      icon: BarChart3,
      title: "PORTFOLIO_REBALANCER",
      description: "Automatic rebalancing to maintain target allocations and optimize returns",
      color: "purple" as const,
      link: "/portfolio"
    },
    {
      id: "arbitrage",
      icon: DollarSign,
      title: "ARBITRAGE_ALERTS",
      description: "Cross-exchange price monitoring for instant profit opportunities",
      color: "orange" as const,
      link: "/alerts"
    },
    {
      id: "reflector",
      icon: Zap,
      title: "REFLECTOR_POWERED",
      description: "Built on Stellar's most reliable oracle infrastructure for accurate data",
      color: "cyan" as const,
      link: "/reflector"
    }
  ]

  const stats = [
    { label: "TESTNET_DEMO", value: "LIVE", change: "Ready", icon: DollarSign },
    { label: "CONTRACTS_DEPLOYED", value: "3", change: "Active", icon: Users },
    { label: "ORACLES_CONNECTED", value: "3", change: "Reflector", icon: Shield },
    { label: "ORDER_TYPES", value: "3", change: "Available", icon: TrendingUp },
  ]

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center space-x-2 bg-green-900/30 text-green-500 px-4 py-2 rounded-full font-mono text-sm mb-4">
              <Zap className="h-4 w-4" />
              <span>POWERED_BY_REFLECTOR_ORACLE</span>
            </div>
            
            <div className="space-y-6">
              <Image 
                src="/logo.png" 
                alt="Stellar Guard" 
                width={600} 
                height={150} 
                className="mx-auto object-contain"
                priority
              />
              <GlitchText text="PROTECTION_PROTOCOL.EXE" className="text-2xl md:text-4xl font-mono text-cyan-400" />
            </div>

            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto font-mono leading-relaxed">
              [ADVANCED_TRADING_PROTECTION_SUITE]
              <br />
              Safeguard your positions with automated stop-loss orders, liquidation monitoring, 
              and portfolio rebalancing on Stellar blockchain
              <br />
              <span className="text-cyan-400">&gt; Real-time oracle data ensures precise execution</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/dashboard">
                <CyberButton size="lg" className="min-w-[200px]">
                  LAUNCH_APP
                  <ArrowRight className="ml-2 w-5 h-5" />
                </CyberButton>
              </Link>
              <Link href="/stop-loss">
                <Button
                  variant="outline"
                  size="lg"
                  className="min-w-[200px] border-orange-500/30 text-orange-400 hover:bg-orange-500/10 font-mono bg-transparent"
                >
                  STOP_LOSS
                  <Zap className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/portfolio">
                <Button
                  variant="outline"
                  size="lg"
                  className="min-w-[200px] border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 font-mono bg-transparent"
                >
                  PORTFOLIO
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-20 border-y border-orange-500/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <NeonCard key={index} variant="orange">
                <CardContent className="p-6 text-center">
                  <stat.icon className="w-8 h-8 text-cyan-400 mx-auto mb-4" />
                  <div className="text-3xl font-bold text-white font-mono mb-2">{stat.value}</div>
                  <div className="text-gray-400 font-mono text-sm">{stat.label}</div>
                  <div className="text-green-400 font-mono text-xs mt-2">{stat.change}</div>
                </CardContent>
              </NeonCard>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <GlitchText text="CORE_FEATURES" className="text-4xl font-bold text-cyan-400 mb-4" />
            <p className="text-gray-400 font-mono text-lg">[ADVANCED_TRADING_TOOLS_FOR_STELLAR_ECOSYSTEM]</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <NeonCard
                  key={feature.id}
                  variant={feature.color}
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                    selectedStrategy === feature.id ? "ring-2 ring-cyan-400" : ""
                  }`}
                  onClick={() => setSelectedStrategy(feature.id)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className={`h-6 w-6 text-${feature.color}-500`} />
                      <CardTitle className={`text-${feature.color}-400 font-mono text-lg`}>
                        {feature.title}
                      </CardTitle>
                    </div>
                    <CardDescription className="font-mono text-gray-400">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={feature.link}>
                      <CyberButton className="w-full" variant={feature.color === "orange" ? "primary" : "secondary"}>
                        ACCESS_MODULE
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </CyberButton>
                    </Link>
                  </CardContent>
                </NeonCard>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-20 border-t border-orange-500/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <GlitchText text="HOW_IT_WORKS" className="text-4xl font-bold text-orange-500 mb-4" />
            <p className="text-gray-400 font-mono text-lg">[SIMPLE_STEPS_TO_PROTECT_YOUR_PORTFOLIO]</p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
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
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <NeonCard variant="orange" className="text-center p-12">
            <div className="space-y-6">
              <GlitchText text="READY_TO_START?" className="text-3xl font-bold text-cyan-400" />
              <p className="text-gray-400 font-mono text-lg max-w-2xl mx-auto">
                Join thousands of traders using StellarGuard to safeguard their positions.
                Connect your wallet and start protecting your portfolio today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/dashboard">
                  <CyberButton size="lg" className="min-w-[200px]">
                    START_TRADING
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </CyberButton>
                </Link>
                <Link href="/portfolio">
                  <Button
                    variant="outline"
                    size="lg"
                    className="min-w-[200px] border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 font-mono bg-transparent"
                  >
                    VIEW_PORTFOLIO
                  </Button>
                </Link>
              </div>
            </div>
          </NeonCard>
        </div>
      </section>
    </div>
  )
}
