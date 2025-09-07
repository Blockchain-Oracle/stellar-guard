'use client';

import { useState } from 'react';
import { TrendingDown, Shield, AlertTriangle, Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface StopLossFormData {
  asset: string;
  amount: string;
  stopPrice: string;
  orderType: 'standard' | 'trailing' | 'oco';
  trailPercent?: string;
  limitPrice?: string;
}

export default function StopLossForm() {
  const [formData, setFormData] = useState<StopLossFormData>({
    asset: 'BTC',
    amount: '',
    stopPrice: '',
    orderType: 'standard',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.amount || !formData.stopPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: Implement contract call
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      toast.success('Stop-loss order created successfully!');
      
      // Reset form
      setFormData({
        asset: 'BTC',
        amount: '',
        stopPrice: '',
        orderType: 'standard',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create stop-loss order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPrice = 111579; // This would come from real-time data

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <div className="flex items-center mb-6">
        <Shield className="h-6 w-6 text-blue-500 mr-3" />
        <h2 className="text-xl font-bold text-white">Create Stop-Loss Order</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Type */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Order Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['standard', 'trailing', 'oco'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, orderType: type as any }))}
                className={`py-2 px-4 rounded-lg font-medium transition ${
                  formData.orderType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {type === 'standard' && 'Standard'}
                {type === 'trailing' && 'Trailing'}
                {type === 'oco' && 'OCO'}
              </button>
            ))}
          </div>
        </div>

        {/* Asset Selection */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Asset
          </label>
          <select
            name="asset"
            value={formData.asset}
            onChange={handleInputChange}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="BTC">Bitcoin (BTC)</option>
            <option value="ETH">Ethereum (ETH)</option>
            <option value="XLM">Stellar (XLM)</option>
            <option value="SOL">Solana (SOL)</option>
          </select>
          <div className="mt-1 text-sm text-gray-500">
            Current price: ${currentPrice.toLocaleString()}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Amount
          </label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleInputChange}
            placeholder="0.00"
            step="0.00000001"
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Stop Price */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Stop Price
          </label>
          <input
            type="number"
            name="stopPrice"
            value={formData.stopPrice}
            onChange={handleInputChange}
            placeholder="0.00"
            step="0.01"
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {formData.stopPrice && parseFloat(formData.stopPrice) < currentPrice && (
            <div className="mt-2 flex items-center text-sm text-yellow-500">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Stop price is {((1 - parseFloat(formData.stopPrice) / currentPrice) * 100).toFixed(2)}% below current price
            </div>
          )}
        </div>

        {/* Trailing Percent (for trailing stop) */}
        {formData.orderType === 'trailing' && (
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Trail Percent (%)
            </label>
            <input
              type="number"
              name="trailPercent"
              value={formData.trailPercent || ''}
              onChange={handleInputChange}
              placeholder="5"
              step="0.1"
              min="0.1"
              max="50"
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={formData.orderType === 'trailing'}
            />
          </div>
        )}

        {/* Limit Price (for OCO) */}
        {formData.orderType === 'oco' && (
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Limit Price (Take Profit)
            </label>
            <input
              type="number"
              name="limitPrice"
              value={formData.limitPrice || ''}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={formData.orderType === 'oco'}
            />
            {formData.limitPrice && parseFloat(formData.limitPrice) > currentPrice && (
              <div className="mt-2 flex items-center text-sm text-green-500">
                <TrendingDown className="h-4 w-4 mr-1 rotate-180" />
                Take profit at {((parseFloat(formData.limitPrice) / currentPrice - 1) * 100).toFixed(2)}% gain
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-gray-800 rounded-lg p-4 flex items-start">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-gray-400">
            {formData.orderType === 'standard' && (
              <span>
                A standard stop-loss will automatically sell your {formData.asset} when the price 
                drops to ${formData.stopPrice || '...'}.
              </span>
            )}
            {formData.orderType === 'trailing' && (
              <span>
                A trailing stop follows the price up and triggers when it drops by {formData.trailPercent || '...'}% 
                from the highest point.
              </span>
            )}
            {formData.orderType === 'oco' && (
              <span>
                An OCO (One-Cancels-Other) order combines a stop-loss at ${formData.stopPrice || '...'} 
                with a take-profit at ${formData.limitPrice || '...'}.
              </span>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Creating Order...
            </>
          ) : (
            <>
              <Shield className="h-5 w-5 mr-2" />
              Create Stop-Loss Order
            </>
          )}
        </button>
      </form>
    </div>
  );
}