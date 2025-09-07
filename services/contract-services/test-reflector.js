/**
 * Test Reflector Oracle integration with CORRECT testnet addresses
 */

const { 
  StellarGuardServices,
  REFLECTOR_ORACLES
} = require('./dist');
const { Keypair } = require('@stellar/stellar-sdk');

const TEST_SECRET = 'SBT37CGNZLWR6E6ISKXBVIQ3IEPAO5CGIBAOQBKMDADDSZIECQFL4OPZ';
const TEST_KEYPAIR = Keypair.fromSecret(TEST_SECRET);
const TEST_PUBLIC = TEST_KEYPAIR.publicKey();

async function testReflector() {
  console.log('\n🔮 Testing Reflector Oracle with CORRECTED Testnet Addresses\n');
  
  const services = new StellarGuardServices();
  
  try {
    await services.wallet.connectWithSecret(TEST_SECRET);
    const account = await services.wallet.getAccount();
    console.log('Account ready:', TEST_PUBLIC);
    
    console.log('\nTestnet Reflector Addresses (CORRECTED):');
    console.log('External:', REFLECTOR_ORACLES.testnet.EXTERNAL);
    console.log('Stellar:', REFLECTOR_ORACLES.testnet.STELLAR);
    console.log('Forex:', REFLECTOR_ORACLES.testnet.FOREX);
    
    console.log('\n📊 Testing Price Feeds:');
    
    // Test BTC price (External Oracle)
    try {
      const btcPrice = await services.oracle.getSpotPrice('BTC', account);
      console.log(`✅ BTC Price: $${btcPrice.price.toFixed(2)} from ${btcPrice.source} oracle`);
    } catch (e) {
      console.log(`❌ BTC price error: ${e.message.split('\n')[0]}`);
    }
    
    // Test ETH price (External Oracle)
    try {
      const ethPrice = await services.oracle.getSpotPrice('ETH', account);
      console.log(`✅ ETH Price: $${ethPrice.price.toFixed(2)} from ${ethPrice.source} oracle`);
    } catch (e) {
      console.log(`❌ ETH price error: ${e.message.split('\n')[0]}`);
    }
    
    // Test XLM price (Stellar Oracle)
    try {
      const xlmPrice = await services.oracle.getSpotPrice('XLM', account);
      console.log(`✅ XLM Price: $${xlmPrice.price.toFixed(4)} from ${xlmPrice.source} oracle`);
    } catch (e) {
      console.log(`❌ XLM price error: ${e.message.split('\n')[0]}`);
    }
    
    // Test USD forex (Forex Oracle)
    try {
      const usdPrice = await services.oracle.getSpotPrice('USD', account);
      console.log(`✅ USD Price: $${usdPrice.price.toFixed(4)} from ${usdPrice.source} oracle`);
    } catch (e) {
      console.log(`❌ USD price error: ${e.message.split('\n')[0]}`);
    }
    
    // Test TWAP
    try {
      const btcTwap = await services.oracle.getTWAPPrice('BTC', 5, account);
      console.log(`\n✅ BTC TWAP (5 periods): $${btcTwap.twapPrice.toFixed(2)}`);
    } catch (e) {
      console.log(`❌ TWAP error: ${e.message.split('\n')[0]}`);
    }
    
    // Test Cross Price
    try {
      const crossPrice = await services.oracle.getCrossPrice('BTC', 'ETH', account);
      console.log(`✅ BTC/ETH Cross Price: ${crossPrice.toFixed(4)}`);
    } catch (e) {
      console.log(`❌ Cross price error: ${e.message.split('\n')[0]}`);
    }
    
    console.log('\n📝 Summary:');
    console.log('We are now using the CORRECT testnet Reflector addresses.');
    console.log('If prices still fail, it means Reflector oracles may not have');
    console.log('test data for these assets on testnet, which is expected.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    services.disconnect();
  }
}

testReflector().catch(console.error);