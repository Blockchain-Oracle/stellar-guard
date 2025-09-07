/**
 * Direct contract interaction test with mock assets
 */

const { 
  StellarGuardServices,
  CONTRACTS
} = require('./dist');
const { Keypair, Asset } = require('@stellar/stellar-sdk');

// Test account
const TEST_SECRET = 'SBT37CGNZLWR6E6ISKXBVIQ3IEPAO5CGIBAOQBKMDADDSZIECQFL4OPZ';
const TEST_KEYPAIR = Keypair.fromSecret(TEST_SECRET);
const TEST_PUBLIC = TEST_KEYPAIR.publicKey();

// Mock asset addresses (using test account as mock token addresses)
const MOCK_BTC_ADDRESS = 'CDSKXUU5BDMKMLDS4T3PL6RUX7XLVG3DW7ZSV7LL5LS2WJVJ6ZP5EUMM'; // Using stop-loss contract as mock
const MOCK_ETH_ADDRESS = 'CACBFLZ2IDRV45WZ2SYZ27C5ILPJTP6TUS5PQDXZBPNXCOHOP7CPLRJW'; // Using liquidation contract as mock
const MOCK_USDC_ADDRESS = 'CB3AWIGZ66E3DNPWY22T2RRKW2VYYKQNJOYTT56FD4LOVKVGTFF5L3FN'; // Using oracle router as mock

async function testContracts() {
  console.log('\n🔧 Testing Contract Interactions Directly\n');
  
  const services = new StellarGuardServices();
  
  try {
    // Connect wallet
    await services.wallet.connectWithSecret(TEST_SECRET);
    const account = await services.wallet.getAccount();
    console.log('✅ Account ready:', TEST_PUBLIC);
    
    // Test Stop-Loss with contract addresses
    console.log('\n📊 Stop-Loss Contract Test:');
    try {
      const orderId = await services.stopLoss.createStopLossOrder({
        owner: TEST_PUBLIC,
        asset: MOCK_BTC_ADDRESS, // Using contract address instead of symbol
        amount: 0.001,
        stopPrice: 25000,
      }, account, TEST_KEYPAIR);
      
      console.log(`✅ Created Order #${orderId}`);
      
      const order = await services.stopLoss.getOrder(orderId, account);
      console.log(`✅ Order retrieved - Status: ${order.status}, Stop: ${order.stopPrice}`);
      
      const orders = await services.stopLoss.getUserOrders(TEST_PUBLIC, account);
      console.log(`✅ User has ${orders.length} total orders`);
      
      await services.stopLoss.cancelOrder(orderId, TEST_PUBLIC, account, TEST_KEYPAIR);
      console.log(`✅ Order #${orderId} cancelled`);
    } catch (e) {
      console.log('❌ Stop-loss error:', e.message);
    }
    
    // Test Liquidation with contract addresses  
    console.log('\n💰 Liquidation Contract Test:');
    try {
      const loanId = await services.liquidation.createLoan({
        borrower: TEST_PUBLIC,
        collateralAsset: MOCK_ETH_ADDRESS, // Contract address
        collateralAmount: 0.01,
        borrowedAsset: MOCK_USDC_ADDRESS, // Contract address
        borrowedAmount: 15,
        liquidationThreshold: 150,
      }, account, TEST_KEYPAIR);
      
      console.log(`✅ Created Loan #${loanId}`);
      
      const loan = await services.liquidation.getLoan(loanId, account);
      console.log(`✅ Loan retrieved - Borrower: ${loan.borrower.slice(0,8)}..., Liquidated: ${loan.isLiquidated}`);
      
      const canLiquidate = await services.liquidation.checkLiquidation(
        loanId, 3000, 1, account
      );
      console.log(`✅ Liquidation check at $3000 ETH: ${canLiquidate ? 'YES' : 'NO'}`);
      
      const health = await services.liquidation.getHealthFactor(
        loanId, 3000, 1, account
      );
      console.log(`✅ Health Factor: ${health.toFixed(2)}`);
      
      const loans = await services.liquidation.getUserLoans(TEST_PUBLIC, account);
      console.log(`✅ User has ${loans.length} total loans`);
    } catch (e) {
      console.log('❌ Liquidation error:', e.message);
    }
    
    console.log('\n✨ Contract interaction tests complete!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    services.disconnect();
  }
}

testContracts().catch(console.error);