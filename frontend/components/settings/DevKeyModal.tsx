'use client';

import { useState } from 'react';
import { X, AlertTriangle, Key } from 'lucide-react';
import { enableDevKeyMode, clearDevKey, isDevKeyMode } from '@/lib/stellar-wallets-kit';
import toast from 'react-hot-toast';

interface DevKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (publicKey: string) => void;
}

export default function DevKeyModal({ isOpen, onClose, onSuccess }: DevKeyModalProps) {
  const [secretKey, setSecretKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmUnsafe, setConfirmUnsafe] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!confirmUnsafe) {
      toast.error('Please confirm you understand the risks');
      return;
    }

    if (!secretKey.startsWith('S') || secretKey.length < 56) {
      toast.error('Invalid secret key format');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await enableDevKeyMode(secretKey);
      
      if (result.success && result.publicKey) {
        toast.success('Dev Key Mode enabled (session only)');
        onSuccess(result.publicKey);
        setSecretKey(''); // Clear from state immediately
        onClose();
      } else {
        toast.error(result.error || 'Invalid secret key');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to enable dev mode');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisableDevMode = () => {
    clearDevKey();
    toast.success('Dev Mode disabled');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center mb-6">
          <Key className="h-6 w-6 text-yellow-500 mr-3" />
          <h2 className="text-xl font-bold text-white">Dev Key Mode</h2>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-red-400 font-bold mb-2">⚠️ UNSAFE - DEMO ONLY</p>
              <p className="text-sm text-gray-300">
                This mode is for development and demos only. Your secret key will be stored
                in memory for this session only. It will be cleared on refresh or logout.
                Never use this with real funds or on mainnet.
              </p>
            </div>
          </div>
        </div>

        {isDevKeyMode() ? (
          <div className="space-y-4">
            <p className="text-green-500">Dev Mode is currently active</p>
            <button
              onClick={handleDisableDevMode}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition"
            >
              Disable Dev Mode
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Secret Key Input */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Secret Key (S...)
              </label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 font-mono text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Testnet only. Get test funds from Stellar Friendbot.
              </p>
            </div>

            {/* Confirmation Checkbox */}
            <div className="flex items-start">
              <input
                type="checkbox"
                id="confirm-unsafe"
                checked={confirmUnsafe}
                onChange={(e) => setConfirmUnsafe(e.target.checked)}
                className="mt-1 mr-3"
              />
              <label htmlFor="confirm-unsafe" className="text-sm text-gray-300">
                I understand this is unsafe and for demo purposes only. The key is stored
                in memory and will be cleared on refresh.
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !confirmUnsafe}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition"
              >
                {isSubmitting ? 'Enabling...' : 'Enable Dev Mode'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}