"use client"

import { useState, useEffect } from "react"
import { NeonCard } from "@/components/neon-card"
import { CyberButton } from "@/components/cyber-button"
import { GlitchText } from "@/components/glitch-text"
import { Badge } from "@/components/ui/badge"
import { WalletGuard } from "@/components/wallet-guard"
import { 
  BarChart3,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  PieChart,
  Target,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign
} from "lucide-react"
import { isWalletConnected, getPublicKey } from "@/lib/stellar"
import { getCurrentPrice, getBatchPrices } from "@/services/oracle"
import { getUserOrders } from "@/services/stop-loss"
import { getUserBalances, calculatePortfolioStats, PortfolioAsset } from "@/services/portfolio"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

interface PortfolioPosition {
  asset: string
  amount: number
  value: number
  targetPercent: number
  currentPercent: number
  price: number
  issuer?: string
}

function PortfolioContent() {
  const [walletAddress, setWalletAddress] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [positions, setPositions] = useState<PortfolioPosition[]>([])
  const [totalValue, setTotalValue] = useState(0)
  const [rebalanceThreshold, setRebalanceThreshold] = useState("5") // 5% threshold
  const [needsRebalance, setNeedsRebalance] = useState(false)

  useEffect(() => {
    loadWalletData()
  }, [])

  useEffect(() => {
    if (walletAddress) {
      loadPortfolio()
      // Refresh every minute
      const interval = setInterval(loadPortfolio, 60000)
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

  const loadPortfolio = async () => {
    setRefreshing(true)
    try {
      // Get real user balances from Stellar
      const balances = await getUserBalances(walletAddress)
      
      // Calculate portfolio stats
      const stats = calculatePortfolioStats(balances)
      setTotalValue(stats.totalValue)
      
      // Define default target allocations (user could customize these)
      const defaultTargets: Record<string, number> = {
        'XLM': 30,
        'USDC': 20,
        'USDT': 20,
        'BTC': 15,
        'ETH': 15
      }
      
      // Convert balances to portfolio positions
      const portfolioPositions: PortfolioPosition[] = balances.map(balance => {
        const currentPercent = stats.totalValue > 0 ? (balance.value / stats.totalValue) * 100 : 0
        const targetPercent = defaultTargets[balance.asset] || (100 / balances.length)
        
        return {
          asset: balance.asset,
          amount: balance.amount,
          value: balance.value,
          targetPercent,
          currentPercent,
          price: balance.price,
          issuer: balance.issuer
        }
      })
      
      // Check if rebalancing is needed
      let maxDeviation = 0
      portfolioPositions.forEach(pos => {
        const deviation = Math.abs(pos.currentPercent - pos.targetPercent)
        maxDeviation = Math.max(maxDeviation, deviation)
      })
      
      setPositions(portfolioPositions)
      setNeedsRebalance(maxDeviation > parseFloat(rebalanceThreshold))
      setLoading(false)
    } catch (error) {
      console.error('Error loading portfolio:', error)
      // If error, show empty portfolio
      setPositions([])
      setTotalValue(0)
      setLoading(false)
    } finally {
      setRefreshing(false)
    }
  }

  const handleRebalance = async () => {
    toast.success('ANALYZING_REBALANCE_NEEDS', {
      style: {
        background: '#1a1a1a',
        color: '#22c55e',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        fontFamily: 'monospace',
      },
    })
    
    // Calculate rebalance trades needed
    const trades = positions.map(pos => {
      const targetValue = (totalValue * pos.targetPercent) / 100
      const currentValue = pos.value
      const difference = targetValue - currentValue
      const amountChange = pos.price > 0 ? difference / pos.price : 0
      
      return {
        asset: pos.asset,
        action: difference > 0 ? 'BUY' : 'SELL',
        amount: Math.abs(amountChange),
        value: Math.abs(difference)
      }
    }).filter(trade => trade.value > 10) // Filter out small trades
    
    console.log('Rebalance trades needed:', trades)
    
    // In production, this would execute actual trades
    toast.success(`${trades.length} TRADES_REQUIRED_FOR_REBALANCE`, {
      style: {
        background: '#1a1a1a',
        color: '#fbbf24',
        border: '1px solid rgba(251, 191, 36, 0.3)',
        fontFamily: 'monospace',
      },
    })
  }

  const formatPrice = (value: number): string => {
    if (value === 0) return '$0'
    if (value < 1) {
      return `$${value.toFixed(4)}`
    }
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlitchText text="LOADING_PORTFOLIO_DATA..." className="text-2xl text-orange-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <GlitchText 
            text="PORTFOLIO_MANAGER" 
            className="text-3xl font-bold text-orange-500 font-mono"
          />
          <p className="text-gray-400 font-mono mt-2">
            [ASSET_ALLOCATION_OPTIMIZER.EXE]
          </p>
        </div>
        <div className="flex gap-3">
          <CyberButton 
            onClick={loadPortfolio} 
            variant="secondary"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            REFRESH
          </CyberButton>
          <CyberButton 
            onClick={handleRebalance}
            variant={needsRebalance ? "primary" : "secondary"}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            REBALANCE
          </CyberButton>
        </div>
      </div>

      {/* Portfolio Value */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NeonCard variant="green">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="h-5 w-5 text-green-400" />
              <Badge className="font-mono text-xs">TOTAL</Badge>
            </div>
            <div className="text-3xl font-bold font-mono text-green-400">
              {formatPrice(totalValue)}
            </div>
            <p className="text-sm text-gray-400 font-mono mt-2">
              PORTFOLIO_VALUE
            </p>
          </div>
        </NeonCard>

        <NeonCard variant="cyan">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <PieChart className="h-5 w-5 text-cyan-400" />
              <Badge className="font-mono text-xs">ASSETS</Badge>
            </div>
            <div className="text-3xl font-bold font-mono text-cyan-400">
              {positions.length}
            </div>
            <p className="text-sm text-gray-400 font-mono mt-2">
              POSITIONS
            </p>
          </div>
        </NeonCard>

        <NeonCard variant={needsRebalance ? "orange" : "purple"}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              {needsRebalance ? (
                <AlertTriangle className="h-5 w-5 text-orange-400" />
              ) : (
                <Target className="h-5 w-5 text-purple-400" />
              )}
              <Badge 
                variant={needsRebalance ? "destructive" : "default"}
                className="font-mono text-xs"
              >
                {needsRebalance ? "ACTION" : "BALANCED"}
              </Badge>
            </div>
            <div className={`text-3xl font-bold font-mono ${needsRebalance ? 'text-orange-400' : 'text-purple-400'}`}>
              {needsRebalance ? "REBALANCE" : "OPTIMAL"}
            </div>
            <p className="text-sm text-gray-400 font-mono mt-2">
              PORTFOLIO_STATUS
            </p>
          </div>
        </NeonCard>
      </div>

      {/* Positions Table */}
      <NeonCard>
        <div className="p-6">
          <h2 className="text-xl font-bold text-cyan-400 font-mono mb-4">
            CURRENT_POSITIONS
          </h2>
          
          {positions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 font-mono text-gray-400 text-sm">ASSET</th>
                    <th className="text-right py-3 px-4 font-mono text-gray-400 text-sm">AMOUNT</th>
                    <th className="text-right py-3 px-4 font-mono text-gray-400 text-sm">PRICE</th>
                    <th className="text-right py-3 px-4 font-mono text-gray-400 text-sm">VALUE</th>
                    <th className="text-center py-3 px-4 font-mono text-gray-400 text-sm">CURRENT_%</th>
                    <th className="text-center py-3 px-4 font-mono text-gray-400 text-sm">TARGET_%</th>
                    <th className="text-center py-3 px-4 font-mono text-gray-400 text-sm">DEVIATION</th>
                  </tr>
                </thead>
                <tbody>
                {positions.map((position) => {
                  const deviation = position.currentPercent - position.targetPercent
                  const isOverweight = deviation > parseFloat(rebalanceThreshold)
                  const isUnderweight = deviation < -parseFloat(rebalanceThreshold)
                  
                  return (
                    <tr key={position.asset} className="border-b border-gray-800 hover:bg-gray-900/50 transition">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold">{position.asset}</span>
                      </td>
                      <td className="text-right py-3 px-4 font-mono">
                        {position.amount.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-4 font-mono">
                        {formatPrice(position.price)}
                      </td>
                      <td className="text-right py-3 px-4 font-mono font-bold">
                        {formatPrice(position.value)}
                      </td>
                      <td className="text-center py-3 px-4">
                        <Badge variant="outline" className="font-mono">
                          {formatPercent(position.currentPercent)}
                        </Badge>
                      </td>
                      <td className="text-center py-3 px-4">
                        <Badge variant="secondary" className="font-mono">
                          {formatPercent(position.targetPercent)}
                        </Badge>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          {isOverweight && <ArrowUpRight className="h-4 w-4 text-red-400" />}
                          {isUnderweight && <ArrowDownRight className="h-4 w-4 text-yellow-400" />}
                          <span className={`font-mono text-sm font-bold ${
                            isOverweight ? 'text-red-400' : 
                            isUnderweight ? 'text-yellow-400' : 
                            'text-green-400'
                          }`}>
                            {deviation >= 0 ? '+' : ''}{formatPercent(deviation)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          ) : (
            <div className="text-center py-12">
              <PieChart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 font-mono text-lg mb-2">NO_ASSETS_FOUND</p>
              <p className="text-gray-500 text-sm mb-6">
                Your wallet doesn't have any assets yet
              </p>
              <p className="text-gray-500 text-xs font-mono">
                Fund your wallet to see your portfolio
              </p>
            </div>
          )}
        </div>
      </NeonCard>

      {/* Rebalance Settings */}
      <NeonCard variant="purple">
        <div className="p-6">
          <h2 className="text-xl font-bold text-purple-400 font-mono mb-4">
            REBALANCE_SETTINGS
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-400 font-mono mb-2">
                REBALANCE_THRESHOLD (%)
              </label>
              <input
                type="number"
                value={rebalanceThreshold}
                onChange={(e) => setRebalanceThreshold(e.target.value)}
                min="1"
                max="20"
                className="w-full bg-gray-900 border border-purple-500/30 rounded-lg px-4 py-2 font-mono text-white"
              />
              <p className="text-xs text-gray-500 font-mono mt-2">
                Trigger rebalance when any position deviates by this percentage
              </p>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 font-mono mb-2">
                REBALANCE_FREQUENCY
              </label>
              <select className="w-full bg-gray-900 border border-purple-500/30 rounded-lg px-4 py-2 font-mono text-white">
                <option value="manual">MANUAL</option>
                <option value="daily">DAILY</option>
                <option value="weekly">WEEKLY</option>
                <option value="monthly">MONTHLY</option>
              </select>
              <p className="text-xs text-gray-500 font-mono mt-2">
                How often to check and execute rebalancing
              </p>
            </div>
          </div>
        </div>
      </NeonCard>
    </div>
  )
}

export default function PortfolioPage() {
  return (
    <WalletGuard pageName="PORTFOLIO_MANAGER">
      <PortfolioContent />
    </WalletGuard>
  )
}