const StellarSdk = require('@stellar/stellar-sdk');

// Configure network  
const server = new StellarSdk.rpc.Server('https://soroban-testnet.stellar.org');
const CONTRACT_ADDRESS = 'CC2VFR2DSZ4DYB52YXTTDHUMFF6SFN3OMRZH6PAKN7K5BH22PPWOGWFL';
const USER_ADDRESS = 'GALV4HXO7HI2GQCVFQQMHVLUBBFMZTXCLCG2SAWN36U4UAPGBIAUPY6G';

async function testGetUserOrders() {
  console.log('=== Testing get_user_orders ===');
  
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ADDRESS);
    
    // Create a source account for simulation
    const sourceAccount = new StellarSdk.Account(
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      '0'
    );
    
    // Build transaction to get user orders
    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100000',
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          'get_user_orders',
          StellarSdk.Address.fromString(USER_ADDRESS).toScVal()
        )
      )
      .setTimeout(30)
      .build();
    
    console.log('Simulating get_user_orders for:', USER_ADDRESS);
    const simulated = await server.simulateTransaction(tx);
    
    console.log('Full simulation response:', JSON.stringify(simulated, null, 2));
    
    // Try different ways to get the result
    if ('result' in simulated && simulated.result) {
      console.log('Raw result:', simulated.result);
      try {
        const nativeResult = StellarSdk.scValToNative(simulated.result);
        console.log('Native result:', nativeResult);
      } catch (e) {
        console.log('Error converting to native:', e.message);
        
        // Try to inspect the XDR structure
        if (simulated.result._switch) {
          console.log('Result switch type:', simulated.result._switch);
        }
        if (simulated.result._value) {
          console.log('Result value:', simulated.result._value);
        }
      }
    }
    
    if (simulated.error) {
      console.log('Simulation error:', simulated.error);
    }
    
  } catch (error) {
    console.error('Error in get_user_orders:', error);
  }
}

async function testGetAllOrders() {
  console.log('\n=== Testing get_all_orders ===');
  
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ADDRESS);
    
    // Create a source account for simulation
    const sourceAccount = new StellarSdk.Account(
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      '0'
    );
    
    // Build transaction to get all orders
    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100000',
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        contract.call('get_all_orders')
      )
      .setTimeout(30)
      .build();
    
    console.log('Simulating get_all_orders...');
    const simulated = await server.simulateTransaction(tx);
    
    console.log('Full simulation response:', JSON.stringify(simulated, null, 2));
    
    // Try different ways to get the result
    if ('result' in simulated && simulated.result) {
      console.log('Raw result:', simulated.result);
      try {
        const nativeResult = StellarSdk.scValToNative(simulated.result);
        console.log('Native result:', nativeResult);
      } catch (e) {
        console.log('Error converting to native:', e.message);
        
        // Try to inspect the XDR structure
        if (simulated.result._switch) {
          console.log('Result switch type:', simulated.result._switch);
        }
        if (simulated.result._value) {
          console.log('Result value:', simulated.result._value);
        }
      }
    }
    
    if (simulated.error) {
      console.log('Simulation error:', simulated.error);
    }
    
  } catch (error) {
    console.error('Error in get_all_orders:', error);
  }
}

async function testGetOrderDetails() {
  console.log('\n=== Testing get_order_details ===');
  
  // Test with known order IDs from the user
  const orderIds = [3, 4, 5, 6, 7, 8, 9, 11, 13, 17, 19];
  
  for (const orderId of orderIds.slice(0, 2)) { // Test first 2 orders
    try {
      const contract = new StellarSdk.Contract(CONTRACT_ADDRESS);
      
      // Create a source account for simulation
      const sourceAccount = new StellarSdk.Account(
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
        '0'
      );
      
      // Build transaction to get order details
      const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          contract.call(
            'get_order_details',
            StellarSdk.nativeToScVal(BigInt(orderId), { type: 'u64' })
          )
        )
        .setTimeout(30)
        .build();
      
      console.log(`\nSimulating get_order_details for order ${orderId}...`);
      const simulated = await server.simulateTransaction(tx);
      
      if ('result' in simulated && simulated.result) {
        try {
          const nativeResult = StellarSdk.scValToNative(simulated.result);
          console.log(`Order ${orderId} details:`, nativeResult);
        } catch (e) {
          console.log(`Error converting order ${orderId} to native:`, e.message);
        }
      }
      
      if (simulated.error) {
        console.log(`Simulation error for order ${orderId}:`, simulated.error);
      }
      
    } catch (error) {
      console.error(`Error getting order ${orderId} details:`, error.message);
    }
  }
}

// Run all tests
async function runTests() {
  await testGetUserOrders();
  await testGetAllOrders();
  await testGetOrderDetails();
}

runTests().catch(console.error);