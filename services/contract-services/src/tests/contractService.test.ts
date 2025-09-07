#!/usr/bin/env ts-node

/**
 * Comprehensive Test Suite for Contract Service V2
 * Tests all contract methods with proper parameters and validations
 */

import { ContractServiceV2, AssetTypeVariant, AssetType } from '../services/contractService.v2';
import { CONTRACTS, RPC_URL } from '../config/contracts';

// Enable mock mode for testing
process.env.MOCK_MODE = 'true';

// Test configuration
const TEST_ACCOUNT = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7XO3CMO6IXM3IKCAAZUUQFVB2V';
const LIQUIDATOR_ACCOUNT = 'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTMA';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test result tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

class ContractServiceTester {
  private service: ContractServiceV2;
  private results: TestResult[] = [];

  constructor() {
    this.service = new ContractServiceV2(RPC_URL);
    this.service.setSourceAccount(TEST_ACCOUNT);
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log(`${colors.cyan}🧪 StellarGuard Contract Service V2 - Comprehensive Test Suite${colors.reset}`);
    console.log('================================================================\n');

    // Stop-Loss Contract Tests
    await this.testStopLossContract();
    
    // Liquidation Contract Tests
    await this.testLiquidationContract();
    
    // Oracle Router Contract Tests
    await this.testOracleRouterContract();

    // Print summary
    this.printSummary();
  }

  /**
   * Test Stop-Loss Contract methods
   */
  private async testStopLossContract(): Promise<void> {
    console.log(`${colors.blue}📊 Testing Stop-Loss Contract${colors.reset}`);
    console.log('------------------------------\n');

    // Test create_stop_loss
    await this.runTest('Create Stop-Loss Order', async () => {
      const orderId = await this.service.createStopLoss({
        owner: TEST_ACCOUNT,
        asset: 'BTC',
        amount: 0.01,
        stopPrice: 95000
      });
      
      if (!orderId || orderId <= 0) {
        throw new Error(`Invalid order ID: ${orderId}`);
      }
      
      console.log(`   Created order ID: ${orderId}`);
      return orderId;
    });

    // Test create_trailing_stop
    await this.runTest('Create Trailing Stop Order', async () => {
      const orderId = await this.service.createTrailingStop({
        owner: TEST_ACCOUNT,
        asset: 'ETH',
        amount: 1,
        trailPercent: 5
      });
      
      if (!orderId || orderId <= 0) {
        throw new Error(`Invalid order ID: ${orderId}`);
      }
      
      console.log(`   Created trailing stop ID: ${orderId}`);
      return orderId;
    });

    // Test create_oco_order
    await this.runTest('Create OCO Order', async () => {
      const orderId = await this.service.createOCOOrder({
        owner: TEST_ACCOUNT,
        asset: 'BTC',
        amount: 0.01,
        stopPrice: 95000,
        limitPrice: 115000
      });
      
      if (!orderId || orderId <= 0) {
        throw new Error(`Invalid order ID: ${orderId}`);
      }
      
      console.log(`   Created OCO order ID: ${orderId}`);
      return orderId;
    });

    // Test create_twap_stop
    await this.runTest('Create TWAP Stop Order', async () => {
      const orderId = await this.service.createTWAPStop({
        owner: TEST_ACCOUNT,
        asset: 'ETH',
        amount: 1,
        stopPrice: 3500,
        periods: 10
      });
      
      if (!orderId || orderId <= 0) {
        throw new Error(`Invalid order ID: ${orderId}`);
      }
      
      console.log(`   Created TWAP stop ID: ${orderId}`);
      return orderId;
    });

    // Test create_cross_asset_stop
    await this.runTest('Create Cross-Asset Stop Order', async () => {
      const orderId = await this.service.createCrossAssetStop({
        owner: TEST_ACCOUNT,
        baseAsset: 'ETH',
        quoteAsset: 'BTC',
        amount: 1,
        stopRatio: 0.035 // ETH/BTC ratio
      });
      
      if (!orderId || orderId <= 0) {
        throw new Error(`Invalid order ID: ${orderId}`);
      }
      
      console.log(`   Created cross-asset stop ID: ${orderId}`);
      return orderId;
    });

    // Test check_and_execute
    await this.runTest('Check and Execute Order', async () => {
      const triggered = await this.service.checkAndExecute(1);
      console.log(`   Order trigger status: ${triggered ? 'TRIGGERED' : 'NOT TRIGGERED'}`);
      return triggered;
    });

    // Test check_and_execute_twap
    await this.runTest('Check and Execute TWAP Order', async () => {
      const triggered = await this.service.checkAndExecuteTWAP(4);
      console.log(`   TWAP order trigger status: ${triggered ? 'TRIGGERED' : 'NOT TRIGGERED'}`);
      return triggered;
    });

    // Test get_user_orders
    await this.runTest('Get User Orders', async () => {
      const orders = await this.service.getUserOrders(TEST_ACCOUNT);
      
      if (!Array.isArray(orders)) {
        throw new Error('Expected array of order IDs');
      }
      
      console.log(`   Found ${orders.length} orders: ${orders.join(', ')}`);
      return orders;
    });

    // Test get_order_details
    await this.runTest('Get Order Details', async () => {
      const details = await this.service.getOrderDetails(1);
      
      if (!details) {
        throw new Error('Failed to get order details');
      }
      
      console.log(`   Order status: ${details.status}`);
      console.log(`   Asset: ${details.asset}`);
      return details;
    });

    // Test get_price_volatility
    await this.runTest('Get Price Volatility', async () => {
      const volatility = await this.service.getPriceVolatility('BTC', 24);
      
      if (volatility === null) {
        throw new Error('Failed to get volatility');
      }
      
      console.log(`   BTC 24h volatility: ${volatility.toFixed(2)}%`);
      return volatility;
    });

    // Test cancel_order
    await this.runTest('Cancel Order', async () => {
      const success = await this.service.cancelOrder(TEST_ACCOUNT, 1);
      console.log(`   Cancel status: ${success ? 'SUCCESS' : 'FAILED'}`);
      return success;
    });

    console.log('');
  }

