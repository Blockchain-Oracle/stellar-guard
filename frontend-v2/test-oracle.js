const StellarSdk = require('@stellar/stellar-sdk');

const server = new StellarSdk.rpc.Server('https://soroban-testnet.stellar.org');
const EXTERNAL_ORACLE = 'CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63';

async function testOracle() {
  console.log('Testing oracle price fetch for BTC...');
  
  try {
    const contract = new StellarSdk.Contract(EXTERNAL_ORACLE);
    const sourceAccount = new StellarSdk.Account(
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      '0'
    );
    
    // Try lastprice function
    console.log('\n=== Testing lastprice ===');
    const assetParam = StellarSdk.xdr.ScVal.scvSymbol('BTC');
    
    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100000',
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(contract.call('lastprice', assetParam))
      .setTimeout(30)
      .build();
    
    const simulated = await server.simulateTransaction(tx);
    console.log('Simulation response:', JSON.stringify(simulated, null, 2));
    
    if ('result' in simulated && simulated.result && simulated.result.retval) {
      console.log('\nRaw retval:', simulated.result.retval);
      
      try {
        const nativeValue = StellarSdk.scValToNative(simulated.result.retval);
        console.log('Native value:', nativeValue);
        
        if (typeof nativeValue === 'object' && nativeValue !== null && 'price' in nativeValue) {
          const price = Number(nativeValue.price) / Math.pow(10, 14);
          console.log('BTC Price:', price);
        } else if (typeof nativeValue === 'bigint' || typeof nativeValue === 'number') {
          const price = Number(nativeValue) / Math.pow(10, 14);
          console.log('BTC Price (direct):', price);
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