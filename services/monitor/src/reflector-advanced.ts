import * as StellarSdk from '@stellar/stellar-sdk';

// Network-specific Oracle Addresses
const MAINNET_ORACLES = {
  external: 'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN',
  stellar: 'CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M',
  forex: 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC',
};

const TESTNET_ORACLES = {
  external: 'CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63',
  stellar: 'CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP',
  forex: 'CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W',
};

export class AdvancedReflectorMonitor {
  private server: StellarSdk.SorobanRpc.Server;
  private network: 'mainnet' | 'testnet';
  private oracles: typeof MAINNET_ORACLES;
  private priceCache: Map<string, { price: number; twap: number; timestamp: number }> = new Map();
  private arbitrageThreshold = 50; // 0.5% in basis points

  constructor(network: 'mainnet' | 'testnet' = 'testnet') {
    this.network = network;
    this.oracles = network === 'mainnet' ? MAINNET_ORACLES : TESTNET_ORACLES;
    
    const rpcUrl = network === 'mainnet' 
      ? 'https://soroban-rpc.stellar.org'
      : 'https://soroban-testnet.stellar.org';
    
    this.server = new StellarSdk.SorobanRpc.Server(rpcUrl);
    
    console.log(`🔮 Advanced Reflector Monitor initialized on ${network}`);
  }

  // Get price from appropriate oracle based on asset type
  async getSmartPrice(asset: string, assetType: 'crypto' | 'stellar' | 'forex'): Promise<number | null> {
    const oracleAddress = this.getOracleForAssetType(assetType);
    return await this.getPriceFromOracle(asset, oracleAddress);
  }

  // Get TWAP price for more stable monitoring
  async getTWAPPrice(asset: string, periods: number = 5): Promise<number | null> {
    const cached = this.priceCache.get(asset);
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.twap;
    }

    try {
      const oracleAddress = this.oracles.external;
      const contract = new StellarSdk.Contract(oracleAddress);
      
      const tx = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
        {
          fee: '100000',
          networkPassphrase: this.network === 'mainnet' 
            ? StellarSdk.Networks.PUBLIC 
            : StellarSdk.Networks.TESTNET,
        }
      )
        .addOperation(
          contract.call('twap', 
            StellarSdk.xdr.ScVal.scvMap([
              new StellarSdk.xdr.ScMapEntry({
                key: StellarSdk.xdr.ScVal.scvSymbol('Other'),
                val: StellarSdk.xdr.ScVal.scvSymbol(asset)
              })
            ]),
            StellarSdk.xdr.ScVal.scvU32(periods)
          )
        )
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(tx);
      
