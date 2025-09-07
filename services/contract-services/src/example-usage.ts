#!/usr/bin/env ts-node

/**
 * Example Usage of StellarGuard Services
 * Demonstrates how to use the contract and monitoring services
 */

import { ContractService } from './services/contractService';
import { MonitoringService } from './services/monitoringService';
import { RPC_URL } from './config/contracts';

async function main() {
  console.log('🚀 StellarGuard Services Example');
  console.log('=================================\n');

  // Initialize services
  const contractService = new ContractService(RPC_URL);
  const monitoringService = new MonitoringService();

  // Example user address (replace with actual funded account)
  const userAddress = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7XO3CMO6IXM3IKCAAZUUQFVB2V';

  try {
    // 1. Get current prices
    console.log('📊 Fetching Current Prices:');
    const btcPrice = await contractService.getAssetPrice('BTC');
    const ethPrice = await contractService.getAssetPrice('ETH');
    
    if (btcPrice) console.log(`   BTC: $${btcPrice.toFixed(2)}`);
    if (ethPrice) console.log(`   ETH: $${ethPrice.toFixed(2)}`);

    // 2. Create a stop-loss order
    console.log('\n🛑 Creating Stop-Loss Order:');
    const stopLossOrderId = await contractService.createStopLossOrder({
      owner: userAddress,
      asset: 'BTC',
      amount: 0.01, // 0.01 BTC
      stopPrice: 95000 // Stop at $95,000
    });

    if (stopLossOrderId !== null) {
      console.log(`   ✅ Stop-Loss Order Created: #${stopLossOrderId}`);
      
      // Add to monitoring
      monitoringService.addStopLossOrder({
        id: stopLossOrderId,
        owner: userAddress,
        asset: 'BTC',
        amount: 0.01,
        stopPrice: 95000
      });
    }

    // 3. Create a loan position
    console.log('\n💰 Creating Loan Position:');
    const loanId = await contractService.createLoan({
      owner: userAddress,
      collateralAsset: { type: 'Crypto', value: 'ETH' },
      collateralAmount: 1, // 1 ETH as collateral
      borrowedAsset: { type: 'Crypto', value: 'USDC' },
      borrowedAmount: 2000, // Borrow 2000 USDC
      liquidationThreshold: 150 // Liquidate at 150% collateralization
    });

    if (loanId !== null) {
      console.log(`   ✅ Loan Created: #${loanId}`);
      console.log(`   Collateral: 1 ETH`);
      console.log(`   Borrowed: 2000 USDC`);
      console.log(`   Liquidation at: 150% ratio`);
      
      // Add to monitoring
      monitoringService.addLoanPosition({
        id: loanId,
        owner: userAddress,
        collateralAsset: 'ETH',
        borrowedAsset: 'USDC',
        healthThreshold: 1.5
      });

      // Check health factor
      const healthFactor = await contractService.getLoanHealthFactor(loanId);
      if (healthFactor !== null) {
        console.log(`   Health Factor: ${healthFactor.toFixed(2)}`);
      }
    }

    // 4. Check arbitrage opportunities
    console.log('\n💹 Checking Arbitrage Opportunities:');
    const btcArbitrage = await contractService.checkArbitrage('BTC');
    const ethArbitrage = await contractService.checkArbitrage('ETH');
    
    if (btcArbitrage !== null) {
      console.log(`   BTC: ${btcArbitrage > 0 ? '+' : ''}${btcArbitrage.toFixed(2)}% deviation`);
    }
    if (ethArbitrage !== null) {
      console.log(`   ETH: ${ethArbitrage > 0 ? '+' : ''}${ethArbitrage.toFixed(2)}% deviation`);
    }

    // 5. Check stablecoin pegs
    console.log('\n💵 Checking Stablecoin Pegs:');
    const usdcPeg = await contractService.checkStablecoinPeg('USDC');
    const usdtPeg = await contractService.checkStablecoinPeg('USDT');
    
    if (usdcPeg !== null) {
      console.log(`   USDC: ${usdcPeg > 0 ? '+' : ''}${usdcPeg.toFixed(3)}% from peg`);
    }
    if (usdtPeg !== null) {
      console.log(`   USDT: ${usdtPeg > 0 ? '+' : ''}${usdtPeg.toFixed(3)}% from peg`);
    }

    // 6. Start monitoring service
    console.log('\n🔍 Starting Monitoring Service:');
    console.log('   Checking positions every 30 seconds...');
    console.log('   Press Ctrl+C to stop\n');
    
    monitoringService.startMonitoring(30000); // Check every 30 seconds

    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Stopping monitoring service...');
      monitoringService.stopMonitoring();
      process.exit(0);
    });

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the example
main().catch(console.error);