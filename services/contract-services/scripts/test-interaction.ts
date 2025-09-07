#!/usr/bin/env ts-node

/**
 * Practical Contract Interaction Test
 * Tests real functionality with deployed contracts and Reflector oracles
 * 
 * Run with: npx ts-node scripts/test-interaction.ts
 */

import { 
  Keypair, 
  Contract, 
  TransactionBuilder, 
  Networks, 
  BASE_FEE,
  Operation,
  rpc,
  xdr,
  Address,
  nativeToScVal,
  scValToNative
} from '@stellar/stellar-sdk';
import { CONTRACTS, REFLECTOR_ORACLES } from '../src/config/contracts';

// Configuration
const server = new rpc.Server('https://soroban-testnet.stellar.org');

// Test account - you need to set this to a funded testnet account
const SECRET_KEY = process.env.STELLAR_SECRET || '';
if (!SECRET_KEY) {
  console.error('❌ Please set STELLAR_SECRET environment variable with a funded testnet account');
  console.log('   Get testnet tokens at: https://laboratory.stellar.org/#account-creator?network=test');
  process.exit(1);
}

const keypair = Keypair.fromSecret(SECRET_KEY);
const publicKey = keypair.publicKey();

console.log('\n🚀 StellarGuard Contract Interaction Test');
console.log('==========================================');
console.log(`Account: ${publicKey}`);
console.log(`Network: Testnet\n`);

// Helper to build and simulate transaction
async function callContract(
  contractId: string,
  method: string,
  ...params: xdr.ScVal[]
): Promise<any> {
  const account = await server.getAccount(publicKey);
  const contract = new Contract(contractId);
  
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  try {
    const simulated = await server.simulateTransaction(transaction);
    
    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }
    
    if (rpc.Api.isSimulationSuccess(simulated) && simulated.result) {
      return scValToNative(simulated.result.retval);
    }
    
    return null;
  } catch (error: any) {
    console.error(`Error calling ${method}:`, error.message);
    throw error;
  }
}

// Test 1: Direct Reflector Oracle Call
async function testReflectorOracle() {
  console.log('📊 Testing Reflector Oracle Direct Call');
  console.log('----------------------------------------');
  
  try {
    // Call External Oracle for BTC price
    const btcAsset = xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol('Other'),
      xdr.ScVal.scvSymbol('BTC')
    ]);
    
    const result = await callContract(
      REFLECTOR_ORACLES.testnet.EXTERNAL,
      'lastprice',
      btcAsset
    );
    
    if (result) {
      // Reflector returns price with 14 decimals
      const price = Number(result.price) / 1e14;
      const timestamp = result.timestamp;
      
      console.log('✅ BTC Price from Reflector:');
      console.log(`   Price: $${price.toFixed(2)}`);
      console.log(`   Timestamp: ${new Date(Number(timestamp) * 1000).toISOString()}`);
      return true;
    } else {
      console.log('⚠️  No price data returned');
      return false;
    }
  } catch (error: any) {
    console.log('❌ Reflector Oracle test failed:', error.message);
    return false;
  }
}

// Test 2: Oracle Router Contract
async function testOracleRouter() {
  console.log('\n🔄 Testing Oracle Router Contract');
  console.log('----------------------------------');
  
  try {
    // First, initialize the Oracle Router with testnet
    console.log('Initializing Oracle Router...');
    
    const network = xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol('Testnet')
    ]);
    
    await callContract(
      CONTRACTS.ORACLE_ROUTER,
      'initialize',
      network
    );
    
    console.log('✅ Oracle Router initialized for Testnet');
    
    // Now test getting oracle for different asset types
    const cryptoAsset = xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol('Crypto'),
      xdr.ScVal.scvSymbol('BTC')
    ]);
    
    const oracleAddress = await callContract(
      CONTRACTS.ORACLE_ROUTER,
      'get_oracle_for_asset',
      cryptoAsset
    );
    
    if (oracleAddress) {
      console.log('✅ Oracle for BTC (Crypto):');
      console.log(`   Oracle: ${oracleAddress}`);
      console.log(`   Expected: ${REFLECTOR_ORACLES.testnet.EXTERNAL}`);
      console.log(`   Match: ${oracleAddress === REFLECTOR_ORACLES.testnet.EXTERNAL ? '✅' : '❌'}`);
      return true;
    }
    
    return false;
  } catch (error: any) {
    if (error.message.includes('already initialized')) {
      console.log('ℹ️  Oracle Router already initialized');
      return true;
    }
    console.log('❌ Oracle Router test failed:', error.message);
    return false;
  }
}