      if (simulated.result) {
        const twap = this.parsePrice(simulated.result);
        
        // Update cache
        const existing = this.priceCache.get(asset) || { price: 0, twap: 0, timestamp: 0 };
        this.priceCache.set(asset, { ...existing, twap, timestamp: Date.now() });
        
        return twap;
      }
    } catch (error) {
      console.error(`❌ Failed to get TWAP for ${asset}:`, error);
    }

    return null;
  }

  // Check for arbitrage opportunities between CEX and DEX
  async checkArbitrage(asset: string): Promise<{ opportunity: boolean; difference: number } | null> {
    try {
      // Get price from external (CEX) oracle
      const cexPrice = await this.getPriceFromOracle(asset, this.oracles.external);
      
      // Get price from Stellar (DEX) oracle if available
      const dexPrice = await this.getPriceFromOracle(asset, this.oracles.stellar);
      
      if (cexPrice && dexPrice) {
        const difference = ((cexPrice - dexPrice) / cexPrice) * 10000; // basis points
        const opportunity = Math.abs(difference) > this.arbitrageThreshold;
        
        if (opportunity) {
          console.log(`💰 ARBITRAGE OPPORTUNITY: ${asset}`);
          console.log(`   CEX: $${cexPrice.toFixed(4)}`);
          console.log(`   DEX: $${dexPrice.toFixed(4)}`);
          console.log(`   Difference: ${difference.toFixed(2)}bps`);
        }
        
        return { opportunity, difference };
      }
    } catch (error) {
      console.error(`Failed to check arbitrage for ${asset}:`, error);
    }
    
    return null;
  }

  // Monitor stablecoin peg stability
  async checkStablecoinPeg(stablecoin: string): Promise<{ stable: boolean; deviation: number } | null> {
    try {
      // Get stablecoin price from external oracle
      const stablePrice = await this.getPriceFromOracle(stablecoin, this.oracles.external);
      
      // Get USD forex rate (should be ~1.0)
      const usdPrice = await this.getPriceFromOracle('USD', this.oracles.forex);
      
      if (stablePrice && usdPrice) {
        const deviation = ((stablePrice - usdPrice) / usdPrice) * 10000; // basis points
        const stable = Math.abs(deviation) < 100; // Consider stable if < 1%
        
        if (!stable) {
          console.log(`⚠️ STABLECOIN DEPEG WARNING: ${stablecoin}`);
          console.log(`   Price: $${stablePrice.toFixed(4)}`);
          console.log(`   USD: $${usdPrice.toFixed(4)}`);
          console.log(`   Deviation: ${deviation.toFixed(2)}bps`);
        }
        
        return { stable, deviation };
      }
    } catch (error) {
      console.error(`Failed to check peg for ${stablecoin}:`, error);
    }
    
    return null;
  }

  // Get cross price between two assets
  async getCrossPrice(baseAsset: string, quoteAsset: string): Promise<number | null> {
    try {
      const contract = new StellarSdk.Contract(this.oracles.external);
      
      const tx = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
        {
          fee: '100000',
          networkPassphrase: this.network === 'mainnet' 
            ? StellarSdk.Networks.PUBLIC 
            : StellarSdk.Networks.TESTNET,
        }
      )
        .addOperation(
          contract.call('x_last_price',
            StellarSdk.xdr.ScVal.scvMap([
              new StellarSdk.xdr.ScMapEntry({
                key: StellarSdk.xdr.ScVal.scvSymbol('Other'),
                val: StellarSdk.xdr.ScVal.scvSymbol(baseAsset)
              })
            ]),
            StellarSdk.xdr.ScVal.scvMap([
              new StellarSdk.xdr.ScMapEntry({
                key: StellarSdk.xdr.ScVal.scvSymbol('Other'),
                val: StellarSdk.xdr.ScVal.scvSymbol(quoteAsset)
              })
            ])
          )
        )
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(tx);
      
      if (simulated.result) {
        return this.parsePrice(simulated.result);
      }
    } catch (error) {
      console.error(`Failed to get cross price ${baseAsset}/${quoteAsset}:`, error);
    }
    
    return null;
  }

  // Monitor portfolio health with multiple assets
  async monitorPortfolioHealth(positions: { asset: string; amount: number; target: number }[]): Promise<{
    healthy: boolean;
    rebalanceNeeded: boolean;
    actions: string[];
  }> {
    const actions: string[] = [];
    let totalValue = 0;
    const values: number[] = [];
    
    // Calculate current portfolio value
    for (const position of positions) {
      const price = await this.getTWAPPrice(position.asset) || 0;
      const value = price * position.amount;
      values.push(value);
      totalValue += value;
    }
    
    // Check if rebalancing is needed
    let rebalanceNeeded = false;
    
    for (let i = 0; i < positions.length; i++) {
      const currentPercentage = (values[i] / totalValue) * 100;
      const targetPercentage = positions[i].target;
      const deviation = Math.abs(currentPercentage - targetPercentage);
      
      if (deviation > 5) { // 5% threshold
        rebalanceNeeded = true;
        
        if (currentPercentage > targetPercentage) {
          actions.push(`Sell ${positions[i].asset}: ${deviation.toFixed(2)}% overweight`);
        } else {
          actions.push(`Buy ${positions[i].asset}: ${deviation.toFixed(2)}% underweight`);
        }
      }
    }
    
    const healthy = !rebalanceNeeded && totalValue > 0;
    
    if (rebalanceNeeded) {
      console.log('📊 PORTFOLIO REBALANCING NEEDED:');
      actions.forEach(action => console.log(`   - ${action}`));
    }
    
    return { healthy, rebalanceNeeded, actions };
  }

  // Monitor liquidation risk for leveraged positions
  async checkLiquidationRisk(
    collateralAsset: string,
    collateralAmount: number,
    borrowedAsset: string,
    borrowedAmount: number,
    liquidationThreshold: number
  ): Promise<{ atRisk: boolean; healthFactor: number }> {
    const collateralPrice = await this.getTWAPPrice(collateralAsset) || 0;
    const borrowedPrice = await this.getTWAPPrice(borrowedAsset) || 0;
    
    const collateralValue = collateralPrice * collateralAmount;
    const borrowedValue = borrowedPrice * borrowedAmount;
    
    const collateralizationRatio = (collateralValue / borrowedValue) * 100;
    const healthFactor = collateralizationRatio / liquidationThreshold;
    const atRisk = healthFactor < 1.2; // Warning at 120% of threshold
    
    if (atRisk) {
      console.log('🚨 LIQUIDATION RISK WARNING:');
      console.log(`   Collateral: ${collateralAsset} - $${collateralValue.toFixed(2)}`);
      console.log(`   Borrowed: ${borrowedAsset} - $${borrowedValue.toFixed(2)}`);
      console.log(`   Health Factor: ${healthFactor.toFixed(2)}`);
      console.log(`   Action: Add collateral or repay loan!`);
    }
    
    return { atRisk, healthFactor };
  }

  // Private helper methods
  private getOracleForAssetType(assetType: 'crypto' | 'stellar' | 'forex'): string {
    switch (assetType) {
      case 'stellar':
        return this.oracles.stellar;
      case 'forex':
        return this.oracles.forex;
      default:
        return this.oracles.external;
    }
  }

  private async getPriceFromOracle(asset: string, oracleAddress: string): Promise<number | null> {
    try {
      const contract = new StellarSdk.Contract(oracleAddress);
      
      const tx = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
        {
          fee: '100000',
          networkPassphrase: this.network === 'mainnet' 
            ? StellarSdk.Networks.PUBLIC 
            : StellarSdk.Networks.TESTNET,
        }
      )
        .addOperation(
          contract.call('lastprice',
            StellarSdk.xdr.ScVal.scvMap([
              new StellarSdk.xdr.ScMapEntry({
                key: StellarSdk.xdr.ScVal.scvSymbol('Other'),
                val: StellarSdk.xdr.ScVal.scvSymbol(asset)
              })
            ])
          )
        )
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(tx);
      
      if (simulated.result) {
        return this.parsePrice(simulated.result);
      }
    } catch (error) {
      console.error(`Failed to get price for ${asset} from ${oracleAddress}:`, error);
    }
    
    return null;
  }

  private parsePrice(result: any): number {
    // Parse the i128 price with 14 decimals precision
    // This is a simplified parser - in production, use proper XDR parsing
    const price = Number(result) / Math.pow(10, 14);
    return price;
  }
}

// Usage example
export async function runAdvancedMonitoring() {
  const monitor = new AdvancedReflectorMonitor('testnet');
  
  // Monitor multiple aspects
  setInterval(async () => {
    console.log('\n--- 🔍 ADVANCED MONITORING CYCLE ---');
    
    // Check arbitrage opportunities
    await monitor.checkArbitrage('BTC');
    await monitor.checkArbitrage('ETH');
    
    // Monitor stablecoin pegs
    await monitor.checkStablecoinPeg('USDC');
    await monitor.checkStablecoinPeg('USDT');
    
    // Monitor portfolio health
    await monitor.monitorPortfolioHealth([
      { asset: 'BTC', amount: 0.5, target: 50 },
      { asset: 'ETH', amount: 5, target: 30 },
      { asset: 'XLM', amount: 10000, target: 20 },
    ]);
    
    // Check liquidation risks
    await monitor.checkLiquidationRisk('BTC', 1, 'USDC', 30000, 150);
    
    console.log('--- ✅ MONITORING CYCLE COMPLETE ---\n');
  }, 60000); // Every minute
}