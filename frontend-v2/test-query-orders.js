const StellarSdk = require('@stellar/stellar-sdk');

// Configuration
const CONTRACT_ID = 'CC2VFR2DSZ4DYB52YXTTDHUMFF6SFN3OMRZH6PAKN7K5BH22PPWOGWFL';
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

const server = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
const contract = new StellarSdk.Contract(CONTRACT_ID);

async function queryOrders() {
  console.log('========== QUERYING STELLAR GUARD ORDERS ==========\n');
  
  const sourceAccount = new StellarSdk.Account(
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    '0'
  );
  
  try {
    // 1. Get order count
    console.log('1. Getting order count...');
    const countTx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100000',
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(contract.call('get_order_count'))
      .setTimeout(30)
      .build();
    
    const countSim = await server.simulateTransaction(countTx);
    if (countSim.result?.retval) {
      const count = StellarSdk.scValToNative(countSim.result.retval);
      console.log(`   Total orders: ${count}\n`);
    }
    
    // 2. Get all order IDs
    console.log('2. Getting all order IDs...');
    const allOrdersTx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100000',
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(contract.call('get_all_orders'))
      .setTimeout(30)
      .build();
    
    const allOrdersSim = await server.simulateTransaction(allOrdersTx);
    if (allOrdersSim.result?.retval) {
      const orderIds = StellarSdk.scValToNative(allOrdersSim.result.retval);
      console.log(`   Order IDs: ${orderIds.length > 0 ? orderIds.join(', ') : 'No orders found'}\n`);
      
      // 3. Get details for each order
      if (orderIds.length > 0) {
        console.log('3. Getting order details...');
        for (const orderId of orderIds) {
          const orderTx = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: '100000',
            networkPassphrase: StellarSdk.Networks.TESTNET,
          })
            .addOperation(
              contract.call(
                'get_order',
                StellarSdk.nativeToScVal(BigInt(orderId), { type: 'u64' })
              )
            )
            .setTimeout(30)
            .build();
          
          const orderSim = await server.simulateTransaction(orderTx);
          if (orderSim.result?.retval) {
            const order = StellarSdk.scValToNative(orderSim.result.retval);
            console.log(`\n   Order #${orderId}:`);
            console.log(`   - Asset: ${order.asset}`);
            console.log(`   - Amount: ${Number(order.amount) / 10000000}`);
            console.log(`   - Stop Price: ${Number(order.stop_price || order.stopPrice) / 10000000}`);
            console.log(`   - Status: ${order.status}`);
            console.log(`   - Type: ${order.order_type || order.orderType}`);
            console.log(`   - User: ${order.user}`);
          }
        }
      }
    }
    
    // 4. Get active orders
    console.log('\n4. Getting active orders...');
    const activeOrdersTx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100000',
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(contract.call('get_active_orders'))
      .setTimeout(30)
      .build();
    
    const activeOrdersSim = await server.simulateTransaction(activeOrdersTx);
    if (activeOrdersSim.result?.retval) {
      const activeIds = StellarSdk.scValToNative(activeOrdersSim.result.retval);
      console.log(`   Active order IDs: ${activeIds.length > 0 ? activeIds.join(', ') : 'No active orders'}\n`);
    }
    
    // 5. Test paginated query
    console.log('5. Testing paginated query (first 5 orders)...');
    const paginatedTx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100000',
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          'get_orders_paginated',
          StellarSdk.nativeToScVal(BigInt(0), { type: 'u64' }),
          StellarSdk.nativeToScVal(5, { type: 'u32' })
        )
      )
      .setTimeout(30)
      .build();
    
    const paginatedSim = await server.simulateTransaction(paginatedTx);
    if (paginatedSim.result?.retval) {
      const orders = StellarSdk.scValToNative(paginatedSim.result.retval);
      console.log(`   Retrieved ${orders.length} orders from pagination\n`);
    }
    
  } catch (error) {
    console.error('Error querying orders:', error);
  }
  
  console.log('========== QUERY COMPLETE ==========');
}

// Run the query
queryOrders();