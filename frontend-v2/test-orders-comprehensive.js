#!/usr/bin/env node

/**
 * Comprehensive Order Testing Script
 * Creates orders and queries them using both SDK and CLI
 */

const StellarSdk = require('@stellar/stellar-sdk');
const { execSync } = require('child_process');
const readline = require('readline');

// Configuration
const CONTRACT_ID = 'CC2VFR2DSZ4DYB52YXTTDHUMFF6SFN3OMRZH6PAKN7K5BH22PPWOGWFL';
const NETWORK = 'testnet';
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

// Test account (you'll need to provide a funded testnet account)
const TEST_SECRET = 'SBFDDGL2JKM2KKEEWUYTQUXH3Y5WMGKQFDEMV2EPEVDLQVLCIZDRP7AN'; // Replace with your test account secret
const TEST_PUBLIC = 'GDQC3N4DGWPUCOIJ5MLPVXLZZKXCGD5M37EQTMBJBFFHUXJIYQEENBZ6';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Helper functions
const log = {
  info: (msg) => console.log(`${colors.cyan}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.magenta}========== ${msg} ==========${colors.reset}\n`),
};

// Initialize SDK
const server = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
const sourceKeypair = StellarSdk.Keypair.fromSecret(TEST_SECRET);
const contract = new StellarSdk.Contract(CONTRACT_ID);

// Order types enum
const OrderType = {
  StopLoss: { tag: 'StopLoss', values: undefined },
  TakeProfit: { tag: 'TakeProfit', values: undefined },
  TrailingStop: { tag: 'TrailingStop', values: undefined }
};

/**
 * Execute CLI command and return output
 */
function runCLI(command, silent = false) {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    if (!silent) {
      log.info(`CLI Output:\n${output}`);
    }
    return output;
  } catch (error) {
    log.error(`CLI Error: ${error.message}`);
    if (error.stdout) {
      log.error(`CLI stdout: ${error.stdout.toString()}`);
    }
    return null;
  }
}

/**
 * Create an order using SDK
 */
async function createOrderSDK(asset, amount, stopPrice, orderType = 'StopLoss') {
  log.title(`Creating ${orderType} Order via SDK`);
  
  try {
    const account = await server.getAccount(sourceKeypair.publicKey());
    
    // Convert parameters to proper formats
    const assetParam = StellarSdk.nativeToScVal(asset, { type: 'symbol' });
    const amountParam = StellarSdk.nativeToScVal(BigInt(amount * 10000000), { type: 'i128' });
    const stopPriceParam = StellarSdk.nativeToScVal(BigInt(stopPrice * 10000000), { type: 'i128' });
    const orderTypeParam = StellarSdk.xdr.ScVal.scvVec([
      StellarSdk.xdr.ScVal.scvSymbol(orderType),
    ]);
    
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          'create_order',
          assetParam,
          amountParam,
          stopPriceParam,
          orderTypeParam
        )
      )
      .setTimeout(30)
      .build();
    
    // Sign transaction
    tx.sign(sourceKeypair);
    
    log.info('Submitting transaction...');
    const response = await server.sendTransaction(tx);
    
    // Poll for result
    let result = await server.getTransaction(response.hash);
    let retries = 0;
    while (result.status === 'PENDING' && retries < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      result = await server.getTransaction(response.hash);
      retries++;
    }
    
    if (result.status === 'SUCCESS') {
      log.success(`Order created! Transaction: ${response.hash}`);
      
      // Extract order ID from result
      if (result.returnValue) {
        const orderId = StellarSdk.scValToNative(result.returnValue);
        log.success(`Order ID: ${orderId}`);
        return orderId;
      }
    } else {
      log.error(`Transaction failed: ${result.status}`);
    }
  } catch (error) {
    log.error(`Failed to create order: ${error.message}`);
  }
  
  return null;
}

/**
 * Create an order using CLI
 */
async function createOrderCLI(asset, amount, stopPrice, orderType = 'StopLoss') {
  log.title(`Creating ${orderType} Order via CLI`);
  
  const command = `stellar contract invoke \\
    --id ${CONTRACT_ID} \\
    --source ${TEST_SECRET} \\
    --network ${NETWORK} \\
    -- \\
    create_order \\
    --asset ${asset} \\
    --amount ${amount * 10000000} \\
    --stop_price ${stopPrice * 10000000} \\
    --order_type '{"vec":[{"symbol":"${orderType}"}]}'`;
  
  log.info(`Executing: ${command}`);
  const result = runCLI(command);
  
  if (result) {
    // Parse order ID from output
    const match = result.match(/(\d+)/);
    if (match) {
      const orderId = match[1];
      log.success(`Order created with ID: ${orderId}`);
      return orderId;
    }
  }
  
  return null;
}

