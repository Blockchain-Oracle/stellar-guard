"use client"

import { useState, useEffect } from "react"
import { NeonCard } from "@/components/neon-card"
import { GlitchText } from "@/components/glitch-text"
import { CyberButton } from "@/components/cyber-button"
import { Activity, TrendingUp, TrendingDown, AlertTriangle, DollarSign, RefreshCw } from "lucide-react"

export default function MonitorPage() {
  const [positions, setPositions] = useState([
    { id: 1, asset: "BTC", amount: 0.5, entry: 42000, current: 43500, pnl: 750, health: 1.8 },
    { id: 2, asset: "ETH", amount: 5, entry: 2800, current: 2950, pnl: 750, health: 2.1 },
    { id: 3, asset: "XLM", amount: 10000, entry: 0.12, current: 0.11, pnl: -100, health: 1.3 }
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <GlitchText 
            text="POSITION_MONITOR" 
            className="text-3xl font-bold text-orange-500 font-mono"
          />
          <p className="text-gray-400 font-mono mt-2">[REAL_TIME_POSITION_TRACKING.EXE]</p>
        </div>
        <CyberButton>
          <RefreshCw className="h-4 w-4 mr-2" />
          REFRESH
        </CyberButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NeonCard variant="green">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 font-mono">TOTAL_PNL</span>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-400 font-mono">+$1,400</div>
            <div className="text-sm text-gray-400 font-mono mt-2">+3.2% TODAY</div>
          </div>
        </NeonCard>

        <NeonCard variant="cyan">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 font-mono">AVG_HEALTH</span>
              <Activity className="h-5 w-5 text-cyan-500" />
            </div>
            <div className="text-2xl font-bold text-cyan-400 font-mono">1.73</div>
            <div className="text-sm text-gray-400 font-mono mt-2">SAFE_ZONE</div>
          </div>
        </NeonCard>

        <NeonCard variant="orange">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 font-mono">AT_RISK</span>
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-orange-400 font-mono">1</div>
            <div className="text-sm text-gray-400 font-mono mt-2">POSITION</div>
          </div>
        </NeonCard>
      </div>

      <NeonCard>
        <div className="p-6">
          <h2 className="text-xl font-bold text-cyan-400 font-mono mb-4">ACTIVE_POSITIONS</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 font-mono text-gray-400">ASSET</th>
                  <th className="text-right py-3 px-4 font-mono text-gray-400">AMOUNT</th>
                  <th className="text-right py-3 px-4 font-mono text-gray-400">ENTRY</th>
                  <th className="text-right py-3 px-4 font-mono text-gray-400">CURRENT</th>
                  <th className="text-right py-3 px-4 font-mono text-gray-400">PNL</th>
                  <th className="text-right py-3 px-4 font-mono text-gray-400">HEALTH</th>
                  <th className="text-center py-3 px-4 font-mono text-gray-400">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <tr key={position.id} className="border-b border-gray-800 hover:bg-gray-900/50 transition">
                    <td className="py-3 px-4 font-mono font-bold">{position.asset}</td>
                    <td className="text-right py-3 px-4 font-mono">{position.amount}</td>
                    <td className="text-right py-3 px-4 font-mono">${position.entry}</td>
                    <td className="text-right py-3 px-4 font-mono">${position.current}</td>
                    <td className={`text-right py-3 px-4 font-mono font-bold ${
                      position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {position.pnl >= 0 ? '+' : ''}{position.pnl}
                    </td>
                    <td className={`text-right py-3 px-4 font-mono font-bold ${
                      position.health > 1.5 ? 'text-green-400' : 
                      position.health > 1.2 ? 'text-yellow-400' : 
                      'text-red-400'
                    }`}>
                      {position.health.toFixed(2)}
                    </td>
                    <td className="text-center py-3 px-4">
                      <CyberButton size="sm">MANAGE</CyberButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </NeonCard>
    </div>
  )
}