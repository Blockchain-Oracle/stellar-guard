"use client"

import { useState, useEffect } from "react"
import { NeonCard } from "@/components/neon-card"
import { CyberButton } from "@/components/cyber-button"
import { Badge } from "@/components/ui/badge"
import { 
  Send,
  MessageCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  ExternalLink,
  Bell,
  BellOff
} from "lucide-react"
import {
  getTelegramConfig,
  saveTelegramConfig,
  clearTelegramConfig,
  verifyTelegramChatId,
  getTelegramBotUsername,
  getTelegramInstructions
} from "@/services/telegram"
import toast from "react-hot-toast"

export function TelegramSubscription() {
  const [config, setConfig] = useState(getTelegramConfig())
  const [chatId, setChatId] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  
  const botUsername = getTelegramBotUsername()
  const instructions = getTelegramInstructions()
  
  useEffect(() => {
    // Load config on mount
    const savedConfig = getTelegramConfig()
    if (savedConfig) {
      setConfig(savedConfig)
      setChatId(savedConfig.chatId)
    }
  }, [])
  
  const handleVerify = async () => {
    if (!chatId.trim()) {
      toast.error("CHAT_ID_REQUIRED", {
        style: {
          background: '#1a1a1a',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          fontFamily: 'monospace',
        },
      })
      return
    }
    
    setVerifying(true)
    
    try {
      const success = await verifyTelegramChatId(chatId)
      
      if (success) {
        const newConfig = {
          chatId,
          enabled: true,
          username: botUsername
        }
        setConfig(newConfig)
        
        toast.success("TELEGRAM_CONNECTED", {
          style: {
            background: '#1a1a1a',
            color: '#22c55e',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            fontFamily: 'monospace',
          },
        })
      } else {
        toast.error("VERIFICATION_FAILED", {
          style: {
            background: '#1a1a1a',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontFamily: 'monospace',
          },
        })
      }
    } catch (error) {
      console.error('Verification error:', error)
      toast.error("CONNECTION_ERROR", {
        style: {
          background: '#1a1a1a',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          fontFamily: 'monospace',
        },
      })
    } finally {
      setVerifying(false)
    }
  }
  
  const handleToggle = () => {
    if (!config) return
    
    const newConfig = {
      ...config,
      enabled: !config.enabled
    }
    
    saveTelegramConfig(newConfig)
    setConfig(newConfig)
    
    toast.success(newConfig.enabled ? "NOTIFICATIONS_ENABLED" : "NOTIFICATIONS_DISABLED", {
      style: {
        background: '#1a1a1a',
        color: newConfig.enabled ? '#22c55e' : '#fbbf24',
        border: `1px solid ${newConfig.enabled ? 'rgba(34, 197, 94, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
        fontFamily: 'monospace',
      },
    })
  }
  
  const handleDisconnect = () => {
    clearTelegramConfig()
    setConfig(null)
    setChatId("")
    
    toast.success("TELEGRAM_DISCONNECTED", {
      style: {
        background: '#1a1a1a',
        color: '#fbbf24',
        border: '1px solid rgba(251, 191, 36, 0.3)',
        fontFamily: 'monospace',
      },
    })
  }
  
  const copyBotUsername = () => {
    navigator.clipboard.writeText(`@${botUsername}`)
    toast.success("USERNAME_COPIED", {
      style: {
        background: '#1a1a1a',
        color: '#22c55e',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        fontFamily: 'monospace',
      },
    })
  }
  
  return (
    <NeonCard variant="purple">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-purple-400" />
            <h2 className="text-xl font-bold text-purple-400 font-mono">
              TELEGRAM_NOTIFICATIONS
            </h2>
          </div>
          {config && (
            <Badge 
              variant={config.enabled ? "default" : "secondary"}
              className="font-mono"
            >
              {config.enabled ? "ACTIVE" : "PAUSED"}
            </Badge>
          )}
        </div>
        
        {!config ? (
          // Not connected - show setup
          <div className="space-y-4">
            <p className="text-sm text-gray-400 font-mono">
              Connect your Telegram to receive real-time alert notifications
            </p>
            
            {/* Bot Username - Clickable */}
            <div className="bg-gray-900/50 rounded-lg p-4 border border-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400 font-mono">TELEGRAM_BOT</span>
                <CyberButton
                  size="sm"
                  variant="secondary"
                  onClick={copyBotUsername}
                >
                  <Copy className="h-3 w-3" />
                  COPY
                </CyberButton>
              </div>
              <a 
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-purple-300 transition-colors"
              >
                <Send className="h-4 w-4 text-purple-400" />
                <span className="font-mono text-purple-400 underline decoration-dotted underline-offset-4">@{botUsername}</span>
              </a>
            </div>
            
            {/* Instructions Toggle */}
            <CyberButton
              variant="secondary"
              size="sm"
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full"
            >
              {showInstructions ? "HIDE" : "SHOW"}_INSTRUCTIONS
            </CyberButton>
            
            {/* Instructions */}
            {showInstructions && (
              <div className="bg-gray-900/50 rounded-lg p-4 border border-purple-500/30">
                <ol className="space-y-2 text-sm font-mono text-gray-300">
                  {instructions.map((instruction, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="text-purple-400">{index + 1}.</span>
                      <span>{instruction.replace(/^[0-9]+\.\s*/, '')}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            
            {/* User ID Input */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400 font-mono">
                ENTER_USER_ID
              </label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="e.g. 123456789"
                className="w-full bg-gray-900 border border-purple-500/30 rounded-lg px-4 py-2 font-mono text-white placeholder-gray-500"
              />
            </div>
            
            {/* Verify Button */}
            <CyberButton
              onClick={handleVerify}
              disabled={verifying || !chatId.trim()}
              className="w-full"
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  VERIFYING...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  VERIFY_&_CONNECT
                </>
              )}
            </CyberButton>
            
            {/* External Link - More prominent */}
            <div className="pt-2 border-t border-purple-500/20">
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 transition font-mono py-3 px-4 rounded-lg border border-purple-500/30"
              >
                <Send className="h-4 w-4" />
                Open @{botUsername} in Telegram
                <ExternalLink className="h-4 w-4" />
              </a>
              <p className="text-xs text-gray-500 font-mono text-center mt-2">
                Click above to open Telegram and get your User ID
              </p>
            </div>
          </div>
        ) : (
          // Connected - show status
          <div className="space-y-4">
            <div className="bg-gray-900/50 rounded-lg p-4 border border-purple-500/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400 font-mono">CONNECTION_STATUS</span>
                <CheckCircle className="h-4 w-4 text-green-400" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500 font-mono">USER_ID</span>
                  <span className="text-xs font-mono text-purple-400">{config.chatId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500 font-mono">BOT</span>
                  <span className="text-xs font-mono text-purple-400">@{config.username || botUsername}</span>
                </div>
              </div>
            </div>
            
            {/* Toggle Notifications */}
            <CyberButton
              onClick={handleToggle}
              variant={config.enabled ? "secondary" : "primary"}
              className="w-full"
            >
              {config.enabled ? (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  PAUSE_NOTIFICATIONS
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  ENABLE_NOTIFICATIONS
                </>
              )}
            </CyberButton>
            
            {/* Disconnect */}
            <CyberButton
              onClick={handleDisconnect}
              variant="danger"
              size="sm"
              className="w-full"
            >
              <XCircle className="h-4 w-4 mr-2" />
              DISCONNECT_TELEGRAM
            </CyberButton>
            
            <p className="text-xs text-gray-500 font-mono text-center">
              {config.enabled 
                ? "You will receive Telegram notifications for triggered alerts"
                : "Notifications are paused. Enable to receive alerts."
              }
            </p>
          </div>
        )}
      </div>
    </NeonCard>
  )
}