  /**
   * Test Liquidation Contract methods
   */
  private async testLiquidationContract(): Promise<void> {
    console.log(`${colors.blue}💰 Testing Liquidation Contract${colors.reset}`);
    console.log('--------------------------------\n');

    // Test initialize (will fail if already initialized)
    await this.runTest('Initialize Liquidation Contract', async () => {
      const success = await this.service.initializeLiquidation(CONTRACTS.ORACLE_ROUTER);
      console.log(`   Initialization: ${success ? 'SUCCESS' : 'ALREADY INITIALIZED'}`);
      return success;
    });

    // Test create_loan with correct AssetType
    await this.runTest('Create Loan', async () => {
      const collateralAsset: AssetType = {
        variant: AssetTypeVariant.Crypto,
        value: 'ETH'
      };
      
      const borrowedAsset: AssetType = {
        variant: AssetTypeVariant.Crypto,
        value: 'USDC'
      };
      
      const loanId = await this.service.createLoan({
        owner: TEST_ACCOUNT,
        collateralAsset,
        collateralAmount: 1, // 1 ETH
        borrowedAsset,
        borrowedAmount: 2000, // 2000 USDC
        liquidationThreshold: 150 // 150%
      });
      
      if (!loanId || loanId <= 0) {
        throw new Error(`Invalid loan ID: ${loanId}`);
      }
      
      console.log(`   Created loan ID: ${loanId}`);
      console.log(`   Collateral: 1 ETH`);
      console.log(`   Borrowed: 2000 USDC`);
      return loanId;
    });

    // Test create_loan with Stellar asset
    await this.runTest('Create Loan with Stellar Asset', async () => {
      const collateralAsset: AssetType = {
        variant: AssetTypeVariant.StellarNative,
        value: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC' // XLM contract
      };
      
      const borrowedAsset: AssetType = {
        variant: AssetTypeVariant.Crypto,
        value: 'USDC'
      };
      
      const loanId = await this.service.createLoan({
        owner: TEST_ACCOUNT,
        collateralAsset,
        collateralAmount: 10000, // 10000 XLM
        borrowedAsset,
        borrowedAmount: 1000, // 1000 USDC
        liquidationThreshold: 200 // 200%
      });
      
      if (!loanId || loanId <= 0) {
        throw new Error(`Invalid loan ID: ${loanId}`);
      }
      
      console.log(`   Created loan ID: ${loanId}`);
      console.log(`   Collateral: 10000 XLM`);
      console.log(`   Borrowed: 1000 USDC`);
      return loanId;
    });

    // Test get_health_factor_twap
    await this.runTest('Get Health Factor (TWAP)', async () => {
      const healthFactor = await this.service.getHealthFactorTWAP(1, 10);
      
      if (healthFactor === null) {
        throw new Error('Failed to get health factor');
      }
      
      console.log(`   Health Factor: ${healthFactor.toFixed(2)}`);
      console.log(`   Status: ${healthFactor < 1 ? '🚨 CRITICAL' : healthFactor < 1.2 ? '⚠️ AT RISK' : '✅ HEALTHY'}`);
      return healthFactor;
    });

    // Test check_liquidation
    await this.runTest('Check Liquidation Status', async () => {
      const needsLiquidation = await this.service.checkLiquidation(1);
      console.log(`   Liquidation needed: ${needsLiquidation ? '🚨 YES' : '✅ NO'}`);
      return needsLiquidation;
    });

    // Test add_collateral
    await this.runTest('Add Collateral', async () => {
      const success = await this.service.addCollateral(TEST_ACCOUNT, 1, 0.5);
      console.log(`   Added 0.5 ETH collateral: ${success ? 'SUCCESS' : 'FAILED'}`);
      return success;
    });

    // Test repay_loan
    await this.runTest('Repay Loan', async () => {
      const success = await this.service.repayLoan(TEST_ACCOUNT, 1, 500);
      console.log(`   Repaid 500 USDC: ${success ? 'SUCCESS' : 'FAILED'}`);
      return success;
    });

    // Test liquidate_position
    await this.runTest('Liquidate Position', async () => {
      const reward = await this.service.liquidatePosition(LIQUIDATOR_ACCOUNT, 1);
      
      if (reward !== null) {
        console.log(`   Liquidation reward: ${reward.toFixed(4)} ETH`);
      } else {
        console.log(`   Liquidation not available (loan healthy)`);
      }
      
      return reward;
    });

    console.log('');
  }

