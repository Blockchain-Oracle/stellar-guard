"use client"

import { useState } from "react"
import { NeonCard } from "@/components/neon-card"
import { GlitchText } from "@/components/glitch-text"
import { CyberButton } from "@/components/cyber-button"
import { Shield, Lock, Key, AlertTriangle, CheckCircle, XCircle } from "lucide-react"

export default function SecurityPage() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [whitelistEnabled, setWhitelistEnabled] = useState(true)
  const [autoLockEnabled, setAutoLockEnabled] = useState(true)

  const securityChecks = [
    { label: "Wallet Connected", status: true },
    { label: "2FA Enabled", status: twoFactorEnabled },
    { label: "Whitelist Active", status: whitelistEnabled },
    { label: "Auto-lock Enabled", status: autoLockEnabled },
    { label: "Latest Version", status: true },
    { label: "Secure Connection", status: true }
  ]

  const recentActivity = [
    { time: "2 min ago", action: "Login", ip: "192.168.1.1", status: "success" },
    { time: "1 hour ago", action: "Order Created", ip: "192.168.1.1", status: "success" },
    { time: "3 hours ago", action: "Settings Changed", ip: "192.168.1.1", status: "warning" },
    { time: "Yesterday", action: "Failed Login", ip: "89.23.45.67", status: "danger" }
  ]

  return (
    <div className="space-y-6">
      <div>
        <GlitchText 
          text="SECURITY_CENTER" 
          className="text-3xl font-bold text-orange-500 font-mono"
        />
        <p className="text-gray-400 font-mono mt-2">[PROTECT_YOUR_ASSETS.EXE]</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NeonCard variant="green">
          <div className="p-6">
            <h2 className="text-xl font-bold text-green-400 font-mono mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              SECURITY_STATUS
            </h2>
            <div className="space-y-3">
              {securityChecks.map((check, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-400 font-mono">{check.label}</span>
                  {check.status ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 p-3 bg-green-900/20 rounded-lg border border-green-500/30">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-green-400 font-mono font-bold">SECURITY_LEVEL: HIGH</span>
              </div>
            </div>
          </div>
        </NeonCard>

        <NeonCard variant="cyan">
          <div className="p-6">
            <h2 className="text-xl font-bold text-cyan-400 font-mono mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              SECURITY_SETTINGS
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-white">Two-Factor Authentication</p>
                  <p className="text-xs text-gray-400 font-mono">Extra layer of security</p>
                </div>
                <button
                  onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    twoFactorEnabled ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    twoFactorEnabled ? 'translate-x-6' : ''
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-white">Address Whitelist</p>
                  <p className="text-xs text-gray-400 font-mono">Only trade with approved addresses</p>
                </div>
                <button
                  onClick={() => setWhitelistEnabled(!whitelistEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    whitelistEnabled ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    whitelistEnabled ? 'translate-x-6' : ''
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-white">Auto-lock</p>
                  <p className="text-xs text-gray-400 font-mono">Lock after 5 minutes of inactivity</p>
                </div>
                <button
                  onClick={() => setAutoLockEnabled(!autoLockEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    autoLockEnabled ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    autoLockEnabled ? 'translate-x-6' : ''
                  }`} />
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <CyberButton className="w-full" variant="secondary">
                <Key className="h-4 w-4 mr-2" />
                CHANGE_PASSWORD
              </CyberButton>
              <CyberButton className="w-full" variant="destructive">
                REVOKE_ALL_SESSIONS
              </CyberButton>
            </div>
          </div>
        </NeonCard>
      </div>

      <NeonCard variant="orange">
        <div className="p-6">
          <h2 className="text-xl font-bold text-orange-400 font-mono mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            RECENT_ACTIVITY
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 px-4 font-mono text-gray-400 text-sm">TIME</th>
                  <th className="text-left py-2 px-4 font-mono text-gray-400 text-sm">ACTION</th>
                  <th className="text-left py-2 px-4 font-mono text-gray-400 text-sm">IP_ADDRESS</th>
                  <th className="text-left py-2 px-4 font-mono text-gray-400 text-sm">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((activity, index) => (
                  <tr key={index} className="border-b border-gray-800">
                    <td className="py-2 px-4 font-mono text-sm">{activity.time}</td>
                    <td className="py-2 px-4 font-mono text-sm">{activity.action}</td>
                    <td className="py-2 px-4 font-mono text-sm">{activity.ip}</td>
                    <td className="py-2 px-4">
                      <span className={`font-mono text-xs px-2 py-1 rounded ${
                        activity.status === 'success' ? 'bg-green-900/30 text-green-400' :
                        activity.status === 'warning' ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-red-900/30 text-red-400'
                      }`}>
                        {activity.status.toUpperCase()}
                      </span>
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