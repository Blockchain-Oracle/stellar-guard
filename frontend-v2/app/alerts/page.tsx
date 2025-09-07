"use client"

import { useState, useEffect } from "react"
import { NeonCard } from "@/components/neon-card"
import { CyberButton } from "@/components/cyber-button"
import { GlitchText } from "@/components/glitch-text"
import { Badge } from "@/components/ui/badge"
import { WalletGuard } from "@/components/wallet-guard"
import { TelegramSubscription } from "@/components/telegram-subscription"
import { 
  AlertTriangle,
  Bell,
  BellOff,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Shield,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Info
} from "lucide-react"
import { isWalletConnected, getPublicKey } from "@/lib/stellar"
import { getCurrentPrice, checkStablecoinPeg, getCrossPrice } from "@/services/oracle"
import { sendTelegramAlert } from "@/services/telegram"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

interface Alert {
  id: string
  type: 'price_above' | 'price_below' | 'volatility' | 'stablecoin_peg' | 'arbitrage'
  asset: string
  condition: string
  threshold: number
  currentValue: number
  triggered: boolean
  enabled: boolean
  createdAt: Date
  triggeredAt?: Date
}

function AlertsContent() {
  const [walletAddress, setWalletAddress] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // New alert form state
  const [newAlertType, setNewAlertType] = useState<Alert['type']>('price_above')
  const [newAlertAsset, setNewAlertAsset] = useState('BTC')
  const [newAlertThreshold, setNewAlertThreshold] = useState('')

  useEffect(() => {
    loadWalletData()
  }, [])

  useEffect(() => {
    if (walletAddress) {
      loadAlerts()
      // Check alerts every 30 seconds
      const interval = setInterval(checkAlerts, 30000)
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

  const loadAlerts = () => {
    // Load alerts from localStorage (in production, this would be from a backend)
    const savedAlerts = localStorage.getItem(`alerts_${walletAddress}`)
    if (savedAlerts) {
      setAlerts(JSON.parse(savedAlerts).map((a: any) => ({
        ...a,
        createdAt: new Date(a.createdAt),
        triggeredAt: a.triggeredAt ? new Date(a.triggeredAt) : undefined
      })))
    } else {
      // Create default alerts
      const defaultAlerts: Alert[] = [
        {
          id: '1',
          type: 'price_above',
          asset: 'BTC',
          condition: 'BTC > $50,000',
          threshold: 50000,
          currentValue: 0,
          triggered: false,
          enabled: true,
          createdAt: new Date()
        },
        {
          id: '2',
          type: 'price_below',
          asset: 'ETH',
          condition: 'ETH < $2,000',
          threshold: 2000,
          currentValue: 0,
          triggered: false,
          enabled: true,
          createdAt: new Date()
        },
        {
          id: '3',
          type: 'stablecoin_peg',
          asset: 'USDC',
          condition: 'USDC peg deviation > 1%',
          threshold: 100, // basis points
          currentValue: 0,
          triggered: false,
          enabled: true,
          createdAt: new Date()
        }
      ]
      setAlerts(defaultAlerts)
      saveAlerts(defaultAlerts)
    }
    setLoading(false)
  }

  const saveAlerts = (alertsToSave: Alert[]) => {
    localStorage.setItem(`alerts_${walletAddress}`, JSON.stringify(alertsToSave))
  }

  const checkAlerts = async () => {
    setRefreshing(true)
    try {
      const updatedAlerts = [...alerts]
      
      for (const alert of updatedAlerts) {
        if (!alert.enabled) continue
        
        let currentValue = 0
        let shouldTrigger = false
        
        switch (alert.type) {
          case 'price_above':
          case 'price_below':
            const price = await getCurrentPrice(alert.asset, 'crypto')
            currentValue = price || 0
            if (alert.type === 'price_above') {
              shouldTrigger = currentValue > alert.threshold
            } else {
              shouldTrigger = currentValue < alert.threshold && currentValue > 0
            }
            break
            
          case 'stablecoin_peg':
            const deviation = await checkStablecoinPeg(alert.asset)
            currentValue = Math.abs(deviation || 0)
            shouldTrigger = currentValue > alert.threshold
            break
            
          case 'arbitrage':
            // Check cross-exchange price difference
            const crossPrice = await getCrossPrice(alert.asset, 'USDC')
            const spotPrice = await getCurrentPrice(alert.asset, 'crypto')
            if (crossPrice && spotPrice) {
              currentValue = Math.abs((crossPrice - spotPrice) / spotPrice * 10000) // basis points
              shouldTrigger = currentValue > alert.threshold
            }
            break
        }
        
        alert.currentValue = currentValue
        
        // Trigger alert if conditions met and not already triggered
        if (shouldTrigger && !alert.triggered) {
          alert.triggered = true
          alert.triggeredAt = new Date()
          
          // Show toast notification
          toast.success(`ALERT_TRIGGERED: ${alert.condition}`, {
            style: {
              background: '#1a1a1a',
              color: '#fbbf24',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              fontFamily: 'monospace',
            },
            duration: 5000,
          })
          
          // Send Telegram notification
          await sendTelegramAlert({
            type: alert.type,
            asset: alert.asset,
            threshold: alert.threshold,
            currentValue: alert.currentValue,
            message: alert.condition,
          })
        } else if (!shouldTrigger && alert.triggered) {
          // Reset if condition no longer met
          alert.triggered = false
          alert.triggeredAt = undefined
        }
      }
      
      setAlerts(updatedAlerts)
      saveAlerts(updatedAlerts)
    } catch (error) {
      console.error('Error checking alerts:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const createAlert = () => {
    if (!newAlertThreshold) {
      toast.error('Please enter a threshold value')
      return
    }
    
    const newAlert: Alert = {
      id: Date.now().toString(),
      type: newAlertType,
      asset: newAlertAsset,
      condition: generateConditionText(newAlertType, newAlertAsset, parseFloat(newAlertThreshold)),
      threshold: parseFloat(newAlertThreshold),
      currentValue: 0,
      triggered: false,
      enabled: true,
      createdAt: new Date()
    }
    
    const updatedAlerts = [...alerts, newAlert]
    setAlerts(updatedAlerts)
    saveAlerts(updatedAlerts)
    
    setShowCreateModal(false)
    setNewAlertThreshold('')
    
    toast.success('ALERT_CREATED', {
      style: {
        background: '#1a1a1a',
        color: '#22c55e',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        fontFamily: 'monospace',
      },
    })
  }

  const generateConditionText = (type: Alert['type'], asset: string, threshold: number): string => {
    switch (type) {
      case 'price_above':
        return `${asset} > $${threshold.toLocaleString()}`
      case 'price_below':
        return `${asset} < $${threshold.toLocaleString()}`
      case 'stablecoin_peg':
        return `${asset} peg deviation > ${threshold / 100}%`
      case 'arbitrage':
        return `${asset} arbitrage > ${threshold / 100}%`
      case 'volatility':
        return `${asset} volatility > ${threshold}%`
      default:
        return ''
    }
  }

  const toggleAlert = (alertId: string) => {
    const updatedAlerts = alerts.map(a => 
      a.id === alertId ? { ...a, enabled: !a.enabled } : a
    )
    setAlerts(updatedAlerts)
    saveAlerts(updatedAlerts)
  }

  const deleteAlert = (alertId: string) => {
    const updatedAlerts = alerts.filter(a => a.id !== alertId)
    setAlerts(updatedAlerts)
    saveAlerts(updatedAlerts)
    
    toast.success('ALERT_DELETED', {
      style: {
        background: '#1a1a1a',
        color: '#ef4444',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        fontFamily: 'monospace',
      },
    })
  }

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'price_above':
        return <TrendingUp className="h-4 w-4 text-green-400" />
      case 'price_below':
        return <TrendingDown className="h-4 w-4 text-red-400" />
      case 'stablecoin_peg':
        return <Shield className="h-4 w-4 text-yellow-400" />
      case 'arbitrage':
        return <DollarSign className="h-4 w-4 text-purple-400" />
      case 'volatility':
        return <Activity className="h-4 w-4 text-orange-400" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlitchText text="LOADING_ALERTS..." className="text-2xl text-orange-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <GlitchText 
            text="PRICE_ALERTS" 
            className="text-3xl font-bold text-orange-500 font-mono"
          />
          <p className="text-gray-400 font-mono mt-2">
            [MARKET_MONITORING_SYSTEM.EXE]
          </p>
        </div>
        <div className="flex gap-3">
          <CyberButton 
            onClick={checkAlerts} 
            variant="secondary"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            CHECK_NOW
          </CyberButton>
          <CyberButton onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            NEW_ALERT
          </CyberButton>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <NeonCard variant="orange">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Bell className="h-5 w-5 text-orange-400" />
              <Badge className="font-mono text-xs">TOTAL</Badge>
            </div>
            <div className="text-2xl font-bold font-mono text-orange-400">
              {alerts.length}
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1">
              CONFIGURED
            </p>
          </div>
        </NeonCard>

        <NeonCard variant="cyan">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-5 w-5 text-cyan-400" />
              <Badge className="font-mono text-xs">ACTIVE</Badge>
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-400">
              {alerts.filter(a => a.enabled).length}
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1">
              MONITORING
            </p>
          </div>
        </NeonCard>

        <NeonCard variant="yellow">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <Badge className="font-mono text-xs">TRIGGERED</Badge>
            </div>
            <div className="text-2xl font-bold font-mono text-yellow-400">
              {alerts.filter(a => a.triggered).length}
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1">
              ALERTS
            </p>
          </div>
        </NeonCard>

        <NeonCard variant="green">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-5 w-5 text-green-400" />
              <Badge className="font-mono text-xs">UPDATE</Badge>
            </div>
            <div className="text-2xl font-bold font-mono text-green-400">
              30s
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1">
              FREQUENCY
            </p>
          </div>
        </NeonCard>
      </div>

      {/* Alerts List */}
      <NeonCard>
        <div className="p-6">
          <h2 className="text-xl font-bold text-cyan-400 font-mono mb-4">
            ACTIVE_ALERTS
          </h2>
          
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-4 rounded-lg border ${
                    alert.triggered 
                      ? 'bg-yellow-900/20 border-yellow-500/30' 
                      : 'bg-gray-900/50 border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getAlertIcon(alert.type)}
                      <div>
                        <p className="font-mono font-bold">
                          {alert.condition}
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-1">
                          Current: ${alert.currentValue.toFixed(alert.type === 'stablecoin_peg' ? 2 : 4)}
                          {alert.triggeredAt && (
                            <span className="ml-2">
                              • Triggered: {alert.triggeredAt.toLocaleTimeString()}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {alert.triggered && (
                        <Badge variant="destructive" className="font-mono text-xs">
                          TRIGGERED
                        </Badge>
                      )}
                      <button
                        onClick={() => toggleAlert(alert.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          alert.enabled 
                            ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' 
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {alert.enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => deleteAlert(alert.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 font-mono text-lg mb-2">NO_ALERTS_CONFIGURED</p>
              <p className="text-gray-500 text-sm mb-6">
                Set up price alerts to monitor market conditions
              </p>
              <CyberButton onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                CREATE_FIRST_ALERT
              </CyberButton>
            </div>
          )}
        </div>
      </NeonCard>

      {/* Telegram Subscription */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Empty space for balance */}
        </div>
        <div>
          <TelegramSubscription />
        </div>
      </div>

      {/* Create Alert Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <NeonCard className="w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-bold text-orange-400 font-mono mb-4">
                CREATE_NEW_ALERT
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 font-mono mb-2">
                    ALERT_TYPE
                  </label>
                  <select
                    value={newAlertType}
                    onChange={(e) => setNewAlertType(e.target.value as Alert['type'])}
                    className="w-full bg-gray-900 border border-orange-500/30 rounded-lg px-4 py-2 font-mono text-white"
                  >
                    <option value="price_above">Price Above</option>
                    <option value="price_below">Price Below</option>
                    <option value="stablecoin_peg">Stablecoin Peg</option>
                    <option value="arbitrage">Arbitrage Opportunity</option>
                    <option value="volatility">High Volatility</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 font-mono mb-2">
                    ASSET
                  </label>
                  <select
                    value={newAlertAsset}
                    onChange={(e) => setNewAlertAsset(e.target.value)}
                    className="w-full bg-gray-900 border border-orange-500/30 rounded-lg px-4 py-2 font-mono text-white"
                  >
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                    <option value="XLM">XLM</option>
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 font-mono mb-2">
                    THRESHOLD
                  </label>
                  <input
                    type="number"
                    value={newAlertThreshold}
                    onChange={(e) => setNewAlertThreshold(e.target.value)}
                    placeholder={
                      newAlertType === 'stablecoin_peg' || newAlertType === 'arbitrage' 
                        ? "Basis points (100 = 1%)" 
                        : "Price in USD"
                    }
                    className="w-full bg-gray-900 border border-orange-500/30 rounded-lg px-4 py-2 font-mono text-white"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <CyberButton onClick={createAlert} className="flex-1">
                  CREATE
                </CyberButton>
                <CyberButton 
                  onClick={() => setShowCreateModal(false)} 
                  variant="secondary"
                  className="flex-1"
                >
                  CANCEL
                </CyberButton>
              </div>
            </div>
          </NeonCard>
        </div>
      )}
    </div>
  )
}

export default function AlertsPage() {
  return (
    <WalletGuard pageName="PRICE_ALERTS">
      <AlertsContent />
    </WalletGuard>
  )
}