"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Wallet, LogOut, User, ChevronDown } from "lucide-react"
import Image from "next/image"
import { GlitchText } from "@/components/glitch-text"
import { CyberButton } from "@/components/cyber-button"
import { connectWallet, disconnect, getPublicKey, formatAddress, isWalletConnected } from "@/lib/stellar"
import toast from "react-hot-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Header() {
  const [isConnected, setIsConnected] = useState(false)
  const [accountAddress, setAccountAddress] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    checkWalletConnection()
  }, [])

  const checkWalletConnection = async () => {
    try {
      const connected = await isWalletConnected()
      if (connected) {
        const publicKey = await getPublicKey()
        setAccountAddress(publicKey)
        setIsConnected(true)
      }
    } catch (error) {
      console.error('Failed to check wallet connection:', error)
    }
  }

  const handleWalletConnect = async () => {
    setIsConnecting(true)
    try {
      const result = await connectWallet()
      
      if (result.success && result.publicKey) {
        setAccountAddress(result.publicKey)
        setIsConnected(true)
        toast.success('WALLET_CONNECTED', {
          style: {
            background: '#1a1a1a',
            color: '#22c55e',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)',
            fontFamily: 'monospace',
          },
        })
      } else {
        toast.error(result.error || 'CONNECTION_FAILED', {
          style: {
            background: '#1a1a1a',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)',
            fontFamily: 'monospace',
          },
        })
      }
    } catch (error: any) {
      toast.error(error.message || 'CONNECTION_ERROR', {
        style: {
          background: '#1a1a1a',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)',
          fontFamily: 'monospace',
        },
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleWalletDisconnect = async () => {
    try {
      await disconnect()
      setIsConnected(false)
      setAccountAddress("")
      toast.success('WALLET_DISCONNECTED', {
        style: {
          background: '#1a1a1a',
          color: '#fbbf24',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          boxShadow: '0 0 20px rgba(251, 191, 36, 0.2)',
          fontFamily: 'monospace',
        },
      })
    } catch (error: any) {
      toast.error('DISCONNECT_FAILED', {
        style: {
          background: '#1a1a1a',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)',
          fontFamily: 'monospace',
        },
      })
    }
  }

  return (
    <header className="border-b border-[#1E1E1E] bg-[#0A0A0A]/95 backdrop-blur-md z-50">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <Image 
              src="/logo.png" 
              alt="Stellar Guard" 
              width={160} 
              height={40} 
              className="object-contain"
              priority
            />
            <div className="hidden">
              <GlitchText text="STELLAR_GUARD" className="text-xl font-bold text-white" />
              <p className="text-xs text-orange-400 font-mono tracking-widest">PROTECTION_PROTOCOL.EXE</p>
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-6">
          <a href="/dashboard" className="font-mono text-sm text-gray-400 hover:text-orange-400 transition-colors">
            [DASHBOARD]
          </a>
          <a href="/prices" className="font-mono text-sm text-gray-400 hover:text-orange-400 transition-colors">
            [PRICES]
          </a>
          <a href="/stop-loss" className="font-mono text-sm text-gray-400 hover:text-orange-400 transition-colors">
            [STOP_LOSS]
          </a>
          <a href="/portfolio" className="font-mono text-sm text-gray-400 hover:text-orange-400 transition-colors">
            [PORTFOLIO]
          </a>
          <a href="/alerts" className="font-mono text-sm text-gray-400 hover:text-orange-400 transition-colors">
            [ALERTS]
          </a>
        </nav>

        <div className="flex items-center space-x-4">
          {isConnected ? (
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="border-green-500/30 text-green-400 font-mono">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                CONNECTED
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 font-mono bg-transparent"
                  >
                    <User className="w-4 h-4 mr-2" />
                    {formatAddress(accountAddress)}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-900 border-orange-500/30 text-white">
                  <DropdownMenuItem className="font-mono text-xs text-gray-400">
                    {accountAddress}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem onClick={handleWalletDisconnect} className="text-red-400 font-mono">
                    <LogOut className="w-4 h-4 mr-2" />
                    DISCONNECT
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <CyberButton onClick={handleWalletConnect} disabled={isConnecting}>
              <Wallet className="w-4 h-4 mr-2" />
              {isConnecting ? "CONNECTING..." : "CONNECT_WALLET"}
            </CyberButton>
          )}
        </div>
      </div>
    </header>
  )
}