  /**
   * Test Oracle Router Contract methods
   */
  private async testOracleRouterContract(): Promise<void> {
    console.log(`${colors.blue}🔮 Testing Oracle Router Contract${colors.reset}`);
    console.log('----------------------------------\n');

    // Test initialize
    await this.runTest('Initialize Oracle Router', async () => {
      const success = await this.service.initializeOracleRouter('Testnet');
      console.log(`   Initialization: ${success ? 'SUCCESS' : 'ALREADY INITIALIZED'}`);
      return success;
    });

    // Test get_oracle_for_asset
    await this.runTest('Get Oracle for Asset', async () => {
      const cryptoAsset: AssetType = {
        variant: AssetTypeVariant.Crypto,
        value: 'BTC'
      };
      
      const oracle = await this.service.getOracleForAsset(cryptoAsset);
      
      if (!oracle) {
        throw new Error('Failed to get oracle address');
      }
      
      console.log(`   BTC Oracle: ${oracle.substring(0, 10)}...`);
      return oracle;
    });

    // Test get_price for different asset types
    await this.runTest('Get Price (Crypto)', async () => {
      const asset: AssetType = {
        variant: AssetTypeVariant.Crypto,
        value: 'BTC'
      };
      
      const priceData = await this.service.getPrice(asset);
      
      if (!priceData) {
        throw new Error('Failed to get price data');
      }
      
      const price = Number(priceData.price) / 1e14;
      console.log(`   BTC Price: $${price.toFixed(2)}`);
      return priceData;
    });

    await this.runTest('Get Price (Stablecoin)', async () => {
      const asset: AssetType = {
        variant: AssetTypeVariant.Stablecoin,
        value: 'USDC'
      };
      
      const priceData = await this.service.getPrice(asset);
      
      if (!priceData) {
        throw new Error('Failed to get price data');
      }
      
      const price = Number(priceData.price) / 1e14;
      console.log(`   USDC Price: $${price.toFixed(4)}`);
      return priceData;
    });

    await this.runTest('Get Price (Forex)', async () => {
      const asset: AssetType = {
        variant: AssetTypeVariant.Forex,
        value: 'EUR'
      };
      
      const priceData = await this.service.getPrice(asset);
      
      if (!priceData) {
        throw new Error('Failed to get price data');
      }
      
      const price = Number(priceData.price) / 1e14;
      console.log(`   EUR/USD: $${price.toFixed(4)}`);
      return priceData;
    });

    // Test get_twap
    await this.runTest('Get TWAP Price', async () => {
      const asset: AssetType = {
        variant: AssetTypeVariant.Crypto,
        value: 'ETH'
      };
      
      const twapPrice = await this.service.getTWAP(asset, 24);
      
      if (twapPrice === null) {
        throw new Error('Failed to get TWAP price');
      }
      
      console.log(`   ETH 24h TWAP: $${twapPrice.toFixed(2)}`);
      return twapPrice;
    });

    // Test get_cross_price
    await this.runTest('Get Cross Price', async () => {
      const baseAsset: AssetType = {
        variant: AssetTypeVariant.Crypto,
        value: 'ETH'
      };
      
      const quoteAsset: AssetType = {
        variant: AssetTypeVariant.Crypto,
        value: 'BTC'
      };
      
      const crossPrice = await this.service.getCrossPrice(baseAsset, quoteAsset);
      
      if (!crossPrice) {
        throw new Error('Failed to get cross price');
      }
      
      const ratio = Number(crossPrice.price) / 1e14;
      console.log(`   ETH/BTC: ${ratio.toFixed(6)}`);
      return crossPrice;
    });

    // Test get_cross_twap
    await this.runTest('Get Cross TWAP', async () => {
      const baseAsset: AssetType = {
        variant: AssetTypeVariant.Crypto,
        value: 'SOL'
      };
      
      const quoteAsset: AssetType = {
        variant: AssetTypeVariant.Stablecoin,
        value: 'USDC'
      };
      
      const crossTwap = await this.service.getCrossTWAP(baseAsset, quoteAsset, 12);
      
      if (crossTwap === null) {
        throw new Error('Failed to get cross TWAP');
      }
      
      console.log(`   SOL/USDC 12h TWAP: $${crossTwap.toFixed(2)}`);
      return crossTwap;
    });

    // Test check_arbitrage
    await this.runTest('Check Arbitrage', async () => {
      const arbitrage = await this.service.checkArbitrage('BTC');
      
      if (arbitrage === null) {
        throw new Error('Failed to check arbitrage');
      }
      
      console.log(`   BTC Arbitrage: ${arbitrage > 0 ? '+' : ''}${arbitrage.toFixed(2)}%`);
      console.log(`   Opportunity: ${Math.abs(arbitrage) > 1 ? '🔥 HOT' : Math.abs(arbitrage) > 0.5 ? '📊 MODERATE' : '❄️ COLD'}`);
      return arbitrage;
    });

    // Test check_stablecoin_peg
    await this.runTest('Check Stablecoin Peg', async () => {
      const pegDeviation = await this.service.checkStablecoinPeg('USDC');
      
      if (pegDeviation === null) {
        throw new Error('Failed to check peg');
      }
      
      console.log(`   USDC Peg Deviation: ${pegDeviation > 0 ? '+' : ''}${pegDeviation.toFixed(3)}%`);
      console.log(`   Status: ${Math.abs(pegDeviation) < 0.1 ? '✅ STABLE' : Math.abs(pegDeviation) < 0.5 ? '⚠️ SLIGHT DEVIATION' : '🚨 SIGNIFICANT DEVIATION'}`);
      return pegDeviation;
    });

    console.log('');
  }

