/**
 * Monitoring Service
 * Monitors stop-loss orders and loan positions for triggers and liquidations
 */

import { ContractService } from './contractService';
import { RPC_URL } from '../config/contracts';

interface StopLossOrder {
  id: number;
  owner: string;
  asset: string;
  amount: number;
  stopPrice: number;
}

interface LoanPosition {
  id: number;
  owner: string;
  collateralAsset: string;
  borrowedAsset: string;
  healthThreshold: number;
}

export class MonitoringService {
  private contractService: ContractService;
  private monitoringInterval: NodeJS.Timer | null = null;
  private stopLossOrders: Map<number, StopLossOrder> = new Map();
  private loanPositions: Map<number, LoanPosition> = new Map();

  constructor() {
    this.contractService = new ContractService(RPC_URL);
  }

  /**
   * Add a stop-loss order to monitor
   */
  addStopLossOrder(order: StopLossOrder): void {
    this.stopLossOrders.set(order.id, order);
    console.log(`📊 Monitoring stop-loss order ${order.id} for ${order.asset}`);
  }

  /**
   * Add a loan position to monitor
   */
  addLoanPosition(loan: LoanPosition): void {
    this.loanPositions.set(loan.id, loan);
    console.log(`💰 Monitoring loan position ${loan.id}`);
  }

  /**
   * Start monitoring all positions
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      console.log('⚠️ Monitoring already active');
      return;
    }

    console.log(`🚀 Starting monitoring service (checking every ${intervalMs / 1000}s)`);

    this.monitoringInterval = setInterval(async () => {
      await this.checkAllPositions();
    }, intervalMs);

    // Run initial check
    this.checkAllPositions();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 Monitoring service stopped');
    }
  }

  /**
   * Check all positions for triggers
   */
  private async checkAllPositions(): Promise<void> {
    console.log(`\n⏰ Running position checks at ${new Date().toISOString()}`);

    // Check stop-loss orders
    for (const [orderId, order] of this.stopLossOrders) {
      await this.checkStopLossOrder(orderId, order);
    }

    // Check loan positions
    for (const [loanId, loan] of this.loanPositions) {
      await this.checkLoanPosition(loanId, loan);
    }

    // Check for arbitrage opportunities
    await this.checkArbitrageOpportunities();

    // Check stablecoin pegs
    await this.checkStablecoinPegs();
  }

  /**
   * Check individual stop-loss order
   */
  private async checkStopLossOrder(orderId: number, order: StopLossOrder): Promise<void> {
    try {
      // Get current price
      const currentPrice = await this.contractService.getAssetPrice(order.asset);
      if (!currentPrice) {
        console.log(`  ⚠️ Could not fetch price for ${order.asset}`);
        return;
      }

      // Check if stop-loss should trigger
      const shouldTrigger = await this.contractService.checkStopLossTrigger(orderId);

      console.log(`  📉 Stop-Loss #${orderId} [${order.asset}]:`);
      console.log(`     Current: $${currentPrice.toFixed(2)} | Stop: $${order.stopPrice.toFixed(2)}`);
      console.log(`     Status: ${shouldTrigger ? '🚨 TRIGGERED' : '✅ Safe'}`);

      if (shouldTrigger) {
        this.handleStopLossTrigger(orderId, order, currentPrice);
      }
    } catch (error) {
      console.error(`  ❌ Error checking stop-loss ${orderId}:`, error);
    }
  }

