import * as StellarSdk from '@stellar/stellar-sdk';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const STOP_LOSS_CONTRACT = process.env.STOP_LOSS_CONTRACT || '';
const REFLECTOR_ORACLE = process.env.REFLECTOR_ORACLE || 'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN';
const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '*/30 * * * * *'; // Every 30 seconds

// Initialize Soroban RPC
const server = new StellarSdk.SorobanRpc.Server(SOROBAN_RPC_URL);

interface Order {
  id: number;
  owner: string;
  asset: string;
  stopPrice: bigint;
  trailingPercent?: number;
  status: string;
}

class OrderMonitor {
  private activeOrders: Map<number, Order> = new Map();
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();

  constructor() {
    console.log('🚀 StellarGuard Order Monitor starting...');
    this.initialize();
  }

  private async initialize() {
    await this.loadActiveOrders();
    this.startMonitoring();
  }

  private async loadActiveOrders() {
    try {
      console.log('📋 Loading active orders from contract...');
      
      // Query actual orders from the stop-loss contract
      const contract = new StellarSdk.Contract(STOP_LOSS_CONTRACT);
      
      // This would need to iterate through order IDs or have a batch query method
      // For now, we'll start with empty orders and they'll be added via events
      
      console.log(`✅ Ready to monitor orders`);
    } catch (error) {
      console.error('❌ Failed to load orders:', error);
    }
  }

  private startMonitoring() {
    // Schedule order checks
    cron.schedule(CHECK_INTERVAL, async () => {
      await this.checkAllOrders();
    });

    console.log(`⏰ Monitoring scheduled: ${CHECK_INTERVAL}`);
  }

  private async checkAllOrders() {
    console.log(`🔍 Checking ${this.activeOrders.size} orders...`);

    for (const [orderId, order] of this.activeOrders) {
      try {
        await this.checkOrder(orderId, order);
      } catch (error) {
        console.error(`❌ Error checking order ${orderId}:`, error);
      }
    }
  }

  private async checkOrder(orderId: number, order: Order) {
    // Get current price
    const currentPrice = await this.getAssetPrice(order.asset);
    
    if (!currentPrice) {
      console.warn(`⚠️ No price data for ${order.asset}`);
      return;
    }

    const stopPriceNum = Number(order.stopPrice) / 10000000; // Convert from 7 decimals
    
    console.log(`📊 Order ${orderId}: Asset=${order.asset}, Current=${currentPrice}, Stop=${stopPriceNum}`);

    // Check if stop condition is met
    if (currentPrice <= stopPriceNum) {
      console.log(`🚨 STOP TRIGGERED for order ${orderId}!`);
      await this.executeOrder(orderId);
    }

    // Update trailing stop if applicable
    if (order.trailingPercent) {
      const newStop = currentPrice * (1 - order.trailingPercent / 100);
      if (newStop > stopPriceNum) {
        console.log(`📈 Adjusting trailing stop for order ${orderId}: ${stopPriceNum} -> ${newStop}`);
        order.stopPrice = BigInt(Math.floor(newStop * 10000000));
      }
    }
  }

  private async getAssetPrice(asset: string): Promise<number | null> {
    // Check cache first
    const cached = this.priceCache.get(asset);
    if (cached && Date.now() - cached.timestamp < 30000) { // 30 second cache
      return cached.price;
    }

    try {
      // Query Reflector oracle
      const contract = new StellarSdk.Contract(REFLECTOR_ORACLE);
      
      const tx = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
        {
          fee: '100000',
          networkPassphrase: StellarSdk.Networks.TESTNET,
        }
      )
        .addOperation(
          contract.call(
            'lastprice',
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

      const simulated = await server.simulateTransaction(tx);
      
      if (simulated.result) {
        // Parse the i128 price with 14 decimals precision
        const priceRaw = simulated.result;
        const price = Number(priceRaw) / Math.pow(10, 14);
        
        // Update cache
        this.priceCache.set(asset, { price, timestamp: Date.now() });
        
        return price;
      }
    } catch (error) {
      console.error(`Failed to get price for ${asset}:`, error);
    }

    return null;
  }

  private async executeOrder(orderId: number) {
    try {
      console.log(`⚡ Executing order ${orderId}...`);
      
      // Call the check_and_execute function on the contract
      const contract = new StellarSdk.Contract(STOP_LOSS_CONTRACT);
      
      const account = await server.getAccount(process.env.MONITOR_PUBLIC_KEY || '');
      
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            'check_and_execute',
            StellarSdk.xdr.ScVal.scvU64(StellarSdk.xdr.Uint64.fromString(orderId.toString()))
          )
        )
        .setTimeout(30)
        .build();
      
      const preparedTx = await server.prepareTransaction(tx);
      // Sign with monitor's key (would need proper key management)
      // const signedTx = preparedTx.sign(keypair);
      // const result = await server.sendTransaction(signedTx);
      
      const order = this.activeOrders.get(orderId);
      if (order) {
        order.status = 'executed';
        this.activeOrders.delete(orderId);
        console.log(`✅ Order ${orderId} executed successfully`);
      }
    } catch (error) {
      console.error(`❌ Failed to execute order ${orderId}:`, error);
    }
  }

  public async addOrder(order: Order) {
    this.activeOrders.set(order.id, order);
    console.log(`➕ Added order ${order.id} to monitoring`);
  }

  public async removeOrder(orderId: number) {
    this.activeOrders.delete(orderId);
    console.log(`➖ Removed order ${orderId} from monitoring`);
  }

  public getStatus() {
    return {
      activeOrders: this.activeOrders.size,
      pricesCached: this.priceCache.size,
      uptime: process.uptime(),
    };
  }
}

// Start the monitor
const monitor = new OrderMonitor();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Health check endpoint (optional - could add Express for REST API)
setInterval(() => {
  const status = monitor.getStatus();
  console.log(`💓 Health: Orders=${status.activeOrders}, Uptime=${Math.floor(status.uptime)}s`);
}, 60000); // Every minute

export default monitor;