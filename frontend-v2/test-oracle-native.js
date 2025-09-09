const StellarSdk = require('@stellar/stellar-sdk');

const server = new StellarSdk.rpc.Server('https://soroban-testnet.stellar.org');
const EXTERNAL_ORACLE = 'CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63';

async function testOracle() {
  console.log('Testing oracle with native value conversion...');
  
  try {
    const contract = new StellarSdk.Contract(EXTERNAL_ORACLE);
    const sourceAccount = new StellarSdk.Account(
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      '0'
    );
    
    // Try using nativeToScVal to construct the enum
    console.log('\n=== Testing with nativeToScVal ===');
    
    // Create the enum as a native JavaScript object
    const assetNative = { Other: 'BTC' };
    const assetScVal = StellarSdk.nativeToScVal(assetNative, {
      type: {
        Other: ['symbol']
      }
    });
    
    console.log('Asset ScVal:', assetScVal);
    
    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100000',
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(contract.call('lastprice', assetScVal))
      .setTimeout(30)
      .build();
    
    const simulated = await server.simulateTransaction(tx);
    
    if (simulated.error) {
      console.log('Error:', simulated.error);
      
      // Try a different approach - create the variant manually
      console.log('\n=== Testing with manual variant construction ===');
      
      // SDK v14 uses a different structure for enums
      // Create a variant with tag "Other" and value "BTC"
      const variantScVal = StellarSdk.xdr.ScVal.scvVec([
        StellarSdk.xdr.ScVal.scvSymbol('Other'),
        StellarSdk.xdr.ScVal.scvSymbol('BTC')
      ]);
      
      const tx2 = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(contract.call('lastprice', variantScVal))
        .setTimeout(30)
        .build();
      
      const simulated2 = await server.simulateTransaction(tx2);
      
      if (simulated2.error) {
        console.log('Manual variant error:', simulated2.error);
      } else if (simulated2.result?.retval) {
        console.log('Manual variant success!');
        const nativeValue = StellarSdk.scValToNative(simulated2.result.retval);
        console.log('Result:', nativeValue);
        if (nativeValue && typeof nativeValue === 'object' && 'price' in nativeValue) {
          const price = Number(nativeValue.price) / Math.pow(10, 14);
          console.log('BTC Price: $', price.toFixed(2));
        }
      }
    } else if (simulated.result?.retval) {
      console.log('Success with nativeToScVal!');
      const nativeValue = StellarSdk.scValToNative(simulated.result.retval);
      console.log('Result:', nativeValue);
      if (nativeValue && typeof nativeValue === 'object' && 'price' in nativeValue) {
        const price = Number(nativeValue.price) / Math.pow(10, 14);
        console.log('BTC Price: $', price.toFixed(2));
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testOracle();