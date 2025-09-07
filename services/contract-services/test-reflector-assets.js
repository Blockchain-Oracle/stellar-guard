/**
 * Test Reflector with different asset names that might work on testnet
 */

const { 
  StellarGuardServices,
  REFLECTOR_ORACLES
} = require('./dist');
const { Keypair } = require('@stellar/stellar-sdk');

const TEST_SECRET = 'SBT37CGNZLWR6E6ISKXBVIQ3IEPAO5CGIBAOQBKMDADDSZIECQFL4OPZ';
const TEST_KEYPAIR = Keypair.fromSecret(TEST_SECRET);

async function testReflectorAssets() {
  console.log('\n🔮 Testing Reflector Testnet with Various Asset Symbols\n');
  
  const services = new StellarGuardServices();
  
  try {
    await services.wallet.connectWithSecret(TEST_SECRET);
    const account = await services.wallet.getAccount();
    
    console.log('Testnet Oracles:');
    console.log('External:', REFLECTOR_ORACLES.testnet.EXTERNAL);
    console.log('Stellar:', REFLECTOR_ORACLES.testnet.STELLAR);
    
    // Try different asset symbols that might exist on testnet
    const testAssets = [
      // Common ones
      'BTC', 'ETH', 'XLM', 'USDC', 'USD',
      // Testnet specific
      'TEST', 'DEMO', 
      // Try lowercase
      'btc', 'eth', 'xlm',
      // Try different formats
      'Bitcoin', 'Ethereum',
    ];
    
    console.log('\n📊 Testing Various Asset Symbols:');
    for (const asset of testAssets) {
      try {
        // Override the asset check temporarily
        const price = await services.oracle.getSpotPrice(asset, account);
        console.log(`✅ ${asset}: $${price.price.toFixed(4)}`);
        break; // If one works, we found it!
      } catch (e) {
        const error = e.message;
        if (error.includes('MissingValue')) {
          console.log(`❌ ${asset}: No data in oracle`);
        } else if (error.includes('Unsupported asset')) {
          console.log(`⚠️ ${asset}: Not in our config`);
        } else {
          console.log(`❌ ${asset}: ${error.split(':')[1]?.split('\n')[0] || 'Failed'}`);
        }
      }
    }
    
    console.log('\n📝 Conclusion:');
    console.log('If all assets return MissingValue, it means:');
    console.log('1. Testnet Reflector oracles are deployed but have no price data');
    console.log('2. They may only work on mainnet with real price feeds');
    console.log('3. Or they need specific test asset symbols we haven\'t found');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    services.disconnect();
  }
}

testReflectorAssets().catch(console.error);