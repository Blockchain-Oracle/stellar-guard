"use client"

import { useState, useEffect } from "react"
import { NeonCard } from "@/components/neon-card"
import { CyberButton } from "@/components/cyber-button"
import { GlitchText } from "@/components/glitch-text"
import { Badge } from "@/components/ui/badge"
import { WalletGuard } from "@/components/wallet-guard"
import { 
  Shield, 
  Plus,
  Trash2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { isWalletConnected, getPublicKey } from "@/lib/stellar"
import { getUserOrders, cancelOrder, OrderType, StopLossOrder } from "@/services/stop-loss"
import { getCurrentPrice } from "@/services/oracle"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

function StopLossContent() {
  const [walletAddress, setWalletAddress] = useState("")
  const [orders, setOrders] = useState<StopLossOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cancellingOrder, setCancellingOrder] = useState<bigint | null>(null)
  const [prices, setPrices] = useState<Record<string, number>>({})

  useEffect(() => {
    loadWalletData()
  }, [])

  useEffect(() => {
    if (walletAddress) {
      loadOrders()
      // Refresh every 30 seconds
      const interval = setInterval(loadOrders, 30000)
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

  const loadOrders = async () => {
    setRefreshing(true)
    try {
      const userOrders = await getUserOrders(walletAddress)
      setOrders(userOrders)
      
      // Load current prices for comparison
      const [btcPrice, ethPrice, xlmPrice] = await Promise.all([
        getCurrentPrice('BTC', 'crypto'),
        getCurrentPrice('ETH', 'crypto'),
        getCurrentPrice('XLM', 'stellar')
      ])
      
      setPrices({
        BTC: btcPrice || 0,
        ETH: ethPrice || 0,
        XLM: xlmPrice || 0
      })
      
      setLoading(false)
    } catch (error) {
      console.error('Error loading orders:', error)
      setLoading(false)
    } finally {
      setRefreshing(false)
    }
  }

  const handleCancelOrder = async (orderId: bigint) => {
    setCancellingOrder(orderId)
    try {
      const success = await cancelOrder(walletAddress, orderId)
      if (success) {
        toast.success('ORDER_CANCELLED', {
          style: {
            background: '#1a1a1a',
            color: '#22c55e',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            fontFamily: 'monospace',
          },
        })
        await loadOrders()
      } else {
        toast.error('CANCELLATION_FAILED', {
          style: {
            background: '#1a1a1a',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontFamily: 'monospace',
          },
        })
      }
    } catch (error) {
      console.error('Error cancelling order:', error)
      toast.error('ERROR_CANCELLING_ORDER', {
        style: {
          background: '#1a1a1a',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          fontFamily: 'monospace',
        },
      })
    } finally {
      setCancellingOrder(null)
    }
  }

  const getOrderTypeIcon = (type: OrderType) => {
    switch (type) {
      case OrderType.StopLoss:
        return <TrendingDown className="h-4 w-4 text-red-400" />
      case OrderType.TakeProfit:
        return <TrendingUp className="h-4 w-4 text-green-400" />
      case OrderType.TrailingStop:
        return <Activity className="h-4 w-4 text-purple-400" />
      default:
        return <Shield className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4 text-cyan-400" />
      case 'executed':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-400" />
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />
    }
  }

  const formatPrice = (value: number): string => {
    if (value === 0) return '-'
    if (value < 1) {
      return `$${value.toFixed(4)}`
    }
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlitchText text="LOADING_ORDERS..." className="text-2xl text-orange-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <GlitchText 
            text="STOP_LOSS_ORDERS" 
            className="text-3xl font-bold text-orange-500 font-mono"
          />
          <p className="text-gray-400 font-mono mt-2">
            [AUTOMATED_PROTECTION_SYSTEM.EXE]
          </p>
        </div>
        <div className="flex gap-3">
          <CyberButton 
            onClick={loadOrders} 
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

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <NeonCard variant="orange">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Shield className="h-5 w-5 text-orange-400" />
              <Badge className="font-mono text-xs">TOTAL</Badge>
            </div>
            <div className="text-2xl font-bold font-mono text-orange-400">
              {orders.length}
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1">
              TOTAL_ORDERS
            </p>
          </div>
        </NeonCard>

        <NeonCard variant="cyan">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-cyan-400" />
              <Badge className="font-mono text-xs">ACTIVE</Badge>
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-400">
              {orders.filter(o => o.status === 'active').length}
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1">
              MONITORING
            </p>
          </div>
        </NeonCard>

        <NeonCard variant="green">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <Badge className="font-mono text-xs">SUCCESS</Badge>
            </div>
            <div className="text-2xl font-bold font-mono text-green-400">
              {orders.filter(o => o.status === 'executed').length}
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1">
              EXECUTED
            </p>
          </div>
        </NeonCard>

        <NeonCard variant="purple">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-5 w-5 text-purple-400" />
              <Badge className="font-mono text-xs">TYPES</Badge>
            </div>
            <div className="text-2xl font-bold font-mono text-purple-400">
              {new Set(orders.map(o => o.orderType)).size}
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1">
              STRATEGIES
            </p>
          </div>
        </NeonCard>
      </div>

      {/* Orders Table */}
      <NeonCard>
        <div className="p-6">
          <h2 className="text-xl font-bold text-cyan-400 font-mono mb-4">
            YOUR_ORDERS
          </h2>
          
          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 font-mono text-gray-400 text-sm">ID</th>
                    <th className="text-left py-3 px-4 font-mono text-gray-400 text-sm">TYPE</th>
                    <th className="text-right py-3 px-4 font-mono text-gray-400 text-sm">AMOUNT</th>
                    <th className="text-right py-3 px-4 font-mono text-gray-400 text-sm">STOP_PRICE</th>
                    <th className="text-center py-3 px-4 font-mono text-gray-400 text-sm">STATUS</th>
                    <th className="text-left py-3 px-4 font-mono text-gray-400 text-sm">CREATED</th>
                    <th className="text-center py-3 px-4 font-mono text-gray-400 text-sm">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id.toString()} className="border-b border-gray-800 hover:bg-gray-900/50 transition">
                      <td className="py-3 px-4 font-mono text-sm">
                        #{order.id.toString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getOrderTypeIcon(order.orderType)}
                          <span className="font-mono text-sm">
                            {order.orderType.toUpperCase().replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-sm">
                        {(Number(order.amount) / Math.pow(10, 7)).toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-sm">
                        {formatPrice(Number(order.stopPrice) / Math.pow(10, 18))}
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {getStatusIcon(order.status)}
                          <Badge 
                            variant={order.status === 'active' ? 'default' : 'secondary'}
                            className="font-mono text-xs"
                          >
                            {order.status.toUpperCase()}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-400">
                        {new Date(order.createdAt * 1000).toLocaleDateString()}
                      </td>
                      <td className="text-center py-3 px-4">
                        {order.status === 'active' && (
                          <CyberButton
                            size="sm"
                            variant="danger"
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={cancellingOrder === order.id}
                          >
                            {cancellingOrder === order.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </CyberButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Shield className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 font-mono text-lg mb-2">NO_ORDERS_FOUND</p>
              <p className="text-gray-500 text-sm mb-6">
                Create your first stop-loss order to protect your positions
              </p>
              <Link href="/orders/create">
                <CyberButton>
                  <Plus className="h-4 w-4 mr-2" />
                  CREATE_FIRST_ORDER
                </CyberButton>
              </Link>
            </div>
          )}
        </div>
      </NeonCard>
    </div>
  )
}

export default function StopLossPage() {
  return (
    <WalletGuard pageName="STOP_LOSS_ORDERS">
      <StopLossContent />
    </WalletGuard>
  )
}