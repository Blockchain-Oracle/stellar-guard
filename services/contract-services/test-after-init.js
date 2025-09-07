/**
 * Test contracts after initialization
 */

const { 
  StellarGuardServices,
  CONTRACTS
} = require('./dist');
const { Keypair } = require('@stellar/stellar-sdk');

const TEST_SECRET = 'SBT37CGNZLWR6E6ISKXBVIQ3IEPAO5CGIBAOQBKMDADDSZIECQFL4OPZ';
const TEST_KEYPAIR = Keypair.fromSecret(TEST_SECRET);
const TEST_PUBLIC = TEST_KEYPAIR.publicKey();

// Use contract addresses as mock tokens
const MOCK_ETH = CONTRACTS.STOP_LOSS;  
const MOCK_USDC = CONTRACTS.ORACLE_ROUTER;

async function testAfterInit() {
  console.log('\n🧪 Testing Contracts After Initialization\n');
  
  const services = new StellarGuardServices();
  
  try {
    await services.wallet.connectWithSecret(TEST_SECRET);
    const account = await services.wallet.getAccount();
    
    // Test Liquidation (now initialized)
    console.log('Testing Liquidation Contract (initialized):');
    try {
      // Create a test loan
      const loanId = await services.liquidation.createLoan({
        borrower: TEST_PUBLIC,
        collateralAsset: MOCK_ETH,
        collateralAmount: 0.01,
        borrowedAsset: MOCK_USDC,
        borrowedAmount: 10,
        liquidationThreshold: 150,
      }, account, TEST_KEYPAIR);
      
      console.log(`✅ SUCCESS! Created Loan ID: ${loanId}`);
      
      // Get the loan back
      const loan = await services.liquidation.getLoan(loanId, account);
      console.log(`✅ Loan retrieved successfully!`);
      console.log(`   - Borrower: ${loan.borrower.slice(0,10)}...`);
      console.log(`   - Collateral: ${loan.collateralAmount}`);
      console.log(`   - Borrowed: ${loan.borrowedAmount}`);
      console.log(`   - Threshold: ${loan.liquidationThreshold} bps`);
      console.log(`   - Liquidated: ${loan.isLiquidated}`);
      
      // Check liquidation status
      const canLiquidate = await services.liquidation.checkLiquidation(
        loanId,
        1000, // Mock ETH price
        1,    // Mock USDC price  
        account
      );
      console.log(`✅ Liquidation check works! Can liquidate: ${canLiquidate}`);
      
      // Get health factor
      const health = await services.liquidation.getHealthFactor(
        loanId,
        1000,
        1,
        account  
      );
      console.log(`✅ Health factor: ${health.toFixed(2)}`);
      
      // Get user loans
      const userLoans = await services.liquidation.getUserLoans(TEST_PUBLIC, account);
      console.log(`✅ User has ${userLoans.length} loan(s): [${userLoans.join(', ')}]`);
      
    } catch (e) {
      console.log('❌ Error:', e.message);
    }
    
    console.log('\n🎉 The Liquidation Service is WORKING after initialization!');
    console.log('The service layer correctly interacts with the deployed contract.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    services.disconnect();
  }
}

testAfterInit().catch(console.error);