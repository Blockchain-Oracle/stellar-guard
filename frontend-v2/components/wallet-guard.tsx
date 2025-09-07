"use client"

import { useState, useEffect } from "react"
import { NeonCard } from "@/components/neon-card"
import { CyberButton } from "@/components/cyber-button"
import { GlitchText } from "@/components/glitch-text"
import { 
  Wallet,
  Shield,
  Zap,
  Lock,
  ArrowRight,
  Activity,
  Sparkles,
  CircuitBoard
} from "lucide-react"
import { isWalletConnected, connectWallet } from "@/lib/stellar"
import { motion } from "framer-motion"

interface WalletGuardProps {
  children: React.ReactNode
  pageName?: string
}

export function WalletGuard({ children, pageName = "THIS_SECTION" }: WalletGuardProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    checkWalletConnection()
    // Check connection every 2 seconds
    const interval = setInterval(checkWalletConnection, 2000)
    return () => clearInterval(interval)
  }, [])

  const checkWalletConnection = async () => {
    const connected = await isWalletConnected()
    setIsConnected(connected)
    setIsChecking(false)
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const result = await connectWallet()
      if (result.success) {
        setIsConnected(true)
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <CircuitBoard className="h-16 w-16 text-orange-400 mx-auto" />
            </motion.div>
          </div>
          <GlitchText text="INITIALIZING_SECURE_CONNECTION..." className="text-xl text-orange-400" />
          <div className="flex gap-2 justify-center">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-orange-400 rounded-full"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show connect wallet prompt if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl w-full"
        >
          <NeonCard variant="orange" className="overflow-hidden">
            <div className="relative">
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-transparent to-cyan-500" />
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute border border-orange-500/20"
                    style={{
                      width: `${(i + 1) * 150}px`,
                      height: `${(i + 1) * 150}px`,
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      borderRadius: '50%',
                    }}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.1, 0.3],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.5,
                    }}
                  />
                ))}
              </div>

              <div className="relative z-10 p-8 md:p-12 text-center">
                {/* Icon animation */}
                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mb-6"
                >
                  <div className="relative inline-block">
                    <Lock className="h-20 w-20 text-orange-400 mx-auto" />
                    <motion.div
                      className="absolute inset-0"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Shield className="h-20 w-20 text-cyan-400 mx-auto" />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Title */}
                <GlitchText 
                  text="WALLET_CONNECTION_REQUIRED" 
                  className="text-3xl md:text-4xl font-bold text-orange-500 font-mono mb-4"
                />

                {/* Subtitle */}
                <p className="text-gray-400 font-mono text-sm md:text-base mb-8">
                  [ACCESS_DENIED] - {pageName}_REQUIRES_AUTHENTICATION
                </p>

                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="p-4 bg-gray-900/50 rounded-lg border border-orange-500/30"
                  >
                    <Zap className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-xs font-mono text-gray-300">INSTANT_ACCESS</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="p-4 bg-gray-900/50 rounded-lg border border-cyan-500/30"
                  >
                    <Shield className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-xs font-mono text-gray-300">SECURE_TRADING</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="p-4 bg-gray-900/50 rounded-lg border border-purple-500/30"
                  >
                    <Activity className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-xs font-mono text-gray-300">REAL_TIME_DATA</p>
                  </motion.div>
                </div>

                {/* Connect button */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <CyberButton 
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="w-full md:w-auto px-8 py-4 text-lg"
                  >
                    {isConnecting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Activity className="h-5 w-5 mr-3" />
                        </motion.div>
                        ESTABLISHING_CONNECTION...
                      </>
                    ) : (
                      <>
                        <Wallet className="h-5 w-5 mr-3" />
                        CONNECT_WALLET
                        <ArrowRight className="h-5 w-5 ml-3" />
                      </>
                    )}
                  </CyberButton>
                </motion.div>

                {/* Security note */}
                <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-orange-400" />
                    <p className="text-xs font-mono text-orange-400">SECURITY_NOTICE</p>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">
                    Your wallet connection is required to access protected features.
                    We never store your private keys. All transactions require your approval.
                  </p>
                </div>

                {/* Animated dots */}
                <div className="flex gap-2 justify-center mt-6">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 h-1 bg-orange-400 rounded-full"
                      animate={{ 
                        scale: [1, 1.5, 1],
                        opacity: [0.3, 1, 0.3]
                      }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity, 
                        delay: i * 0.3 
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </NeonCard>
        </motion.div>
      </div>
    )
  }

  // Wallet is connected, show the protected content
  return <>{children}</>
}