  /**
   * Check individual loan position
   */
  private async checkLoanPosition(loanId: number, loan: LoanPosition): Promise<void> {
    try {
      // Get health factor
      const healthFactor = await this.contractService.getLoanHealthFactor(loanId);
      if (healthFactor === null) {
        console.log(`  ⚠️ Could not fetch health factor for loan ${loanId}`);
        return;
      }

      // Check if liquidation is needed
      const needsLiquidation = await this.contractService.checkLiquidation(loanId);

      console.log(`  💰 Loan #${loanId}:`);
      console.log(`     Health Factor: ${healthFactor.toFixed(2)}`);
      console.log(`     Status: ${needsLiquidation ? '🚨 NEEDS LIQUIDATION' : healthFactor < 1.2 ? '⚠️ At Risk' : '✅ Healthy'}`);

      if (needsLiquidation) {
        this.handleLiquidationNeeded(loanId, loan, healthFactor);
      } else if (healthFactor < 1.2) {
        this.handleLoanAtRisk(loanId, loan, healthFactor);
      }
    } catch (error) {
      console.error(`  ❌ Error checking loan ${loanId}:`, error);
    }
  }

  /**
   * Check for arbitrage opportunities
   */
  private async checkArbitrageOpportunities(): Promise<void> {
    const assets = ['BTC', 'ETH', 'XLM'];
    
    console.log('\n  💹 Arbitrage Opportunities:');
    for (const asset of assets) {
      const deviation = await this.contractService.checkArbitrage(asset);
      if (deviation !== null && Math.abs(deviation) > 0.5) {
        console.log(`     ${asset}: ${deviation > 0 ? '+' : ''}${deviation.toFixed(2)}% ${Math.abs(deviation) > 1 ? '🔥 HOT' : '📊'}`);
      }
    }
  }

  /**
   * Check stablecoin pegs
   */
  private async checkStablecoinPegs(): Promise<void> {
    const stablecoins = ['USDC', 'USDT'];
    
    console.log('\n  💵 Stablecoin Peg Status:');
    for (const stable of stablecoins) {
      const deviation = await this.contractService.checkStablecoinPeg(stable);
      if (deviation !== null) {
        const status = Math.abs(deviation) < 0.1 ? '✅' : Math.abs(deviation) < 0.5 ? '⚠️' : '🚨';
        console.log(`     ${stable}: ${deviation > 0 ? '+' : ''}${deviation.toFixed(3)}% ${status}`);
      }
    }
  }

  /**
   * Handle stop-loss trigger
   */
  private handleStopLossTrigger(orderId: number, order: StopLossOrder, currentPrice: number): void {
    console.log(`\n🚨 ALERT: Stop-Loss Order ${orderId} TRIGGERED!`);
    console.log(`   Asset: ${order.asset}`);
    console.log(`   Amount: ${order.amount}`);
    console.log(`   Stop Price: $${order.stopPrice.toFixed(2)}`);
    console.log(`   Current Price: $${currentPrice.toFixed(2)}`);
    console.log(`   Owner: ${order.owner}`);
    
    // In production, you would:
    // 1. Execute the sell order
    // 2. Notify the owner
    // 3. Update order status
    // 4. Remove from monitoring
    
    this.stopLossOrders.delete(orderId);
  }

  /**
   * Handle liquidation needed
   */
  private handleLiquidationNeeded(loanId: number, loan: LoanPosition, healthFactor: number): void {
    console.log(`\n🚨 ALERT: Loan ${loanId} NEEDS LIQUIDATION!`);
    console.log(`   Health Factor: ${healthFactor.toFixed(2)}`);
    console.log(`   Collateral: ${loan.collateralAsset}`);
    console.log(`   Borrowed: ${loan.borrowedAsset}`);
    console.log(`   Owner: ${loan.owner}`);
    
    // In production, you would:
    // 1. Trigger liquidation process
    // 2. Notify liquidators
    // 3. Update loan status
  }

  /**
   * Handle loan at risk
   */
  private handleLoanAtRisk(loanId: number, loan: LoanPosition, healthFactor: number): void {
    console.log(`\n⚠️ WARNING: Loan ${loanId} is at risk`);
    console.log(`   Health Factor: ${healthFactor.toFixed(2)}`);
    console.log(`   Consider adding collateral or repaying debt`);
    
    // In production, you would notify the owner
  }
}