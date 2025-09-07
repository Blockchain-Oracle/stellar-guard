"use client"

import { useState, useEffect } from "react"
import { NeonCard } from "@/components/neon-card"
import { CyberButton } from "@/components/cyber-button"
import { GlitchText } from "@/components/glitch-text"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Globe,
  RefreshCw,
  Clock,
  Zap,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react"
import { getCurrentPrice, getTWAPPrice, getCrossPrice, getOracleStats, getBatchPrices } from "@/services/oracle"
import toast from "react-hot-toast"

interface PriceData {
  asset: string
  symbol: string
  spotPrice: number
  twapPrice5: number
  twapPrice10: number
  change24h: number
  lastUpdate: Date
  source: 'crypto' | 'stellar' | 'forex'
}

// Note: XLM, USDC, USDT are actually in the External oracle, not Stellar oracle
// The Stellar oracle only has Stellar contract addresses, not symbols
const CRYPTO_ASSETS = ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'DOT', 'MATIC']
const STELLAR_ASSETS = ['XLM', 'USDC', 'USDT'] // These will use 'crypto' source
const FOREX_PAIRS = ['EUR', 'GBP', 'CHF', 'CAD'] // USD and JPY not available on testnet

export default function PricesPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cryptoPrices, setCryptoPrices] = useState<PriceData[]>([])
  const [stellarPrices, setStellarPrices] = useState<PriceData[]>([])
  const [forexPrices, setForexPrices] = useState<PriceData[]>([])
  const [selectedTab, setSelectedTab] = useState<'crypto' | 'stellar' | 'forex'>('crypto')
  const [oracleStatus, setOracleStatus] = useState<Record<string, any>>({})
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    loadAllPrices()
    
    if (autoRefresh) {
      const interval = setInterval(loadAllPrices, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadAllPrices = async () => {
    console.log('[loadAllPrices] Starting to load all prices...')
    setRefreshing(true)
    try {
      // Load prices from all three oracles in parallel
      // Note: STELLAR_ASSETS use 'crypto' source as they're in the External oracle
      const [cryptoData, stellarDataRaw, forexData] = await Promise.all([
        loadPricesForAssets(CRYPTO_ASSETS, 'crypto'),
        loadPricesForAssets(STELLAR_ASSETS, 'crypto'), // Use crypto source for XLM, USDC, USDT
        loadPricesForAssets(FOREX_PAIRS, 'forex')
      ])
      
      // Update stellar data to have correct source tag for display
      const stellarData = stellarDataRaw.map(item => ({ ...item, source: 'stellar' as const }))
      
      console.log('[loadAllPrices] All prices loaded:', {
        crypto: cryptoData,
        stellar: stellarData,
        forex: forexData
      })
      
      setCryptoPrices(cryptoData)
      setStellarPrices(stellarData)
      setForexPrices(forexData)
      
      // Load oracle statistics
      const [cryptoStats, stellarStats, forexStats] = await Promise.all([
        getOracleStats('crypto'),
        getOracleStats('stellar'),
        getOracleStats('forex')
      ])
      
      setOracleStatus({
        crypto: cryptoStats,
        stellar: stellarStats,
        forex: forexStats
      })
      
      setLoading(false)
    } catch (error) {
      console.error('Error loading prices:', error)
      toast.error('FAILED_TO_LOAD_PRICES', {
        style: {
          background: '#1a1a1a',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          fontFamily: 'monospace',
        },
      })
      setLoading(false)
    } finally {
      setRefreshing(false)
    }
  }

  const loadPricesForAssets = async (assets: string[], source: 'crypto' | 'stellar' | 'forex'): Promise<PriceData[]> => {
    console.log(`[loadPricesForAssets] Loading prices for ${source} assets:`, assets)
    const priceData: PriceData[] = []
    
    for (const asset of assets) {
      try {
        console.log(`[loadPricesForAssets] Fetching prices for ${asset} (${source})...`)
        const [spot, twap5, twap10] = await Promise.all([
          getCurrentPrice(asset, source),
          getTWAPPrice(asset, 5, source),
          getTWAPPrice(asset, 10, source)
        ])
        
        console.log(`[loadPricesForAssets] Results for ${asset}:`, {
          spot,
          twap5,
          twap10
        })
        
        // Calculate mock 24h change (in production, this would come from historical data)
        const change24h = (Math.random() - 0.5) * 20 // Random between -10% and +10%
        
        const data = {
          asset,
          symbol: asset,
          spotPrice: spot || 0,
          twapPrice5: twap5 || 0,
          twapPrice10: twap10 || 0,
          change24h,
          lastUpdate: new Date(),
          source
        }
        
        console.log(`[loadPricesForAssets] Price data for ${asset}:`, data)
        priceData.push(data)
      } catch (error) {
        console.error(`[loadPricesForAssets] Error loading price for ${asset}:`, error)
      }
    }
    
    console.log(`[loadPricesForAssets] Final price data for ${source}:`, priceData)
    return priceData
  }

  const formatPrice = (value: number, isForex: boolean = false): string => {
    if (value === 0) return '-'
    if (isForex) {
      return value.toFixed(4)
    }
    if (value < 0.01) {
      return `$${value.toFixed(6)}`
    }
    if (value < 1) {
      return `$${value.toFixed(4)}`
    }
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatChange = (change: number): JSX.Element => {
    const isPositive = change > 0
    const isNeutral = Math.abs(change) < 0.01
    
    return (
      <div className={`flex items-center gap-1 ${
        isNeutral ? 'text-gray-400' : isPositive ? 'text-green-400' : 'text-red-400'
      }`}>
        {isNeutral ? (
          <Minus className="h-3 w-3" />
        ) : isPositive ? (
          <ArrowUpRight className="h-3 w-3" />
        ) : (
          <ArrowDownRight className="h-3 w-3" />
        )}
        <span className="font-mono text-sm font-bold">
          {isPositive ? '+' : ''}{change.toFixed(2)}%
        </span>
      </div>
    )
  }

  const getCurrentPrices = () => {
    switch (selectedTab) {
      case 'crypto':
        return cryptoPrices
      case 'stellar':
        return stellarPrices
      case 'forex':
        return forexPrices
      default:
        return []
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlitchText text="LOADING_ORACLE_DATA..." className="text-2xl text-orange-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <GlitchText 
            text="ORACLE_PRICES" 
            className="text-3xl font-bold text-orange-500 font-mono"
          />
          <p className="text-gray-400 font-mono mt-2">
            [REFLECTOR_ORACLE_NETWORK.EXE]
          </p>
        </div>
        <div className="flex gap-3">
          <CyberButton
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "primary" : "secondary"}
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'AUTO_ON' : 'AUTO_OFF'}
          </CyberButton>
          <CyberButton 
            onClick={loadAllPrices} 
            variant="secondary"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            REFRESH
          </CyberButton>
        </div>
      </div>

      {/* Oracle Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NeonCard variant="orange">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Globe className="h-5 w-5 text-orange-400" />
              <Badge 
                variant={oracleStatus.crypto?.availability ? "default" : "destructive"}
                className="font-mono text-xs"
              >
                {oracleStatus.crypto?.availability ? "LIVE" : "OFFLINE"}
              </Badge>
            </div>
            <p className="font-mono font-bold text-orange-400">EXTERNAL_ORACLE</p>
            <p className="text-xs text-gray-400 font-mono mt-1">
              CEX/DEX Prices • {CRYPTO_ASSETS.length} assets
            </p>
          </div>
        </NeonCard>

        <NeonCard variant="cyan">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Zap className="h-5 w-5 text-cyan-400" />
              <Badge 
                variant={oracleStatus.stellar?.availability ? "default" : "destructive"}
                className="font-mono text-xs"
              >
                {oracleStatus.stellar?.availability ? "LIVE" : "OFFLINE"}
              </Badge>
            </div>
            <p className="font-mono font-bold text-cyan-400">STELLAR_ORACLE</p>
            <p className="text-xs text-gray-400 font-mono mt-1">
              Native Assets • {STELLAR_ASSETS.length} assets
            </p>
          </div>
        </NeonCard>

        <NeonCard variant="green">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-5 w-5 text-green-400" />
              <Badge 
                variant={oracleStatus.forex?.availability ? "default" : "destructive"}
                className="font-mono text-xs"
              >
                {oracleStatus.forex?.availability ? "LIVE" : "OFFLINE"}
              </Badge>
            </div>
            <p className="font-mono font-bold text-green-400">FOREX_ORACLE</p>
            <p className="text-xs text-gray-400 font-mono mt-1">
              Fiat Rates • {FOREX_PAIRS.length} pairs
            </p>
          </div>
        </NeonCard>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        <CyberButton
          onClick={() => setSelectedTab('crypto')}
          variant={selectedTab === 'crypto' ? 'primary' : 'secondary'}
          size="sm"
        >
          CRYPTO ({cryptoPrices.length})
        </CyberButton>
        <CyberButton
          onClick={() => setSelectedTab('stellar')}
          variant={selectedTab === 'stellar' ? 'primary' : 'secondary'}
          size="sm"
        >
          STELLAR ({stellarPrices.length})
        </CyberButton>
        <CyberButton
          onClick={() => setSelectedTab('forex')}
          variant={selectedTab === 'forex' ? 'primary' : 'secondary'}
          size="sm"
        >
          FOREX ({forexPrices.length})
        </CyberButton>
      </div>

      {/* Price Table */}
      <NeonCard>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-cyan-400 font-mono">
              LIVE_PRICE_FEED
            </h2>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-400 font-mono">
                Updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 font-mono text-gray-400 text-sm">ASSET</th>
                  <th className="text-right py-3 px-4 font-mono text-gray-400 text-sm">SPOT_PRICE</th>
                  <th className="text-right py-3 px-4 font-mono text-gray-400 text-sm">TWAP_5</th>
                  <th className="text-right py-3 px-4 font-mono text-gray-400 text-sm">TWAP_10</th>
                  <th className="text-center py-3 px-4 font-mono text-gray-400 text-sm">24H_CHANGE</th>
                  <th className="text-center py-3 px-4 font-mono text-gray-400 text-sm">SPREAD</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPrices().map((price) => {
                  const spread = price.spotPrice > 0 
                    ? ((price.twapPrice5 - price.spotPrice) / price.spotPrice * 100)
                    : 0
                  
                  return (
                    <tr key={price.asset} className="border-b border-gray-800 hover:bg-gray-900/50 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {price.symbol}
                          </Badge>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-mono font-bold text-white">
                        {formatPrice(price.spotPrice, selectedTab === 'forex')}
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-gray-400">
                        {formatPrice(price.twapPrice5, selectedTab === 'forex')}
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-gray-400">
                        {formatPrice(price.twapPrice10, selectedTab === 'forex')}
                      </td>
                      <td className="text-center py-3 px-4">
                        {formatChange(price.change24h)}
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className={`font-mono text-sm ${
                          Math.abs(spread) > 1 ? 'text-yellow-400' : 'text-gray-400'
                        }`}>
                          {spread.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </NeonCard>

      {/* Info Card */}
      <NeonCard variant="purple">
        <div className="p-6">
          <h3 className="text-lg font-bold text-purple-400 font-mono mb-3">
            ORACLE_INFORMATION
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400 font-mono mb-1">UPDATE_FREQUENCY</p>
              <p className="font-mono text-white">Every 5 minutes</p>
            </div>
            <div>
              <p className="text-gray-400 font-mono mb-1">DATA_RETENTION</p>
              <p className="font-mono text-white">24 hours</p>
            </div>
            <div>
              <p className="text-gray-400 font-mono mb-1">PRICE_PRECISION</p>
              <p className="font-mono text-white">18 decimals</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
            <p className="text-xs text-gray-400 font-mono">
              TWAP (Time-Weighted Average Price) provides more stable pricing by averaging 
              prices over multiple periods, reducing impact from temporary spikes or manipulation.
            </p>
          </div>
        </div>
      </NeonCard>
    </div>
  )
}