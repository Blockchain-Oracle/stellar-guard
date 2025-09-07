"use client"

import { useState } from "react"
import { NeonCard } from "@/components/neon-card"
import { GlitchText } from "@/components/glitch-text"
import { CyberButton } from "@/components/cyber-button"
import { Settings, Bell, Globe, Palette, Database, Save } from "lucide-react"

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    orders: true,
    liquidation: true,
    rebalance: false,
    arbitrage: true
  })

  const [preferences, setPreferences] = useState({
    theme: "dark",
    language: "en",
    timezone: "UTC",
    displayCurrency: "USD"
  })

  return (
    <div className="space-y-6">
      <div>
        <GlitchText 
          text="SETTINGS_PANEL" 
          className="text-3xl font-bold text-orange-500 font-mono"
        />
        <p className="text-gray-400 font-mono mt-2">[CONFIGURE_YOUR_PREFERENCES.EXE]</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NeonCard variant="cyan">
          <div className="p-6">
            <h2 className="text-xl font-bold text-cyan-400 font-mono mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              NOTIFICATION_SETTINGS
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-white">Order Execution</p>
                  <p className="text-xs text-gray-400 font-mono">Notify when orders are triggered</p>
                </div>
                <button
                  onClick={() => setNotifications({...notifications, orders: !notifications.orders})}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notifications.orders ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    notifications.orders ? 'translate-x-6' : ''
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-white">Liquidation Warnings</p>
                  <p className="text-xs text-gray-400 font-mono">Alert when positions are at risk</p>
                </div>
                <button
                  onClick={() => setNotifications({...notifications, liquidation: !notifications.liquidation})}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notifications.liquidation ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    notifications.liquidation ? 'translate-x-6' : ''
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-white">Portfolio Rebalance</p>
                  <p className="text-xs text-gray-400 font-mono">Notify when rebalancing is needed</p>
                </div>
                <button
                  onClick={() => setNotifications({...notifications, rebalance: !notifications.rebalance})}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notifications.rebalance ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    notifications.rebalance ? 'translate-x-6' : ''
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-white">Arbitrage Opportunities</p>
                  <p className="text-xs text-gray-400 font-mono">Alert on profitable opportunities</p>
                </div>
                <button
                  onClick={() => setNotifications({...notifications, arbitrage: !notifications.arbitrage})}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notifications.arbitrage ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    notifications.arbitrage ? 'translate-x-6' : ''
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </NeonCard>

        <NeonCard variant="orange">
          <div className="p-6">
            <h2 className="text-xl font-bold text-orange-400 font-mono mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5" />
              GENERAL_PREFERENCES
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">THEME</label>
                <select 
                  value={preferences.theme}
                  onChange={(e) => setPreferences({...preferences, theme: e.target.value})}
                  className="w-full bg-gray-900 border border-orange-500/30 rounded-lg px-4 py-2 font-mono text-white"
                >
                  <option value="dark">DARK_MODE</option>
                  <option value="light">LIGHT_MODE</option>
                  <option value="auto">AUTO</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">LANGUAGE</label>
                <select 
                  value={preferences.language}
                  onChange={(e) => setPreferences({...preferences, language: e.target.value})}
                  className="w-full bg-gray-900 border border-orange-500/30 rounded-lg px-4 py-2 font-mono text-white"
                >
                  <option value="en">ENGLISH</option>
                  <option value="es">ESPAÑOL</option>
                  <option value="fr">FRANÇAIS</option>
                  <option value="de">DEUTSCH</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">TIMEZONE</label>
                <select 
                  value={preferences.timezone}
                  onChange={(e) => setPreferences({...preferences, timezone: e.target.value})}
                  className="w-full bg-gray-900 border border-orange-500/30 rounded-lg px-4 py-2 font-mono text-white"
                >
                  <option value="UTC">UTC</option>
                  <option value="EST">EST</option>
                  <option value="PST">PST</option>
                  <option value="CET">CET</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">DISPLAY_CURRENCY</label>
                <select 
                  value={preferences.displayCurrency}
                  onChange={(e) => setPreferences({...preferences, displayCurrency: e.target.value})}
                  className="w-full bg-gray-900 border border-orange-500/30 rounded-lg px-4 py-2 font-mono text-white"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="BTC">BTC</option>
                </select>
              </div>
            </div>
          </div>
        </NeonCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NeonCard variant="green">
          <div className="p-6">
            <h2 className="text-xl font-bold text-green-400 font-mono mb-4 flex items-center gap-2">
              <Database className="h-5 w-5" />
              DATA_MANAGEMENT
            </h2>
            <div className="space-y-3">
              <CyberButton className="w-full" variant="secondary">
                EXPORT_DATA
              </CyberButton>
              <CyberButton className="w-full" variant="secondary">
                CLEAR_CACHE
              </CyberButton>
              <CyberButton className="w-full" variant="destructive">
                RESET_SETTINGS
              </CyberButton>
            </div>
          </div>
        </NeonCard>

        <NeonCard variant="purple">
          <div className="p-6">
            <h2 className="text-xl font-bold text-purple-400 font-mono mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5" />
              INTERFACE_OPTIONS
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-white">Animations</span>
                <button className="relative w-12 h-6 rounded-full bg-green-500">
                  <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full translate-x-6" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-white">Sound Effects</span>
                <button className="relative w-12 h-6 rounded-full bg-gray-600">
                  <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-white">Compact Mode</span>
                <button className="relative w-12 h-6 rounded-full bg-gray-600">
                  <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full" />
                </button>
              </div>
            </div>
          </div>
        </NeonCard>
      </div>

      <div className="flex justify-end">
        <CyberButton size="lg">
          <Save className="h-5 w-5 mr-2" />
          SAVE_SETTINGS
        </CyberButton>
      </div>
    </div>
  )
}