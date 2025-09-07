import { describe, it, expect, beforeAll } from '@jest/globals';
import * as StellarSdk from '@stellar/stellar-sdk';
import { 
  getCurrentPrice,
  getTWAPPrice,
  getCrossPrice,
  checkStablecoinPeg
} from '../frontend/lib/stellar';
import {
  REFLECTOR_EXTERNAL_ORACLE,
  REFLECTOR_STELLAR_ORACLE,
  REFLECTOR_FOREX_ORACLE,
  NETWORK
} from '../frontend/lib/constants';

describe('Reflector Oracle Integration Tests', () => {
  let server: StellarSdk.SorobanRpc.Server;

  beforeAll(() => {
    const rpcUrl = NETWORK === 'mainnet'
      ? 'https://soroban-rpc.stellar.org'
      : 'https://soroban-testnet.stellar.org';
    server = new StellarSdk.SorobanRpc.Server(rpcUrl);
  });

  describe('Spot Price Fetching', () => {
    it('should fetch BTC price from external oracle', async () => {
      const price = await getCurrentPrice('BTC', 'crypto');
      expect(price).toBeTruthy();
      const priceNum = Number(price) / Math.pow(10, 14);
      expect(priceNum).toBeGreaterThan(0);
      expect(priceNum).toBeLessThan(1000000); // Sanity check
      console.log(`BTC Spot Price: $${priceNum.toFixed(2)}`);
    });

    it('should fetch ETH price from external oracle', async () => {
      const price = await getCurrentPrice('ETH', 'crypto');
      expect(price).toBeTruthy();
      const priceNum = Number(price) / Math.pow(10, 14);
      expect(priceNum).toBeGreaterThan(0);
      expect(priceNum).toBeLessThan(100000); // Sanity check
      console.log(`ETH Spot Price: $${priceNum.toFixed(2)}`);
    });

    it('should fetch USD forex rate', async () => {
      const price = await getCurrentPrice('USD', 'forex');
      expect(price).toBeTruthy();
      const priceNum = Number(price) / Math.pow(10, 14);
      expect(priceNum).toBeCloseTo(1.0, 1); // USD should be ~1
      console.log(`USD Forex Rate: $${priceNum.toFixed(4)}`);
    });

    it('should fetch XLM price from Stellar oracle', async () => {
      const price = await getCurrentPrice('XLM', 'stellar');
      expect(price).toBeTruthy();
      const priceNum = Number(price) / Math.pow(10, 14);
      expect(priceNum).toBeGreaterThan(0);
      expect(priceNum).toBeLessThan(100); // Sanity check
      console.log(`XLM Price: $${priceNum.toFixed(4)}`);
    });
  });

  describe('TWAP Price Fetching', () => {
    it('should fetch BTC TWAP price for 5 periods', async () => {
      const twap = await getTWAPPrice('BTC', 5, 'crypto');
      expect(twap).toBeTruthy();
      const twapNum = Number(twap) / Math.pow(10, 14);
      expect(twapNum).toBeGreaterThan(0);
      console.log(`BTC TWAP (5 periods): $${twapNum.toFixed(2)}`);
    });

    it('should fetch ETH TWAP price for 10 periods', async () => {
      const twap = await getTWAPPrice('ETH', 10, 'crypto');
      expect(twap).toBeTruthy();
      const twapNum = Number(twap) / Math.pow(10, 14);
      expect(twapNum).toBeGreaterThan(0);
      console.log(`ETH TWAP (10 periods): $${twapNum.toFixed(2)}`);
    });

    it('should show TWAP is more stable than spot price', async () => {
      const spotPrices: number[] = [];
      const twapPrices: number[] = [];
      
      // Collect 3 samples
      for (let i = 0; i < 3; i++) {
        const spot = await getCurrentPrice('BTC', 'crypto');
        const twap = await getTWAPPrice('BTC', 5, 'crypto');
        
        spotPrices.push(Number(spot) / Math.pow(10, 14));
        twapPrices.push(Number(twap) / Math.pow(10, 14));
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      }

      // Calculate standard deviation
      const spotStdDev = calculateStdDev(spotPrices);
      const twapStdDev = calculateStdDev(twapPrices);
      
      console.log(`Spot Price Std Dev: ${spotStdDev.toFixed(4)}`);
      console.log(`TWAP Price Std Dev: ${twapStdDev.toFixed(4)}`);
      
      // TWAP should generally have lower or equal std deviation
      expect(twapStdDev).toBeLessThanOrEqual(spotStdDev * 1.1); // Allow 10% margin
    });
  });

  describe('Cross Price Calculations', () => {
    it('should calculate BTC/ETH cross price', async () => {
      const crossPrice = await getCrossPrice('BTC', 'ETH');
      expect(crossPrice).toBeTruthy();
      const crossPriceNum = Number(crossPrice) / Math.pow(10, 14);
      expect(crossPriceNum).toBeGreaterThan(10); // BTC should be worth >10 ETH
      expect(crossPriceNum).toBeLessThan(100); // But not more than 100 ETH
      console.log(`BTC/ETH Cross Price: ${crossPriceNum.toFixed(4)}`);
    });

    it('should calculate ETH/USDC cross price', async () => {
      const crossPrice = await getCrossPrice('ETH', 'USDC');
      expect(crossPrice).toBeTruthy();
      const crossPriceNum = Number(crossPrice) / Math.pow(10, 14);
      expect(crossPriceNum).toBeGreaterThan(100); // ETH should be worth >$100
      expect(crossPriceNum).toBeLessThan(100000); // But not more than $100k
      console.log(`ETH/USDC Cross Price: ${crossPriceNum.toFixed(2)}`);
    });

    it('should verify cross price consistency', async () => {
      const btcUsdc = await getCrossPrice('BTC', 'USDC');
      const ethUsdc = await getCrossPrice('ETH', 'USDC');
      const btcEth = await getCrossPrice('BTC', 'ETH');
      
      const btcUsdcNum = Number(btcUsdc) / Math.pow(10, 14);
      const ethUsdcNum = Number(ethUsdc) / Math.pow(10, 14);
      const btcEthNum = Number(btcEth) / Math.pow(10, 14);
      
      // Verify: BTC/USDC = (BTC/ETH) * (ETH/USDC)
      const calculated = btcEthNum * ethUsdcNum;
      const difference = Math.abs(calculated - btcUsdcNum) / btcUsdcNum;
      
      console.log(`BTC/USDC Direct: ${btcUsdcNum.toFixed(2)}`);
      console.log(`BTC/USDC Calculated: ${calculated.toFixed(2)}`);
      console.log(`Difference: ${(difference * 100).toFixed(2)}%`);
      
      expect(difference).toBeLessThan(0.02); // Less than 2% difference
    });
  });

  describe('Stablecoin Peg Monitoring', () => {
    it('should check USDC peg deviation', async () => {
      const deviation = await checkStablecoinPeg('USDC');
      expect(deviation).toBeDefined();
      
      if (deviation !== null) {
        console.log(`USDC Peg Deviation: ${deviation.toFixed(2)} basis points`);
        
        // USDC should be within 100 basis points (1%) of $1
        expect(Math.abs(deviation)).toBeLessThan(100);
        
        if (Math.abs(deviation) > 50) {
          console.warn(`⚠️ USDC showing significant deviation: ${deviation.toFixed(2)}bps`);
        }
      }
    });

    it('should check USDT peg deviation', async () => {
      const deviation = await checkStablecoinPeg('USDT');
      expect(deviation).toBeDefined();
      
      if (deviation !== null) {
        console.log(`USDT Peg Deviation: ${deviation.toFixed(2)} basis points`);
        
        // USDT should be within 100 basis points (1%) of $1
        expect(Math.abs(deviation)).toBeLessThan(100);
        
        if (Math.abs(deviation) > 50) {
          console.warn(`⚠️ USDT showing significant deviation: ${deviation.toFixed(2)}bps`);
        }
      }
    });
  });

  describe('Arbitrage Detection', () => {
    it('should detect arbitrage opportunities between CEX and DEX', async () => {
      // Get BTC price from external (CEX) oracle
      const cexPrice = await getCurrentPrice('BTC', 'crypto');
      // Try to get BTC price from Stellar (DEX) oracle
      const dexPrice = await getCurrentPrice('BTC', 'stellar');
      
      if (cexPrice && dexPrice) {
        const cexPriceNum = Number(cexPrice) / Math.pow(10, 14);
        const dexPriceNum = Number(dexPrice) / Math.pow(10, 14);
        const difference = ((cexPriceNum - dexPriceNum) / cexPriceNum) * 10000; // basis points
        
        console.log(`CEX BTC Price: $${cexPriceNum.toFixed(2)}`);
        console.log(`DEX BTC Price: $${dexPriceNum.toFixed(2)}`);
        console.log(`Price Difference: ${difference.toFixed(2)}bps`);
        
        if (Math.abs(difference) > 50) { // 0.5% threshold
          console.log(`💰 ARBITRAGE OPPORTUNITY DETECTED!`);
          console.log(`   Direction: ${difference > 0 ? 'Buy on DEX, Sell on CEX' : 'Buy on CEX, Sell on DEX'}`);
          console.log(`   Potential Profit: ${Math.abs(difference).toFixed(2)}bps`);
        }
      }
    });
  });

  describe('Liquidation Risk Assessment', () => {
    it('should calculate health factor for a leveraged position', async () => {
      // Simulated position: 1 BTC collateral, 30,000 USDC borrowed
      const btcPrice = await getCurrentPrice('BTC', 'crypto');
      const usdcPrice = await getCurrentPrice('USDC', 'crypto');
      
      if (btcPrice && usdcPrice) {
        const btcPriceNum = Number(btcPrice) / Math.pow(10, 14);
        const usdcPriceNum = Number(usdcPrice) / Math.pow(10, 14);
        
        const collateralValue = btcPriceNum * 1; // 1 BTC
        const borrowedValue = usdcPriceNum * 30000; // 30,000 USDC
        
        const collateralizationRatio = (collateralValue / borrowedValue) * 100;
        const liquidationThreshold = 150; // 150% collateralization required
        const healthFactor = collateralizationRatio / liquidationThreshold;
        
        console.log(`Position Health Check:`);
        console.log(`  Collateral: 1 BTC = $${collateralValue.toFixed(2)}`);
        console.log(`  Borrowed: 30,000 USDC = $${borrowedValue.toFixed(2)}`);
        console.log(`  Collateralization Ratio: ${collateralizationRatio.toFixed(2)}%`);
        console.log(`  Health Factor: ${healthFactor.toFixed(2)}`);
        
        if (healthFactor < 1.2) {
          console.warn(`⚠️ LIQUIDATION RISK: Health factor below safe threshold!`);
        }
        
        expect(healthFactor).toBeGreaterThan(0);
      }
    });
  });

  describe('Portfolio Rebalancing', () => {
    it('should calculate rebalancing actions for a portfolio', async () => {
      const portfolio = [
        { asset: 'BTC', amount: 0.5, targetPercent: 50 },
        { asset: 'ETH', amount: 5, targetPercent: 30 },
        { asset: 'USDC', amount: 10000, targetPercent: 20 }
      ];
      
      let totalValue = 0;
      const values: number[] = [];
      const actions: string[] = [];
      
      // Calculate current portfolio value
      for (const position of portfolio) {
        const price = await getTWAPPrice(position.asset, 5, 
          position.asset === 'USDC' ? 'crypto' : 'crypto');
        
        if (price) {
          const priceNum = Number(price) / Math.pow(10, 14);
          const value = priceNum * position.amount;
          values.push(value);
          totalValue += value;
        }
      }
      
      console.log(`Portfolio Analysis:`);
      console.log(`  Total Value: $${totalValue.toFixed(2)}`);
      
      // Check if rebalancing needed
      for (let i = 0; i < portfolio.length; i++) {
        const currentPercent = (values[i] / totalValue) * 100;
        const targetPercent = portfolio[i].targetPercent;
        const deviation = currentPercent - targetPercent;
        
        console.log(`  ${portfolio[i].asset}: ${currentPercent.toFixed(2)}% (target: ${targetPercent}%)`);
        
        if (Math.abs(deviation) > 5) { // 5% threshold
          if (deviation > 0) {
            actions.push(`Sell ${portfolio[i].asset}: ${deviation.toFixed(2)}% overweight`);
          } else {
            actions.push(`Buy ${portfolio[i].asset}: ${Math.abs(deviation).toFixed(2)}% underweight`);
          }
        }
      }
      
      if (actions.length > 0) {
        console.log(`Rebalancing Actions Required:`);
        actions.forEach(action => console.log(`  - ${action}`));
      } else {
        console.log(`Portfolio is balanced within threshold.`);
      }
      
      expect(totalValue).toBeGreaterThan(0);
    });
  });
});

// Helper function to calculate standard deviation
function calculateStdDev(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(variance);
}