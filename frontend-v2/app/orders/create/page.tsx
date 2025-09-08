"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { NeonCard } from "@/components/neon-card"
import { CyberButton } from "@/components/cyber-button"
import { GlitchText } from "@/components/glitch-text"
import { Badge } from "@/components/ui/badge"
import { 
  Shield, 
  ArrowLeft,
  Info,
  TrendingDown,
  TrendingUp,
  Activity,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { isWalletConnected, getPublicKey } from "@/lib/stellar"
import { getCurrentPrice, getTWAPPrice } from "@/services/oracle"
import { createStopLossOrder, OrderType } from "@/services/stop-loss"

const SUPPORTED_ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' as const },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto' as const },
  { symbol: 'XLM', name: 'Stellar', type: 'stellar' as const },
  { symbol: 'USDC', name: 'USD Coin', type: 'crypto' as const },
  { symbol: 'USDT', name: 'Tether', type: 'crypto' as const }
]

export default function CreateOrderPage() {
  const router = useRouter()
  const [walletAddress, setWalletAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [orderType, setOrderType] = useState<OrderType>(OrderType.StopLoss)
  const [selectedAsset, setSelectedAsset] = useState('BTC')
  const [assetType, setAssetType] = useState<'crypto' | 'stellar'>('crypto')
  const [amount, setAmount] = useState("")
  const [stopPrice, setStopPrice] = useState("")
  const [trailingPercent, setTrailingPercent] = useState("5")
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [twapPrice, setTwapPrice] = useState<number | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)

  useEffect(() => {
    checkConnection()
  }, [])

  useEffect(() => {
    if (selectedAsset) {
      loadPrices()
    }
  }, [selectedAsset, orderType])

  const checkConnection = async () => {
    const connected = await isWalletConnected()
    if (!connected) {
      router.push('/')
    } else {
      const address = await getPublicKey()
      setWalletAddress(address)
    }
  }

  const loadPrices = async () => {
    setPriceLoading(true)
    try {
      const asset = SUPPORTED_ASSETS.find(a => a.symbol === selectedAsset)
      const type = asset?.type || 'crypto'
      
      const [spotPrice, twap] = await Promise.all([
        getCurrentPrice(selectedAsset, type),
        getTWAPPrice(selectedAsset, 5, type)
      ])
      
      setCurrentPrice(spotPrice)
      setTwapPrice(twap)
      setAssetType(type)
    } catch (error) {
      console.error('Error loading prices:', error)
    } finally {
      setPriceLoading(false)
    }
  }

  const handleCreateOrder = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet first')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    // Check minimum amount (0.1 tokens with 7 decimals = 1_000_000)
    const amountNum = parseFloat(amount)
    if (amountNum < 0.1) {
      alert('Minimum amount is 0.1 tokens')
      return
    }

    if (orderType !== OrderType.TrailingStop && (!stopPrice || parseFloat(stopPrice) <= 0)) {
      alert('Please enter a valid stop price')
      return
    }

    setLoading(true)
    try {
      // Convert to contract units (7 decimals for both amount and price)
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, 7)))
      
      let stopPriceBigInt: bigint
      if (orderType === OrderType.TrailingStop) {
        // For trailing stop, pass percentage as a small number
        stopPriceBigInt = BigInt(trailingPercent)
      } else {
        stopPriceBigInt = BigInt(Math.floor(parseFloat(stopPrice) * Math.pow(10, 7)))
      }

      // Pass the asset symbol to the contract
      const orderId = await createStopLossOrder(
        walletAddress,
        selectedAsset, // Pass the asset symbol directly (e.g., "BTC", "ETH")
        amountBigInt,
        stopPriceBigInt,
        orderType
      )

      if (orderId) {
        alert(`Order created successfully! Order ID: ${orderId}`)
        router.push('/dashboard')
      } else {
        alert('Failed to create order. Please try again.')
      }
    } catch (error) {
      console.error('Error creating order:', error)
      alert('Failed to create order: ' + error)
    } finally {
      setLoading(false)
    }
  }

  const getSuggestedStopPrice = () => {
    if (!currentPrice) return ''
    
    switch (orderType) {
      case OrderType.StopLoss:
        return (currentPrice * 0.95).toFixed(2) // 5% below current
      case OrderType.TakeProfit:
        return (currentPrice * 1.05).toFixed(2) // 5% above current
      default:
        return ''
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <GlitchText 
            text="CREATE_ORDER" 
            className="text-3xl font-bold text-orange-500 font-mono"
          />
          <p className="text-gray-400 font-mono mt-2">
            [CONFIGURE_PROTECTION_PARAMETERS.EXE]
          </p>
        </div>
        <Link href="/dashboard">
          <CyberButton variant="secondary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            BACK
          </CyberButton>
        </Link>
      </div>

      {/* Order Type Selection */}
      <NeonCard>
        <div className="p-6">
          <h2 className="text-xl font-bold text-cyan-400 font-mono mb-4">
            SELECT_ORDER_TYPE
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => setOrderType(OrderType.StopLoss)}
              className={`p-4 rounded-lg border-2 transition-all ${
                orderType === OrderType.StopLoss 
                  ? 'border-orange-500 bg-orange-500/10' 
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <TrendingDown className="h-6 w-6 text-orange-400 mb-2" />
              <p className="font-mono font-bold">STOP_LOSS</p>
              <p className="text-xs text-gray-400 mt-1">Sell when price drops</p>
            </button>
            
            <button
              onClick={() => setOrderType(OrderType.TakeProfit)}
              className={`p-4 rounded-lg border-2 transition-all ${
                orderType === OrderType.TakeProfit 
                  ? 'border-green-500 bg-green-500/10' 
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <TrendingUp className="h-6 w-6 text-green-400 mb-2" />
              <p className="font-mono font-bold">TAKE_PROFIT</p>
              <p className="text-xs text-gray-400 mt-1">Sell when price rises</p>
            </button>
            
            <button
              onClick={() => setOrderType(OrderType.TrailingStop)}
              className={`p-4 rounded-lg border-2 transition-all ${
                orderType === OrderType.TrailingStop 
                  ? 'border-purple-500 bg-purple-500/10' 
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <Activity className="h-6 w-6 text-purple-400 mb-2" />
              <p className="font-mono font-bold">TRAILING_STOP</p>
              <p className="text-xs text-gray-400 mt-1">Dynamic stop level</p>
            </button>
          </div>
        </div>
      </NeonCard>

      {/* Asset and Amount */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NeonCard variant="cyan">
          <div className="p-6">
            <h3 className="text-lg font-bold text-cyan-400 font-mono mb-4">
              SELECT_ASSET
            </h3>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="w-full bg-gray-900 border border-cyan-500/30 rounded-lg px-4 py-3 font-mono text-white"
            >
              {SUPPORTED_ASSETS.map(asset => (
                <option key={asset.symbol} value={asset.symbol}>
                  {asset.symbol} - {asset.name}
                </option>
              ))}
            </select>
            
            {currentPrice && (
              <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400 font-mono">Current Price</span>
                  <span className="font-mono font-bold text-cyan-400">
                    ${currentPrice.toFixed(4)}
                  </span>
                </div>
                {twapPrice && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-400 font-mono">TWAP (5 periods)</span>
                    <span className="font-mono text-gray-300">
                      ${twapPrice.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </NeonCard>

        <NeonCard variant="orange">
          <div className="p-6">
            <h3 className="text-lg font-bold text-orange-400 font-mono mb-4">
              ENTER_AMOUNT
            </h3>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.10"
              min="0.1"
              step="0.01"
              className="w-full bg-gray-900 border border-orange-500/30 rounded-lg px-4 py-3 font-mono text-white"
            />
            <p className="text-xs text-gray-400 font-mono mt-2">
              Amount of {selectedAsset} to protect (minimum: 0.1)
            </p>
            
            {/* Quick amount buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setAmount("0.1")}
                className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded font-mono text-orange-400 border border-orange-500/30"
              >
                0.1
              </button>
              <button
                onClick={() => setAmount("1")}
                className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded font-mono text-orange-400 border border-orange-500/30"
              >
                1.0
              </button>
              <button
                onClick={() => setAmount("10")}
                className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded font-mono text-orange-400 border border-orange-500/30"
              >
                10
              </button>
              <button
                onClick={() => setAmount("100")}
                className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded font-mono text-orange-400 border border-orange-500/30"
              >
                100
              </button>
            </div>
            
            {amount && currentPrice && (
              <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400 font-mono">Position Value</span>
                  <span className="font-mono font-bold text-orange-400">
                    ${(parseFloat(amount) * currentPrice).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </NeonCard>
      </div>

      {/* Stop Price Configuration */}
      <NeonCard variant="green">
        <div className="p-6">
          <h3 className="text-lg font-bold text-green-400 font-mono mb-4">
            {orderType === OrderType.TrailingStop ? 'TRAILING_CONFIGURATION' : 'STOP_PRICE'}
          </h3>
          
          {orderType === OrderType.TrailingStop ? (
            <div>
              <label className="block text-sm text-gray-400 font-mono mb-2">
                Trailing Distance (%)
              </label>
              <input
                type="number"
                value={trailingPercent}
                onChange={(e) => setTrailingPercent(e.target.value)}
                min="1"
                max="50"
                className="w-full bg-gray-900 border border-green-500/30 rounded-lg px-4 py-3 font-mono text-white"
              />
              <p className="text-xs text-gray-400 font-mono mt-2">
                Stop will trail {trailingPercent}% below the highest price
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm text-gray-400 font-mono mb-2">
                {orderType === OrderType.StopLoss ? 'Stop Loss Price' : 'Take Profit Price'}
              </label>
              <input
                type="number"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                placeholder={getSuggestedStopPrice()}
                step="0.01"
                className="w-full bg-gray-900 border border-green-500/30 rounded-lg px-4 py-3 font-mono text-white"
              />
              
              {stopPrice && currentPrice && (
                <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400 font-mono">Distance from current</span>
                    <span className={`font-mono font-bold ${
                      orderType === OrderType.StopLoss 
                        ? parseFloat(stopPrice) < currentPrice ? 'text-green-400' : 'text-red-400'
                        : parseFloat(stopPrice) > currentPrice ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {((parseFloat(stopPrice) - currentPrice) / currentPrice * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}
              
              <button
                onClick={() => setStopPrice(getSuggestedStopPrice())}
                className="mt-3 text-xs text-green-400 hover:text-green-300 font-mono"
              >
                USE_SUGGESTED_PRICE ({getSuggestedStopPrice()})
              </button>
            </div>
          )}
        </div>
      </NeonCard>

      {/* Summary and Actions */}
      <NeonCard variant="purple">
        <div className="p-6">
          <h3 className="text-lg font-bold text-purple-400 font-mono mb-4">
            ORDER_SUMMARY
          </h3>
          
          <div className="space-y-2 mb-6">
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-gray-400 font-mono">Type</span>
              <Badge className="font-mono">{orderType.toUpperCase()}</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-gray-400 font-mono">Asset</span>
              <span className="font-mono">{selectedAsset}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-gray-400 font-mono">Amount</span>
              <span className="font-mono">{amount || '-'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-gray-400 font-mono">
                {orderType === OrderType.TrailingStop ? 'Trailing %' : 'Stop Price'}
              </span>
              <span className="font-mono">
                {orderType === OrderType.TrailingStop 
                  ? `${trailingPercent}%` 
                  : stopPrice ? `$${stopPrice}` : '-'}
              </span>
            </div>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mb-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-400 font-mono font-bold">IMPORTANT</p>
                <p className="text-xs text-gray-400 mt-1">
                  Orders are executed on-chain when price conditions are met. 
                  Ensure you have sufficient balance and gas fees.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <CyberButton 
              onClick={handleCreateOrder}
              disabled={loading || !amount || (orderType !== OrderType.TrailingStop && !stopPrice)}
              className="flex-1"
            >
              {loading ? 'CREATING...' : 'CREATE_ORDER'}
            </CyberButton>
            <Link href="/dashboard" className="flex-1">
              <CyberButton variant="secondary" className="w-full">
                CANCEL
              </CyberButton>
            </Link>
          </div>
        </div>
      </NeonCard>
    </div>
  )
}