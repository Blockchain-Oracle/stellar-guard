'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { formatPrice, formatPercentage } from '@/lib/stellar';

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  sparkline: number[];
}

export default function PriceDashboard() {
  const [prices, setPrices] = useState<PriceData[]>([
    {
      symbol: 'BTC',
      price: 111579,
      change24h: 2.34,
      volume24h: 45234567890,
      sparkline: [108000, 109500, 110200, 109800, 111000, 111579]
    },
    {
      symbol: 'ETH',
      price: 3856.42,
      change24h: -1.23,
      volume24h: 23456789012,
      sparkline: [3900, 3920, 3880, 3850, 3840, 3856]
    },
    {
      symbol: 'XLM',
      price: 0.4567,
      change24h: 5.67,
      volume24h: 1234567890,
      sparkline: [0.42, 0.43, 0.44, 0.445, 0.45, 0.4567]
    },
    {
      symbol: 'USDC',
      price: 0.9998,
      change24h: -0.02,
      volume24h: 5678901234,
      sparkline: [1.0, 0.9999, 0.9998, 0.9999, 0.9998, 0.9998]
    }
  ]);

  const [selectedAsset, setSelectedAsset] = useState<string>('BTC');

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prevPrices => 
        prevPrices.map(price => ({
          ...price,
          price: price.price * (1 + (Math.random() - 0.5) * 0.002),
          change24h: price.change24h + (Math.random() - 0.5) * 0.1,
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const MiniSparkline = ({ data }: { data: number[] }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;
    const height = 30;
    const width = 60;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    const isPositive = data[data.length - 1] > data[0];

    return (
      <svg width={width} height={height} className="inline-block">
        <polyline
          points={points}
          fill="none"
          stroke={isPositive ? '#10b981' : '#ef4444'}
          strokeWidth="1.5"
        />
      </svg>
    );
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Live Prices</h2>
        <div className="flex items-center text-sm text-gray-400">
          <Activity className="h-4 w-4 mr-1 text-green-500 animate-pulse" />
          Real-time
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {prices.map((asset) => (
          <div
            key={asset.symbol}
            onClick={() => setSelectedAsset(asset.symbol)}
            className={`bg-gray-800 rounded-lg p-4 cursor-pointer transition hover:bg-gray-750 ${
              selectedAsset === asset.symbol ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 font-medium">{asset.symbol}</span>
              <MiniSparkline data={asset.sparkline} />
            </div>
            
            <div className="text-2xl font-bold text-white mb-1">
              ${asset.price.toLocaleString(undefined, { 
                minimumFractionDigits: asset.price < 1 ? 4 : 2,
                maximumFractionDigits: asset.price < 1 ? 4 : 2 
              })}
            </div>
            
            <div className="flex items-center justify-between">
              <div className={`flex items-center text-sm ${
                asset.change24h >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {asset.change24h >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {formatPercentage(asset.change24h)}
              </div>
              
              <div className="text-xs text-gray-500">
                Vol: ${(asset.volume24h / 1e9).toFixed(2)}B
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Asset Details */}
      <div className="mt-6 bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-400 text-sm">Selected Asset</span>
            <div className="text-white font-bold text-lg">{selectedAsset}/USD</div>
          </div>
          
          <div className="flex gap-4">
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
              Create Stop-Loss
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">
              Monitor Position
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}