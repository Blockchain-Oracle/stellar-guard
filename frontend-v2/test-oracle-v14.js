const StellarSdk = require('@stellar/stellar-sdk');

const server = new StellarSdk.rpc.Server('https://soroban-testnet.stellar.org');
const EXTERNAL_ORACLE = 'CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63';

async function testOracle() {
  console.log('Testing oracle with SDK v14 enum construction...');
  
  try {
    const contract = new StellarSdk.Contract(EXTERNAL_ORACLE);
    const sourceAccount = new StellarSdk.Account(
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      '0'
    );
    
    // SDK v14 enum construction - need to create a variant properly
    console.log('\n=== Testing with proper enum variant ===');
    
    // Create enum variant for Asset::Other(Symbol)
    // In SDK v14, enums are represented as objects with a tag and values
    const assetEnum = StellarSdk.xdr.ScVal.scvVec([
      StellarSdk.xdr.ScVal.scvU32(1), // Variant index for "Other" 
      StellarSdk.xdr.ScVal.scvSymbol('BTC')
    ]);
    
    console.log('Asset enum:', assetEnum);
    
    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100000',
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(contract.call('lastprice', assetEnum))
      .setTimeout(30)
      .build();
    
    const simulated = await server.simulateTransaction(tx);
    
    if (simulated.error) {
      console.log('Error:', simulated.error);
    } else if (simulated.result?.retval) {
      console.log('Success!');
      console.log('\nRaw retval:', simulated.result.retval);
      
      try {
        const nativeValue = StellarSdk.scValToNative(simulated.result.retval);
        console.log('Native value:', nativeValue);
        
        if (nativeValue && typeof nativeValue === 'object' && 'price' in nativeValue) {
          const price = Number(nativeValue.price) / Math.pow(10, 14);
          console.log('BTC Price: $', price.toFixed(2));
        }
      } catch (e) {
        console.log('Error converting to native:', e.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testOracle();