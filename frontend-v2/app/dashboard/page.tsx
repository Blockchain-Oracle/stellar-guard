"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { NeonCard } from "@/components/neon-card"
import { CyberButton } from "@/components/cyber-button"
import { GlitchText } from "@/components/glitch-text"
import { WalletGuard } from "@/components/wallet-guard"
import { 
  Shield, 
  TrendingUp, 
  AlertCircle, 
  Activity,
  DollarSign,
  BarChart3,
  Clock,
  Target,
  Eye,
  RefreshCw,
  Plus,
  TrendingDown
} from "lucide-react"
import Link from "next/link"
import { isWalletConnected, getPublicKey } from "@/lib/stellar"
import { useRouter } from "next/navigation"
import { getCurrentPrice, getTWAPPrice, checkStablecoinPeg } from "@/services/oracle"
import { getUserOrders, OrderType, StopLossOrder } from "@/services/stop-loss"
import { getUserBalances, calculatePortfolioStats } from "@/services/portfolio"

function DashboardContent() {
  const [walletAddress, setWalletAddress] = useState("")
  const [loading, setLoading] = useState(true)
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [orders, setOrders] = useState<StopLossOrder[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [portfolioValue, setPortfolioValue] = useState(0)

  useEffect(() => {
    loadWalletData()
  }, [])

  useEffect(() => {
    if (walletAddress) {
      loadData()
      // Refresh data every 30 seconds
      const interval = setInterval(loadData, 30000)
      return () => clearInterval(interval)
    }
  }, [walletAddress])

  const loadWalletData = async () => {
    try {
      const address = await getPublicKey()
      if (address) {
        setWalletAddress(address)
        setLoading(false)
      }
    } catch (error) {
      // Don't log error - wallet might just not be connected yet
      // The WalletGuard will handle showing the connection prompt
      setLoading(false)
    }
  }

  const loadData = async () => {
    try {
      setRefreshing(true)
      
      // Load prices in parallel
      const [btcPrice, ethPrice, xlmPrice, usdcPeg] = await Promise.all([
        getCurrentPrice('BTC', 'crypto'),
        getCurrentPrice('ETH', 'crypto'),
        getCurrentPrice('XLM', 'stellar'),
        checkStablecoinPeg('USDC')
      ])

      setPrices({
        BTC: btcPrice || 0,
        ETH: ethPrice || 0,
        XLM: xlmPrice || 0,
        USDC_PEG: usdcPeg || 0
      })

      // Load user orders and portfolio
      if (walletAddress) {
        const [userOrders, balances] = await Promise.all([
          getUserOrders(walletAddress),
          getUserBalances(walletAddress)
        ])
        setOrders(userOrders)
        
        // Calculate portfolio value from real balances
        const stats = calculatePortfolioStats(balances)
        setPortfolioValue(stats.totalValue)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    } finally {
      setRefreshing(false)
    }
  }

  const formatPrice = (value: number): string => {
    if (value === 0) return '-'
    if (value < 1) {
      return `$${value.toFixed(4)}`
    }
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatPegDeviation = (bps: number): string => {
    const percent = bps / 100
    return percent >= 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`
  }


  const metrics = [
    { 
      label: "PORTFOLIO_VALUE", 
      value: formatPrice(portfolioValue), 
      change: portfolioValue > 0 ? "LIVE" : "N/A", 
      icon: DollarSign,
      color: "text-green-400"
    },
    { 
      label: "ACTIVE_ORDERS", 
      value: orders.filter(o => o.status === 'active').length.toString(), 
      change: `${orders.length} total`, 
      icon: Activity,
      color: "text-cyan-400"
    },
    { 
      label: "BTC_PRICE", 
      value: formatPrice(prices.BTC || 0), 
      change: "LIVE", 
      icon: TrendingUp,
      color: "text-orange-400"
    },
    { 
      label: "USDC_PEG", 
      value: prices.USDC_PEG ? formatPegDeviation(prices.USDC_PEG) : '-', 
      change: Math.abs(prices.USDC_PEG || 0) > 50 ? "ALERT" : "STABLE", 
      icon: Eye,
      color: Math.abs(prices.USDC_PEG || 0) > 50 ? "text-red-400" : "text-green-400"
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <GlitchText text="LOADING_DASHBOARD_DATA..." className="text-2xl text-orange-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <GlitchText 
            text="TRADING_DASHBOARD" 
            className="text-3xl font-bold text-orange-500 font-mono"
          />
          <p className="text-gray-400 font-mono mt-2">
            [REAL_TIME_ORACLE_DATA.EXE]
          </p>
        </div>
        <div className="flex gap-3">
          <CyberButton 
            onClick={loadData} 
            variant="secondary"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            REFRESH
          </CyberButton>
          <Link href="/orders/create">
            <CyberButton>
              <Plus className="h-4 w-4 mr-2" />
              NEW_ORDER
            </CyberButton>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <NeonCard key={index} variant={index % 2 === 0 ? "orange" : "cyan"}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Icon className={`h-5 w-5 ${metric.color}`} />
                  <Badge 
                    variant={metric.change.includes('+') || metric.change === 'STABLE' || metric.change === 'LIVE' ? 'default' : 'destructive'}
                    className="font-mono text-xs"
                  >
                    {metric.change}
                  </Badge>
                </div>
                <div className={`text-2xl font-bold font-mono ${metric.color}`}>
                  {metric.value}
                </div>
                <p className="text-xs text-gray-400 font-mono mt-1">
                  {metric.label}
                </p>
              </div>
            </NeonCard>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Orders */}
        <div className="lg:col-span-2">
          <NeonCard>
            <CardHeader>
              <CardTitle className="text-orange-400 font-mono flex items-center gap-2">
                <Shield className="h-5 w-5" />
                ACTIVE_ORDERS
              </CardTitle>
              <CardDescription className="font-mono text-gray-400">
                Real-time order monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.filter(o => o.status === 'active').map((order) => (
                    <div key={order.id.toString()} className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              {order.orderType.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-gray-400 font-mono">
                              ID: {order.id.toString()}
                            </span>
                          </div>
                          <p className="mt-2 font-mono">
                            Amount: {(Number(order.amount) / Math.pow(10, 7)).toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-400 font-mono">
                            Stop: {formatPrice(Number(order.stopPrice) / Math.pow(10, 7))}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={order.status === 'active' ? 'default' : 'secondary'}
                            className="font-mono"
                          >
                            {order.status.toUpperCase()}
                          </Badge>
                          <p className="text-xs text-gray-400 font-mono mt-2">
                            {new Date(order.createdAt * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 font-mono">NO_ACTIVE_ORDERS</p>
                  <Link href="/orders/create">
                    <CyberButton className="mt-4" size="sm">
                      CREATE_FIRST_ORDER
                    </CyberButton>
                  </Link>
                </div>
              )}
            </CardContent>
          </NeonCard>
        </div>

        {/* Oracle Status */}
        <div className="space-y-4">
          <NeonCard variant="cyan">
            <CardHeader>
              <CardTitle className="text-cyan-400 font-mono flex items-center gap-2">
                <Activity className="h-5 w-5" />
                ORACLE_STATUS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-mono">External Oracle</span>
                  <Badge variant="default" className="font-mono text-xs">
                    LIVE
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-mono">Stellar Oracle</span>
                  <Badge variant="default" className="font-mono text-xs">
                    LIVE
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-mono">Forex Oracle</span>
                  <Badge variant="default" className="font-mono text-xs">
                    LIVE
                  </Badge>
                </div>
                <div className="pt-3 border-t border-gray-800">
                  <p className="text-xs text-gray-400 font-mono">
                    Last update: {new Date().toLocaleTimeString()}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    Network: TESTNET
                  </p>
                </div>
              </div>
            </CardContent>
          </NeonCard>

          <NeonCard variant="green">
            <CardHeader>
              <CardTitle className="text-green-400 font-mono flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                LIVE_PRICES
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-mono">BTC</span>
                  <span className="font-mono font-bold text-orange-400">
                    {formatPrice(prices.BTC || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono">ETH</span>
                  <span className="font-mono font-bold text-cyan-400">
                    {formatPrice(prices.ETH || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono">XLM</span>
                  <span className="font-mono font-bold text-green-400">
                    {formatPrice(prices.XLM || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </NeonCard>

        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <WalletGuard pageName="TRADING_DASHBOARD">
      <DashboardContent />
    </WalletGuard>
  )
}