/**
 * Get all orders using SDK
 */
async function getAllOrdersSDK() {
  log.title('Fetching All Orders via SDK');
  
  try {
    const account = await server.getAccount(sourceKeypair.publicKey());
    
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(contract.call('get_all_orders'))
      .setTimeout(30)
      .build();
    
    const simulated = await server.simulateTransaction(tx);
    
    if (simulated.result?.retval) {
      const orderIds = StellarSdk.scValToNative(simulated.result.retval);
      log.success(`Found ${orderIds.length} orders: ${orderIds.join(', ')}`);
      return orderIds;
    }
  } catch (error) {
    log.error(`Failed to fetch orders: ${error.message}`);
  }
  
  return [];
}

/**
 * Get all orders using CLI
 */
async function getAllOrdersCLI() {
  log.title('Fetching All Orders via CLI');
  
  const command = `stellar contract invoke \\
    --id ${CONTRACT_ID} \\
    --source ${TEST_SECRET} \\
    --network ${NETWORK} \\
    -- \\
    get_all_orders`;
  
  const result = runCLI(command);
  return result;
}

/**
 * Get specific order details using SDK
 */
async function getOrderSDK(orderId) {
  log.title(`Fetching Order #${orderId} via SDK`);
  
  try {
    const account = await server.getAccount(sourceKeypair.publicKey());
    const orderIdParam = StellarSdk.nativeToScVal(BigInt(orderId), { type: 'u64' });
    
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(contract.call('get_order', orderIdParam))
      .setTimeout(30)
      .build();
    
    const simulated = await server.simulateTransaction(tx);
    
    if (simulated.result?.retval) {
      const order = StellarSdk.scValToNative(simulated.result.retval);
      log.success('Order details:');
      console.log(JSON.stringify(order, null, 2));
      return order;
    }
  } catch (error) {
    log.error(`Failed to fetch order: ${error.message}`);
  }
  
  return null;
}

/**
 * Get specific order details using CLI
 */
async function getOrderCLI(orderId) {
  log.title(`Fetching Order #${orderId} via CLI`);
  
  const command = `stellar contract invoke \\
    --id ${CONTRACT_ID} \\
    --source ${TEST_SECRET} \\
    --network ${NETWORK} \\
    -- \\
    get_order \\
    --order_id ${orderId}`;
  
  const result = runCLI(command);
  return result;
}

/**
 * Get user orders using SDK
 */
async function getUserOrdersSDK(userAddress) {
  log.title(`Fetching Orders for User via SDK`);
  
  try {
    const account = await server.getAccount(sourceKeypair.publicKey());
    const userParam = StellarSdk.Address.fromString(userAddress).toScVal();
    
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(contract.call('get_user_orders', userParam))
      .setTimeout(30)
      .build();
    
    const simulated = await server.simulateTransaction(tx);
    
    if (simulated.result?.retval) {
      const orderIds = StellarSdk.scValToNative(simulated.result.retval);
      log.success(`User has ${orderIds.length} orders: ${orderIds.join(', ')}`);
      return orderIds;
    }
  } catch (error) {
    log.error(`Failed to fetch user orders: ${error.message}`);
  }
  
  return [];
}

/**
 * Cancel an order using SDK
 */
async function cancelOrderSDK(orderId) {
  log.title(`Cancelling Order #${orderId} via SDK`);
  
  try {
    const account = await server.getAccount(sourceKeypair.publicKey());
    const orderIdParam = StellarSdk.nativeToScVal(BigInt(orderId), { type: 'u64' });
    
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(contract.call('cancel_order', orderIdParam))
      .setTimeout(30)
      .build();
    
    tx.sign(sourceKeypair);
    
    const response = await server.sendTransaction(tx);
    
    // Poll for result
    let result = await server.getTransaction(response.hash);
    let retries = 0;
    while (result.status === 'PENDING' && retries < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      result = await server.getTransaction(response.hash);
      retries++;
    }
    
    if (result.status === 'SUCCESS') {
      log.success(`Order #${orderId} cancelled successfully!`);
      return true;
    } else {
      log.error(`Failed to cancel order: ${result.status}`);
    }
  } catch (error) {
    log.error(`Failed to cancel order: ${error.message}`);
  }
  
  return false;
}

/**
 * Interactive menu
 */