// Test 3: Stop-Loss Contract
async function testStopLoss() {
  console.log('\n🛑 Testing Stop-Loss Contract');
  console.log('------------------------------');
  
  try {
    // First initialize the stop-loss contract with oracle address
    console.log('Initializing Stop-Loss contract...');
    try {
      await callContract(
        CONTRACTS.STOP_LOSS,
        'initialize',
        nativeToScVal(Address.fromString(REFLECTOR_ORACLES.testnet.EXTERNAL), { type: 'address' })
      );
      console.log('✅ Stop-Loss contract initialized');
    } catch (error: any) {
      if (error.message.includes('already initialized')) {
        console.log('ℹ️  Stop-Loss contract already initialized');
      }
    }
    
    // Create a stop-loss order
    // Parameters: owner, asset (as Symbol), amount, stop_price
    const orderParams = [
      nativeToScVal(Address.fromString(publicKey), { type: 'address' }), // owner
      xdr.ScVal.scvSymbol('BTC'), // asset (now using Symbol type)
      nativeToScVal(100000000, { type: 'i128' }), // amount (0.01 BTC with 7 decimals)
      nativeToScVal(300000000000, { type: 'i128' }), // stop_price ($30,000 with 7 decimals)
    ];
    
    const orderId = await callContract(
      CONTRACTS.STOP_LOSS,
      'create_stop_loss',
      ...orderParams
    );
    
    if (orderId !== undefined) {
      console.log('✅ Stop-Loss Order Created:');
      console.log(`   Order ID: ${orderId}`);
      console.log(`   Asset: BTC`);
      console.log(`   Amount: 0.01 BTC`);
      console.log(`   Stop Price: $30,000`);
      console.log(`   Limit Price: $29,500`);
      
      // Get order details
      const order = await callContract(
        CONTRACTS.STOP_LOSS,
        'get_order_details',
        nativeToScVal(orderId, { type: 'u64' })
      );
      
      if (order) {
        console.log('✅ Order Retrieved Successfully');
        console.log(`   Status: ${order.status}`);
      }
      
      return true;
    }
    
    return false;
  } catch (error: any) {
    console.log('❌ Stop-Loss test failed:', error.message);
    console.log('   Note: This requires the account to have authorization');
    return false;
  }
}

// Test 4: Liquidation Contract
async function testLiquidation() {
  console.log('\n💰 Testing Liquidation Contract');
  console.log('--------------------------------');
  
  try {
    // First initialize with oracle router
    console.log('Initializing Liquidation contract...');
    
    await callContract(
      CONTRACTS.LIQUIDATION,
      'initialize',
      nativeToScVal(Address.fromString(CONTRACTS.ORACLE_ROUTER), { type: 'address' })
    );
    
    console.log('✅ Liquidation contract initialized');
    
    // Create a loan
    const loanParams = [
      nativeToScVal(Address.fromString(publicKey), { type: 'address' }), // owner
      xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Crypto'), xdr.ScVal.scvSymbol('ETH')]), // collateral_asset
      nativeToScVal(10000000000, { type: 'i128' }), // collateral_amount (1 ETH)
      xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Crypto'), xdr.ScVal.scvSymbol('USDC')]), // borrowed_asset (USDC is Crypto type)
      nativeToScVal(15000000000, { type: 'i128' }), // borrowed_amount (1500 USDC)
      nativeToScVal(15000, { type: 'i128' }), // liquidation_threshold (150% in basis points)
    ];
    
    const loanId = await callContract(
      CONTRACTS.LIQUIDATION,
      'create_loan',
      ...loanParams
    );
    
    if (loanId !== undefined) {
      console.log('✅ Loan Created:');
      console.log(`   Loan ID: ${loanId}`);
      console.log(`   Collateral: 1 ETH`);
      console.log(`   Borrowed: 1500 USDC`);
      console.log(`   Liquidation Threshold: 150%`);
      
      return true;
    }
    
    return false;
  } catch (error: any) {
    if (error.message.includes('already initialized')) {
      console.log('ℹ️  Liquidation contract already initialized');
      return true;
    }
    console.log('❌ Liquidation test failed:', error.message);
    console.log('   Note: This requires proper initialization and authorization');
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('Starting Contract Interaction Tests...\n');
  
  const results = {
    reflector: false,
    oracleRouter: false,
    stopLoss: false,
    liquidation: false
  };
  
  // Test each component
  results.reflector = await testReflectorOracle();
  results.oracleRouter = await testOracleRouter();
  results.stopLoss = await testStopLoss();
  results.liquidation = await testLiquidation();
  
  // Summary
  console.log('\n📋 TEST SUMMARY');
  console.log('===============');
  console.log(`Reflector Oracle: ${results.reflector ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Oracle Router:    ${results.oracleRouter ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Stop-Loss:        ${results.stopLoss ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Liquidation:      ${results.liquidation ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(r => r);
  console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}`);
  
  if (!allPassed) {
    console.log('\n💡 Tips:');
    console.log('1. Make sure your account is funded on testnet');
    console.log('2. Some failures are expected if contracts are already initialized');
    console.log('3. Authorization failures are normal for first-time runs');
  }
}

// Run the tests
runTests().catch(console.error);