  /**
   * Run a single test
   */
  private async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        name,
        passed: true,
        duration
      });
      
      console.log(`${colors.green}✅ ${name} (${duration}ms)${colors.reset}\n`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        name,
        passed: false,
        error: error.message,
        duration
      });
      
      console.log(`${colors.red}❌ ${name} (${duration}ms)${colors.reset}`);
      console.log(`   Error: ${error.message}\n`);
    }
  }

  /**
   * Print test summary
   */
  private printSummary(): void {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log('================================================================');
    console.log(`${colors.cyan}📊 TEST SUMMARY${colors.reset}`);
    console.log('================================================================\n');
    
    // List all tests with results
    this.results.forEach((result, index) => {
      const status = result.passed ? 
        `${colors.green}PASS${colors.reset}` : 
        `${colors.red}FAIL${colors.reset}`;
      console.log(`${(index + 1).toString().padStart(2)}. ${result.name.padEnd(40)} ${status} (${result.duration}ms)`);
    });
    
    console.log('\n----------------------------------------------------------------');
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    
    if (failed === 0) {
      console.log(`\n${colors.green}🎉 ALL TESTS PASSED!${colors.reset}`);
    } else {
      console.log(`\n${colors.yellow}⚠️ Some tests failed. Review the errors above.${colors.reset}`);
      
      // List failed tests
      console.log('\nFailed Tests:');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }
  }
}

// Run tests
async function main() {
  const tester = new ContractServiceTester();
  await tester.runAllTests();
}

main().catch(console.error);