async function showMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
  
  while (true) {
    console.log(`\n${colors.bright}${colors.blue}========== ORDER TEST MENU ==========${colors.reset}`);
    console.log('1. Create Stop Loss Order (SDK)');
    console.log('2. Create Stop Loss Order (CLI)');
    console.log('3. Create Take Profit Order (SDK)');
    console.log('4. Get All Orders (SDK)');
    console.log('5. Get All Orders (CLI)');
    console.log('6. Get Specific Order (SDK)');
    console.log('7. Get Specific Order (CLI)');
    console.log('8. Get User Orders (SDK)');
    console.log('9. Cancel Order (SDK)');
    console.log('10. Run Full Test Suite');
    console.log('11. Check Contract Info');
    console.log('0. Exit');
    
    const choice = await question('\nEnter your choice: ');
    
    switch (choice) {
      case '1':
        await createOrderSDK('XLM', 100, 0.45, 'StopLoss');
        break;
      
      case '2':
        await createOrderCLI('XLM', 100, 0.45, 'StopLoss');
        break;
      
      case '3':
        await createOrderSDK('XLM', 100, 0.55, 'TakeProfit');
        break;
      
      case '4':
        await getAllOrdersSDK();
        break;
      
      case '5':
        await getAllOrdersCLI();
        break;
      
      case '6': {
        const orderId = await question('Enter order ID: ');
        await getOrderSDK(orderId);
        break;
      }
      
      case '7': {
        const orderId = await question('Enter order ID: ');
        await getOrderCLI(orderId);
        break;
      }
      
      case '8':
        await getUserOrdersSDK(TEST_PUBLIC);
        break;
      
      case '9': {
        const orderId = await question('Enter order ID to cancel: ');
        await cancelOrderSDK(orderId);
        break;
      }
      
      case '10':
        await runFullTestSuite();
        break;
      
      case '11':
        await checkContractInfo();
        break;
      
      case '0':
        rl.close();
        return;
      
      default:
        log.warn('Invalid choice. Please try again.');
    }
  }
}

/**
 * Run full test suite
 */
async function runFullTestSuite() {
  log.title('RUNNING FULL TEST SUITE');
  
  // Create multiple orders
  log.info('Creating test orders...');
  const order1 = await createOrderSDK('XLM', 100, 0.45, 'StopLoss');
  const order2 = await createOrderSDK('BTC', 0.01, 95000, 'StopLoss');
  const order3 = await createOrderSDK('ETH', 1, 3700, 'TakeProfit');
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Get all orders
  log.info('Fetching all orders...');
  const allOrders = await getAllOrdersSDK();
  
  // Get user orders
  log.info('Fetching user orders...');
  const userOrders = await getUserOrdersSDK(TEST_PUBLIC);
  
  // Get specific order details
  if (order1) {
    log.info(`Fetching details for order #${order1}...`);
    await getOrderSDK(order1);
  }
  
  // Cancel an order
  if (order1) {
    log.info(`Cancelling order #${order1}...`);
    await cancelOrderSDK(order1);
  }
  
  // Verify cancellation
  log.info('Verifying order was cancelled...');
  await getOrderSDK(order1);
  
  log.success('Test suite completed!');
}

/**
 * Check contract info
 */
async function checkContractInfo() {
  log.title('CONTRACT INFORMATION');
  
  log.info(`Contract ID: ${CONTRACT_ID}`);
  log.info(`Network: ${NETWORK}`);
  log.info(`RPC URL: ${SOROBAN_RPC_URL}`);
  
  // Get contract functions using CLI
  const command = `stellar contract bindings json \\
    --network ${NETWORK} \\
    --contract-id ${CONTRACT_ID} 2>/dev/null | jq '.functions[].name' 2>/dev/null`;
  
  log.info('Available contract functions:');
  runCLI(command, true);
  
  // Get order count
  try {
    const account = await server.getAccount(sourceKeypair.publicKey());
    
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(contract.call('get_order_count'))
      .setTimeout(30)
      .build();
    
    const simulated = await server.simulateTransaction(tx);
    
    if (simulated.result?.retval) {
      const count = StellarSdk.scValToNative(simulated.result.retval);
      log.info(`Total orders in contract: ${count}`);
    }
  } catch (error) {
    log.error(`Failed to get order count: ${error.message}`);
  }
}

// Main execution
async function main() {
  log.title('STELLAR GUARD ORDER TEST SCRIPT');
  log.info('Initializing...');
  
  // Check if we have a valid account
  try {
    const account = await server.getAccount(sourceKeypair.publicKey());
    log.success(`Using account: ${TEST_PUBLIC}`);
    log.info(`Account sequence: ${account.sequence}`);
  } catch (error) {
    log.error('Failed to load account. Make sure the account is funded on testnet.');
    log.info('Get testnet tokens at: https://laboratory.stellar.org/#account-creator?network=test');
    return;
  }
  
  // Show interactive menu
  await showMenu();
}

// Run the script
main().catch(console.error);