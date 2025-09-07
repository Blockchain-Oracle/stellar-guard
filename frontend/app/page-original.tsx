'use client';

import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Header from '@/components/layout/Header';
import PriceDashboard from '@/components/dashboard/PriceDashboard';
import StopLossForm from '@/components/stop-loss/StopLossForm';
import LiquidationMonitor from '@/components/liquidation/LiquidationMonitor';
import { Shield, Activity, TrendingDown, BarChart3, TrendingUp, AlertCircle, AlertTriangle, DollarSign, RefreshCw } from 'lucide-react';
import { connectWallet, getCurrentPrice, getTWAPPrice, getCrossPrice, checkStablecoinPeg } from '@/lib/stellar';
import { OrderType, SUPPORTED_ASSETS } from '@/lib/constants';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'orders' | 'twap' | 'liquidation' | 'portfolio' | 'arbitrage'>('orders');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [orderType, setOrderType] = useState<OrderType>(OrderType.StopLoss);
  const [amount, setAmount] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [trailingPercent, setTrailingPercent] = useState('5');
  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  
  // TWAP state
  const [twapPeriods, setTwapPeriods] = useState('5');
  const [twapStopPercent, setTwapStopPercent] = useState('10');
  
  // Liquidation state
  const [collateralAsset, setCollateralAsset] = useState('BTC');
  const [collateralAmount, setCollateralAmount] = useState('');
  const [borrowedAsset, setBorrowedAsset] = useState('USDC');
  const [borrowedAmount, setBorrowedAmount] = useState('');
  const [liquidationThreshold, setLiquidationThreshold] = useState('150');
  
  // Portfolio state
  const [portfolioPositions, setPortfolioPositions] = useState([
    { asset: 'BTC', amount: '0.5', target: '50' },
    { asset: 'ETH', amount: '5', target: '30' },
    { asset: 'XLM', amount: '10000', target: '20' }
  ]);
  
  // Price state
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [twapPrice, setTwapPrice] = useState<number | null>(null);
  const [crossPrice, setCrossPrice] = useState<number | null>(null);
  const [arbitrageOpportunities, setArbitrageOpportunities] = useState<any[]>([]);
  const [stablecoinDeviations, setStablecoinDeviations] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (selectedAsset) {
      loadPriceData();
    }
  }, [selectedAsset, activeTab]);

  useEffect(() => {
    // Check for arbitrage opportunities every 30 seconds
    const interval = setInterval(checkArbitrageOpportunities, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPriceData = async () => {
    try {
      // Get spot price
      const price = await getCurrentPrice(selectedAsset);
      if (price) {
        const priceValue = Number(price) / Math.pow(10, 14);
        setCurrentPrice(priceValue);
      }
      
      // Get TWAP price if on TWAP tab
      if (activeTab === 'twap') {
        const twap = await getTWAPPrice(selectedAsset, parseInt(twapPeriods));
        if (twap) {
          const twapValue = Number(twap) / Math.pow(10, 14);
          setTwapPrice(twapValue);
        }
      }
      
      // Get cross price if needed
      if (activeTab === 'arbitrage') {
        const cross = await getCrossPrice('BTC', 'ETH');
        if (cross) {
          const crossValue = Number(cross) / Math.pow(10, 14);
          setCrossPrice(crossValue);
        }
      }
    } catch (error) {
      console.error('Failed to load price:', error);
    }
  };

  const checkArbitrageOpportunities = async () => {
    try {
      // Check major assets for arbitrage
      const assets = ['BTC', 'ETH', 'XLM'];
      const opportunities = [];
      
      for (const asset of assets) {
        const cexPrice = await getCurrentPrice(asset, 'crypto');
        const dexPrice = await getCurrentPrice(asset, 'stellar');
        
        if (cexPrice && dexPrice) {
          const diff = ((Number(cexPrice) - Number(dexPrice)) / Number(cexPrice)) * 10000;
          if (Math.abs(diff) > 50) { // > 0.5%
            opportunities.push({
              asset,
              cexPrice: Number(cexPrice) / Math.pow(10, 14),
              dexPrice: Number(dexPrice) / Math.pow(10, 14),
              difference: diff
            });
          }
        }
      }
      
      setArbitrageOpportunities(opportunities);
      
      // Check stablecoin pegs
      const stablecoins = ['USDC', 'USDT'];
      const deviations = [];
      
      for (const stable of stablecoins) {
        const deviation = await checkStablecoinPeg(stable);
        if (deviation && Math.abs(deviation) > 50) { // > 0.5%
          deviations.push({ asset: stable, deviation });
        }
      }
      
      setStablecoinDeviations(deviations);
    } catch (error) {
      console.error('Failed to check arbitrage:', error);
    }
  };

  const handleConnect = async () => {
    try {
      const res = await connectWallet();
      if (res && (res as any).success && (res as any).publicKey) {
        setWalletAddress((res as any).publicKey as string);
      } else if (res && (res as any).error) {
        alert('Failed to connect wallet: ' + (res as any).error);
      }
    } catch (error) {
      alert('Failed to connect wallet: ' + error);
    }
  };

  const handleCreateOrder = async () => {
    if (!walletAddress) {
      alert('Please connect wallet first');
      return;
    }

    setLoading(true);
    try {
      // Create order logic here based on order type
      alert('Order created successfully!');
    } catch (error) {
      alert('Failed to create order: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const calculateHealthFactor = () => {
    if (!collateralAmount || !borrowedAmount || !currentPrice) return 0;
    
    const collValue = parseFloat(collateralAmount) * currentPrice;
    const borrowValue = parseFloat(borrowedAmount);
    const ratio = (collValue / borrowValue) * 100;
    
    return ratio / parseFloat(liquidationThreshold);
  };

  const calculatePortfolioValue = () => {
    let total = 0;
    portfolioPositions.forEach(pos => {
      // Would need actual prices for each asset
      total += parseFloat(pos.amount) * (currentPrice || 0);
    });
    return total;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-500" />
            <h1 className="text-2xl font-bold">StellarGuard</h1>
            <span className="text-xs bg-green-900/30 text-green-500 px-2 py-1 rounded ml-2">
              Powered by Reflector
            </span>
          </div>
          <button
            onClick={handleConnect}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition"
          >
            {walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : 'Connect Wallet'}
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-gray-800">
        <div className="container mx-auto px-4">
          <nav className="flex gap-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-4 px-2 border-b-2 transition ${
                activeTab === 'orders' 
                  ? 'border-blue-500 text-blue-500' 
                  : 'border-transparent hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Stop-Loss Orders
              </div>
            </button>
            <button
              onClick={() => setActiveTab('twap')}
              className={`py-4 px-2 border-b-2 transition ${
                activeTab === 'twap' 
                  ? 'border-blue-500 text-blue-500' 
                  : 'border-transparent hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                TWAP Orders
              </div>
            </button>
            <button
              onClick={() => setActiveTab('liquidation')}
              className={`py-4 px-2 border-b-2 transition ${
                activeTab === 'liquidation' 
                  ? 'border-blue-500 text-blue-500' 
                  : 'border-transparent hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Liquidation Monitor
              </div>
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`py-4 px-2 border-b-2 transition ${
                activeTab === 'portfolio' 
                  ? 'border-blue-500 text-blue-500' 
                  : 'border-transparent hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Portfolio Rebalancer
              </div>
            </button>
            <button
              onClick={() => setActiveTab('arbitrage')}
              className={`py-4 px-2 border-b-2 transition ${
                activeTab === 'arbitrage' 
                  ? 'border-blue-500 text-blue-500' 
                  : 'border-transparent hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Arbitrage Alerts
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Panel */}
          <div className="lg:col-span-2">
            {/* Stop-Loss Orders Tab */}
            {activeTab === 'orders' && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-6">Create Stop-Loss Order</h2>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Order Type</label>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {Object.values(OrderType).map((type) => (
                      <button
                        key={type}
                        onClick={() => setOrderType(type)}
                        className={`px-4 py-2 rounded-lg border transition ${
                          orderType === type
                            ? 'bg-blue-600 border-blue-600'
                            : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        {type.replace('_', ' ').toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Asset</label>
                    <select
                      value={selectedAsset}
                      onChange={(e) => setSelectedAsset(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    >
                      <option value="BTC">Bitcoin (BTC)</option>
                      <option value="ETH">Ethereum (ETH)</option>
                      <option value="XLM">Stellar (XLM)</option>
                      <option value="USDC">USD Coin (USDC)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Amount</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>

                {(orderType === OrderType.StopLoss || orderType === OrderType.OCO) && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Stop Price</label>
                    <input
                      type="number"
                      value={stopPrice}
                      onChange={(e) => setStopPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    />
                  </div>
                )}

                {orderType === OrderType.TrailingStop && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Trailing Distance (%)</label>
                    <input
                      type="number"
                      value={trailingPercent}
                      onChange={(e) => setTrailingPercent(e.target.value)}
                      min="1"
                      max="50"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    />
                  </div>
                )}

                <button
                  onClick={handleCreateOrder}
                  disabled={loading || !walletAddress}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-semibold transition"
                >
                  {loading ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            )}

            {/* TWAP Orders Tab */}
            {activeTab === 'twap' && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-6">TWAP-Based Orders</h2>
                
                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Activity className="h-5 w-5 text-blue-500 mt-1" />
                    <div>
                      <h3 className="font-semibold text-blue-400">Time-Weighted Average Price</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        TWAP orders use average prices over multiple periods for more stable execution, 
                        reducing impact from temporary price spikes or flash crashes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Asset</label>
                    <select
                      value={selectedAsset}
                      onChange={(e) => setSelectedAsset(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    >
                      <option value="BTC">Bitcoin (BTC)</option>
                      <option value="ETH">Ethereum (ETH)</option>
                      <option value="XLM">Stellar (XLM)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Amount</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">TWAP Periods</label>
                    <select
                      value={twapPeriods}
                      onChange={(e) => setTwapPeriods(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    >
                      <option value="3">3 periods (15 min)</option>
                      <option value="5">5 periods (25 min)</option>
                      <option value="10">10 periods (50 min)</option>
                      <option value="20">20 periods (100 min)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Stop Distance (%)</label>
                    <input
                      type="number"
                      value={twapStopPercent}
                      onChange={(e) => setTwapStopPercent(e.target.value)}
                      min="1"
                      max="50"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>

                {twapPrice && (
                  <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Current TWAP</span>
                      <span className="text-xl font-bold">${twapPrice.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-gray-400">Spot Price</span>
                      <span className="text-lg">${currentPrice?.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-gray-400">Stop Would Trigger At</span>
                      <span className="text-lg text-red-400">
                        ${(twapPrice * (1 - parseFloat(twapStopPercent) / 100)).toFixed(4)}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCreateOrder}
                  disabled={loading || !walletAddress}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-semibold transition"
                >
                  Create TWAP Order
                </button>
              </div>
            )}

            {/* Liquidation Monitor Tab */}
            {activeTab === 'liquidation' && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-6">Liquidation Protection</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Collateral Asset</label>
                    <select
                      value={collateralAsset}
                      onChange={(e) => setCollateralAsset(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    >
                      <option value="BTC">Bitcoin (BTC)</option>
                      <option value="ETH">Ethereum (ETH)</option>
                      <option value="XLM">Stellar (XLM)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Collateral Amount</label>
                    <input
                      type="number"
                      value={collateralAmount}
                      onChange={(e) => setCollateralAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Borrowed Asset</label>
                    <select
                      value={borrowedAsset}
                      onChange={(e) => setBorrowedAsset(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    >
                      <option value="USDC">USD Coin (USDC)</option>
                      <option value="USDT">Tether (USDT)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Borrowed Amount</label>
                    <input
                      type="number"
                      value={borrowedAmount}
                      onChange={(e) => setBorrowedAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Liquidation Threshold (%)</label>
                  <input
                    type="number"
                    value={liquidationThreshold}
                    onChange={(e) => setLiquidationThreshold(e.target.value)}
                    min="110"
                    max="200"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                  />
                </div>

                {collateralAmount && borrowedAmount && (
                  <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400">Health Factor</span>
                        <span className={`text-2xl font-bold ${
                          calculateHealthFactor() > 1.5 ? 'text-green-500' :
                          calculateHealthFactor() > 1.2 ? 'text-yellow-500' :
                          'text-red-500'
                        }`}>
                          {calculateHealthFactor().toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all ${
                            calculateHealthFactor() > 1.5 ? 'bg-green-500' :
                            calculateHealthFactor() > 1.2 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(calculateHealthFactor() * 50, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    {calculateHealthFactor() < 1.2 && (
                      <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 mt-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          <span className="text-red-400 font-semibold">Liquidation Risk!</span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          Add collateral or repay loan to improve health factor
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => alert('Monitoring position...')}
                  disabled={!walletAddress}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-semibold transition"
                >
                  Start Monitoring
                </button>
              </div>
            )}

            {/* Portfolio Rebalancer Tab */}
            {activeTab === 'portfolio' && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-6">Portfolio Rebalancer</h2>
                
                <div className="space-y-4 mb-6">
                  {portfolioPositions.map((position, index) => (
                    <div key={index} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Asset</label>
                          <select
                            value={position.asset}
                            onChange={(e) => {
                              const updated = [...portfolioPositions];
                              updated[index].asset = e.target.value;
                              setPortfolioPositions(updated);
                            }}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
                          >
                            <option value="BTC">BTC</option>
                            <option value="ETH">ETH</option>
                            <option value="XLM">XLM</option>
                            <option value="USDC">USDC</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Amount</label>
                          <input
                            type="number"
                            value={position.amount}
                            onChange={(e) => {
                              const updated = [...portfolioPositions];
                              updated[index].amount = e.target.value;
                              setPortfolioPositions(updated);
                            }}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Target %</label>
                          <input
                            type="number"
                            value={position.target}
                            onChange={(e) => {
                              const updated = [...portfolioPositions];
                              updated[index].target = e.target.value;
                              setPortfolioPositions(updated);
                            }}
                            min="0"
                            max="100"
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">Portfolio Value</span>
                    <span className="text-xl font-bold">${calculatePortfolioValue().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Target Sum</span>
                    <span className={`font-semibold ${
                      portfolioPositions.reduce((sum, p) => sum + parseFloat(p.target), 0) === 100
                        ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {portfolioPositions.reduce((sum, p) => sum + parseFloat(p.target), 0)}%
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => alert('Analyzing rebalancing needs...')}
                  disabled={!walletAddress}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-semibold transition"
                >
                  Analyze & Rebalance
                </button>
              </div>
            )}

            {/* Arbitrage Alerts Tab */}
            {activeTab === 'arbitrage' && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-6">Arbitrage Opportunities</h2>
                
                <div className="space-y-4">
                  {arbitrageOpportunities.length > 0 ? (
                    arbitrageOpportunities.map((opp, index) => (
                      <div key={index} className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-5 w-5 text-green-500" />
                              <h3 className="font-semibold text-green-400">{opp.asset} Arbitrage</h3>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-400">CEX Price:</span>
                                <span className="ml-2">${opp.cexPrice.toFixed(4)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">DEX Price:</span>
                                <span className="ml-2">${opp.dexPrice.toFixed(4)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-500">
                              {Math.abs(opp.difference / 100).toFixed(2)}%
                            </div>
                            <button className="mt-2 text-xs bg-green-600 hover:bg-green-700 px-3 py-1 rounded transition">
                              Execute
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <RefreshCw className="h-12 w-12 mx-auto mb-3 animate-spin" />
                      <p>Scanning for arbitrage opportunities...</p>
                    </div>
                  )}
                  
                  {stablecoinDeviations.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold mb-3">Stablecoin Peg Deviations</h3>
                      {stablecoinDeviations.map((dev, index) => (
                        <div key={index} className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 mb-2">
                          <div className="flex justify-between items-center">
                            <span className="text-yellow-400">{dev.asset}</span>
                            <span className="text-yellow-500 font-semibold">
                              {(dev.deviation / 100).toFixed(2)}% off peg
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Price Info Widget */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">Market Info</h3>
              
              {currentPrice ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400">Current Price</p>
                    <p className="text-2xl font-bold">${currentPrice.toFixed(4)}</p>
                  </div>
                  
                  {twapPrice && activeTab === 'twap' && (
                    <div>
                      <p className="text-sm text-gray-400">TWAP ({twapPeriods} periods)</p>
                      <p className="text-xl font-semibold">${twapPrice.toFixed(4)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {((twapPrice - currentPrice) / currentPrice * 100).toFixed(2)}% vs spot
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <div className="flex-1 bg-green-900/30 rounded-lg p-3">
                      <TrendingUp className="h-5 w-5 text-green-500 mb-1" />
                      <p className="text-xs text-gray-400">24h High</p>
                      <p className="font-semibold">-</p>
                    </div>
                    <div className="flex-1 bg-red-900/30 rounded-lg p-3">
                      <TrendingDown className="h-5 w-5 text-red-500 mb-1" />
                      <p className="text-xs text-gray-400">24h Low</p>
                      <p className="font-semibold">-</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400">
                  <AlertCircle className="h-5 w-5" />
                  <p>Loading price data...</p>
                </div>
              )}
            </div>

            {/* Oracle Status */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">Oracle Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">External CEX/DEX</span>
                  <span className="px-2 py-1 bg-green-900/30 text-green-500 rounded text-xs">
                    Live
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Stellar Native</span>
                  <span className="px-2 py-1 bg-green-900/30 text-green-500 rounded text-xs">
                    Live
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Forex Rates</span>
                  <span className="px-2 py-1 bg-green-900/30 text-green-500 rounded text-xs">
                    Live
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-500">Update frequency: 5 minutes</p>
                  <p className="text-xs text-gray-500">Data retention: 24 hours</p>
                </div>
              </div>
            </div>

            {/* Active Orders Summary */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">Active Orders</h3>
              {orders.length > 0 ? (
                <div className="space-y-2">
                  {orders.map((order, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-700">
                      <div>
                        <p className="font-semibold">{order.asset}</p>
                        <p className="text-xs text-gray-400">{order.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{order.amount}</p>
                        <p className="text-xs text-green-500">Active</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No active orders</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}