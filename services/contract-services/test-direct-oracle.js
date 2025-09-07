/**
 * Test Reflector oracles directly using stellar CLI
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const TESTNET_ORACLES = {
  EXTERNAL: 'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN',
  STELLAR: 'CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M',
  FOREX: 'CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC',
};

async function testDirectOracle() {
  console.log('\n🔍 Testing Reflector Testnet Oracles Directly\n');
  
  // Test calling the oracle directly with stellar CLI
  console.log('Testing External Oracle:', TESTNET_ORACLES.EXTERNAL);
  
  try {
    // Try to get contract info
    const { stdout: info } = await execPromise(
      `stellar contract fetch --id ${TESTNET_ORACLES.EXTERNAL} --network testnet --output json 2>/dev/null || echo "Failed"`
    );
    console.log('Contract fetch result:', info.trim());
    
    // Try a simple view call to see what functions are available
    console.log('\nAttempting to call lastprice() for BTC...');
    const { stdout: btc } = await execPromise(
      `stellar contract invoke --id ${TESTNET_ORACLES.EXTERNAL} --network testnet -- lastprice --asset '{"Other": "BTC"}' 2>&1 || echo ""`
    );
    
    if (btc.includes('error') || btc.includes('Error')) {
      console.log('❌ BTC price call failed:', btc.split('\n')[0]);
    } else {
      console.log('✅ BTC response:', btc);
    }
    
    // Try with a different asset format
    console.log('\nTrying different asset formats...');
    
    // Try just BTC as symbol
    const { stdout: btc2 } = await execPromise(
      `stellar contract invoke --id ${TESTNET_ORACLES.EXTERNAL} --network testnet -- lastprice --asset BTC 2>&1 || echo ""`
    );
    console.log('BTC as symbol:', btc2.split('\n')[0]);
    
    // Try viewing contract storage to see what's available
    console.log('\nChecking contract storage keys...');
    const { stdout: storage } = await execPromise(
      `stellar contract read --id ${TESTNET_ORACLES.EXTERNAL} --network testnet --key ADMIN 2>&1 || echo "No ADMIN key"`
    );
    console.log('Storage check:', storage.trim());
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n📝 Testing with soroban CLI for more detail...');
  try {
    const { stdout } = await execPromise(
      `soroban contract invoke --id ${TESTNET_ORACLES.EXTERNAL} --network testnet -- lastprice --help 2>&1 || echo ""`
    );
    console.log('Function signature:', stdout);
  } catch (e) {
    console.log('Soroban CLI not available');
  }
}

testDirectOracle().catch(console.error);