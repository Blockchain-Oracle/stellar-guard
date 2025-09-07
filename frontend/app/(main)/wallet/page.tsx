"use client"

import { useState } from "react"
import { NeonCard } from "@/components/neon-card"
import { GlitchText } from "@/components/glitch-text"
import { CyberButton } from "@/components/cyber-button"
import { Wallet, Send, Download, ArrowUpRight, ArrowDownRight, Copy } from "lucide-react"

export default function WalletPage() {
  const [selectedAsset, setSelectedAsset] = useState("XLM")
  const walletAddress = "GBXG...4QWE"
  
  const balances = [
    { asset: "XLM", amount: "5,234.56", value: "$576.80", change: "+2.3%" },
    { asset: "BTC", amount: "0.543", value: "$23,456.00", change: "+5.6%" },
    { asset: "ETH", amount: "3.234", value: "$9,702.00", change: "-1.2%" },
    { asset: "USDC", amount: "10,000.00", value: "$10,000.00", change: "0.0%" }
  ]

  const transactions = [
    { type: "receive", asset: "XLM", amount: "100", time: "2 min ago", from: "GBXG...1234" },
    { type: "send", asset: "USDC", amount: "500", time: "1 hour ago", to: "GBXG...5678" },
    { type: "receive", asset: "BTC", amount: "0.01", time: "3 hours ago", from: "GBXG...9012" },
    { type: "send", asset: "ETH", amount: "0.5", time: "Yesterday", to: "GBXG...3456" }
  ]

  return (
    <div className="space-y-6">
      <div>
        <GlitchText 
          text="WALLET_MANAGER" 
          className="text-3xl font-bold text-orange-500 font-mono"
        />
        <p className="text-gray-400 font-mono mt-2">[MANAGE_YOUR_DIGITAL_ASSETS.EXE]</p>
      </div>

      <NeonCard variant="cyan">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-cyan-400 font-mono flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              WALLET_ADDRESS
            </h2>
            <CyberButton size="sm" variant="secondary">
              <Copy className="h-4 w-4 mr-2" />
              COPY
            </CyberButton>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4 font-mono text-lg">
            {walletAddress}
          </div>
        </div>
      </NeonCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {balances.map((balance) => (
          <NeonCard key={balance.asset} variant={selectedAsset === balance.asset ? "orange" : "cyan"}>
            <button
              onClick={() => setSelectedAsset(balance.asset)}
              className="w-full p-4 text-left"
            >
              <div className="font-mono text-sm text-gray-400 mb-1">{balance.asset}</div>
              <div className="font-mono text-xl font-bold mb-2">{balance.amount}</div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-gray-400">{balance.value}</span>
                <span className={`font-mono text-xs ${
                  balance.change.startsWith('+') ? 'text-green-400' : 
                  balance.change === '0.0%' ? 'text-gray-400' : 
                  'text-red-400'
                }`}>
                  {balance.change}
                </span>
              </div>
            </button>
          </NeonCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <NeonCard>
            <div className="p-6">
              <h2 className="text-xl font-bold text-orange-400 font-mono mb-4">RECENT_TRANSACTIONS</h2>
              <div className="space-y-3">
                {transactions.map((tx, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {tx.type === 'receive' ? (
                        <ArrowDownRight className="h-5 w-5 text-green-400" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-red-400" />
                      )}
                      <div>
                        <p className="font-mono text-sm font-bold">
                          {tx.type === 'receive' ? 'RECEIVED' : 'SENT'} {tx.amount} {tx.asset}
                        </p>
                        <p className="font-mono text-xs text-gray-400">
                          {tx.type === 'receive' ? `From: ${tx.from}` : `To: ${tx.to}`}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-gray-400">{tx.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </NeonCard>
        </div>

        <div className="space-y-4">
          <NeonCard variant="green">
            <div className="p-6">
              <h3 className="text-lg font-bold text-green-400 font-mono mb-4">QUICK_ACTIONS</h3>
              <div className="space-y-2">
                <CyberButton className="w-full" variant="primary">
                  <Send className="h-4 w-4 mr-2" />
                  SEND
                </CyberButton>
                <CyberButton className="w-full" variant="secondary">
                  <Download className="h-4 w-4 mr-2" />
                  RECEIVE
                </CyberButton>
              </div>
            </div>
          </NeonCard>

          <NeonCard variant="purple">
            <div className="p-6">
              <h3 className="text-lg font-bold text-purple-400 font-mono mb-4">PORTFOLIO_VALUE</h3>
              <div className="space-y-3">
                <div>
                  <p className="font-mono text-2xl font-bold">$43,734.80</p>
                  <p className="font-mono text-sm text-green-400">+3.2% (24h)</p>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-cyan-500" style={{ width: '75%' }} />
                </div>
                <p className="font-mono text-xs text-gray-400">75% OF TARGET</p>
              </div>
            </div>
          </NeonCard>
        </div>
      </div>
    </div>
  )
}