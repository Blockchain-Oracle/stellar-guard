'use client';

import { useState, useEffect } from 'react';
import { connectWallet } from '@/lib/stellar';
import { 
  getPublicKey, 
  disconnect, 
  isDevKeyMode,
  clearDevKey 
} from '@/lib/stellar-wallets-kit';
import { Shield, Wallet, TrendingDown, Activity, Settings, Key, X } from 'lucide-react';
import toast from 'react-hot-toast';
import DevKeyModal from '@/components/settings/DevKeyModal';

export default function Header() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showDevKeyModal, setShowDevKeyModal] = useState(false);
  const [inDevMode, setInDevMode] = useState(false);

  useEffect(() => {
    // Check if wallet is already connected or in dev mode
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    try {
      const publicKey = await getPublicKey();
      if (publicKey) {
        setWalletAddress(publicKey);
        setInDevMode(isDevKeyMode());
      }
    } catch (error) {
      console.error('Error checking wallet:', error);
    }
  };

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      const result = await connectWallet();
      if (result.success && result.publicKey) {
        setWalletAddress(result.publicKey);
        setInDevMode(false);
        toast.success('Wallet connected successfully!');
      } else {
        toast.error(result.error || 'Failed to connect wallet');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (isDevKeyMode()) {
        clearDevKey();
        toast.success('Dev mode disabled');
      } else {
        await disconnect();
        toast.success('Wallet disconnected');
      }
      setWalletAddress(null);
      setInDevMode(false);
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <>
    <header className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Name */}
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-blue-500 mr-3" />
            <span className="text-xl font-bold text-white">StellarGuard</span>
            <span className="ml-2 text-sm text-gray-400">Testnet</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#stop-loss" className="flex items-center text-gray-300 hover:text-white transition">
              <TrendingDown className="h-4 w-4 mr-2" />
              Stop-Loss
            </a>
            <a href="#liquidation" className="flex items-center text-gray-300 hover:text-white transition">
              <Activity className="h-4 w-4 mr-2" />
              Liquidation
            </a>
            <a href="#monitoring" className="text-gray-300 hover:text-white transition">
              Monitoring
            </a>
          </nav>

          {/* Wallet Connection */}
          <div className="flex items-center gap-2">
            {walletAddress ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-gray-800 rounded-lg px-4 py-2">
                  {inDevMode && (
                    <Key className="h-4 w-4 text-yellow-500 mr-2" />
                  )}
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-gray-300 text-sm">{formatAddress(walletAddress)}</span>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-lg transition"
                  title="Disconnect"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
                <button
                  onClick={() => setShowDevKeyModal(true)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white p-2 rounded-lg transition"
                  title="Dev Mode"
                >
                  <Key className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
    
    {/* Dev Key Modal */}
    <DevKeyModal 
      isOpen={showDevKeyModal}
      onClose={() => setShowDevKeyModal(false)}
      onSuccess={(publicKey) => {
        setWalletAddress(publicKey);
        setInDevMode(true);
        setShowDevKeyModal(false);
      }}
    />
    </>
  );
}