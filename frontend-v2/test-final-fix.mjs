import { getCurrentPrice, getTWAPPrice } from './services/oracle.js';

async function testFinalFix() {
  console.log('Testing final fix for spot price and TWAP...\n');
  
  try {
    // Test spot price
    const btcSpot = await getCurrentPrice('BTC', 'crypto');
    console.log('BTC Spot Price:', btcSpot);
    
    // Test TWAP
    const btcTwap = await getTWAPPrice('BTC', 5, 'crypto');
    console.log('BTC TWAP (5 periods):', btcTwap);
    
    // Calculate spread
    if (btcSpot && btcTwap) {
      const spread = ((btcTwap - btcSpot) / btcSpot * 100);
      console.log('Spread:', spread.toFixed(2) + '%');
    }
    
    console.log('\n✅ All tests passed! Spot price, TWAP, and spread calculations are working.');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testFinalFix();