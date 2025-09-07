'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, TrendingUp, Activity, Plus } from 'lucide-react';
import { getHealthFactorColor, getHealthFactorStatus } from '@/lib/stellar';

interface LoanPosition {
  id: number;
  collateralAsset: string;
  collateralAmount: number;
  borrowedAsset: string;
  borrowedAmount: number;
  healthFactor: number;
  liquidationPrice: number;
  currentPrice: number;
  createdAt: Date;
}

export default function LiquidationMonitor() {
  const [positions, setPositions] = useState<LoanPosition[]>([
    {
      id: 1,
      collateralAsset: 'ETH',
      collateralAmount: 2,
      borrowedAsset: 'USDC',
      borrowedAmount: 5000,
      healthFactor: 1.8,
      liquidationPrice: 2100,
      currentPrice: 3856,
      createdAt: new Date('2024-01-15')
    },
    {
      id: 2,
      collateralAsset: 'BTC',
      collateralAmount: 0.1,
      borrowedAsset: 'USDC',
      borrowedAmount: 8000,
      healthFactor: 1.3,
      liquidationPrice: 95000,
      currentPrice: 111579,
      createdAt: new Date('2024-01-20')
    }
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);

  // Simulate health factor updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPositions(prevPositions =>
        prevPositions.map(pos => ({
          ...pos,
          healthFactor: Math.max(0.5, pos.healthFactor + (Math.random() - 0.5) * 0.05),
          currentPrice: pos.currentPrice * (1 + (Math.random() - 0.5) * 0.01)
        }))
      );
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const HealthFactorBar = ({ healthFactor }: { healthFactor: number }) => {
    const percentage = Math.min(100, (healthFactor / 2) * 100);
    const color = getHealthFactorColor(healthFactor);
    
    return (
      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${
            healthFactor < 1.2 ? 'bg-red-500 animate-pulse' : 
            healthFactor < 1.5 ? 'bg-orange-500' : 
            healthFactor < 2 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Shield className="h-6 w-6 text-purple-500 mr-3" />
          <h2 className="text-xl font-bold text-white">Liquidation Protection</h2>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Loan
        </button>
      </div>

      {/* Active Positions */}
      <div className="space-y-4">
        {positions.map((position) => {
          const status = getHealthFactorStatus(position.healthFactor);
          const liquidationRisk = ((position.currentPrice - position.liquidationPrice) / position.currentPrice) * 100;
          
          return (
            <div key={position.id} className="bg-gray-800 rounded-lg p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center">
                    <span className="text-white font-medium text-lg">
                      {position.collateralAmount} {position.collateralAsset}
                    </span>
                    <span className="text-gray-500 mx-2">→</span>
                    <span className="text-gray-300">
                      {position.borrowedAmount.toLocaleString()} {position.borrowedAsset}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Loan #{position.id} • Created {position.createdAt.toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex items-center">
                  <span className={`text-2xl mr-2 ${status.color}`}>
                    {status.icon}
                  </span>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${status.color}`}>
                      {position.healthFactor.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">Health Factor</div>
                  </div>
                </div>
              </div>

              <HealthFactorBar healthFactor={position.healthFactor} />

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <div className="text-xs text-gray-500">Current Price</div>
                  <div className="text-white font-medium">
                    ${position.currentPrice.toLocaleString()}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500">Liquidation Price</div>
                  <div className="text-orange-400 font-medium">
                    ${position.liquidationPrice.toLocaleString()}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500">Safety Buffer</div>
                  <div className={`font-medium ${
                    liquidationRisk > 20 ? 'text-green-500' : 
                    liquidationRisk > 10 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {liquidationRisk.toFixed(1)}%
                  </div>
                </div>
              </div>

              {position.healthFactor < 1.5 && (
                <div className="mt-4 bg-yellow-900/20 rounded-lg p-3 border border-yellow-800">
                  <div className="flex items-center text-yellow-500 text-sm">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <span className="font-medium">Action Required:</span>
                  </div>
                  <div className="text-gray-400 text-sm mt-1">
                    Consider adding collateral or repaying part of the loan to improve health factor.
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition">
                      Add Collateral
                    </button>
                    <button className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded transition">
                      Repay Loan
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Collateral</span>
            <Activity className="h-4 w-4 text-gray-500" />
          </div>
          <div className="text-white font-bold text-lg">$19,113</div>
          <div className="text-green-500 text-xs">+2.3% today</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Borrowed</span>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </div>
          <div className="text-white font-bold text-lg">$13,000</div>
          <div className="text-gray-500 text-xs">2 active loans</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Avg Health</span>
            <Shield className="h-4 w-4 text-gray-500" />
          </div>
          <div className="text-white font-bold text-lg">1.55</div>
          <div className={`text-xs ${positions.some(p => p.healthFactor < 1.5) ? 'text-yellow-500' : 'text-green-500'}`}>
            {positions.some(p => p.healthFactor < 1.5) ? 'Monitor closely' : 'All healthy'}
          </div>
        </div>
      </div>
    </div>
  );
}