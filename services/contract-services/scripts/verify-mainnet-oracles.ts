#!/usr/bin/env ts-node

/**
 * Verify Mainnet Oracle Addresses
 * Tests the Reflector oracle addresses on mainnet to confirm they're correct
 */

import { 
  Contract,
  rpc,
  xdr,
  scValToNative,
  TransactionBuilder,
  Networks,
  Keypair,
  BASE_FEE
} from '@stellar/stellar-sdk';

// Mainnet Reflector Oracle Addresses to verify
const MAINNET_ORACLES = {
  EXTERNAL: 'CA2V4IXNCEKV6XQJR42FA25KXUMFQMBJLW3ZKRVU4FXCJUPUMDZMDM5S',
  STELLAR: 'CBMS4EXBYPTVGBH6CB5QM4I5OY4P2QQ6L7HGFPFBRLNV5P7524L4G66I',
  FOREX: 'CAHBESFLDZEUK5FMJOUSFRKPJJKXWKTLYF4HRLC7VGJJRMGD2X6V3EK5'
};

async function verifyOracle(
  server: SorobanRpc.Server,
  oracleAddress: string,
  oracleName: string,
  assetSymbol: string
): Promise<boolean> {
  console.log(`\n🔍 Verifying ${oracleName} Oracle: ${oracleAddress}`);
  console.log(`   Testing with asset: ${assetSymbol}`);
  
  try {
    // Create a dummy keypair for simulation (no real transaction)
    const keypair = Keypair.random();
    const account = await server.getAccount(keypair.publicKey()).catch(() => ({
      accountId: keypair.publicKey(),
      sequence: "0"
    }));
    
    // Build contract call
    const contract = new Contract(oracleAddress);
    const asset = xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol('Other'),
      xdr.ScVal.scvSymbol(assetSymbol)
    ]);
    
    const transaction = new TransactionBuilder(account as any, {
      fee: BASE_FEE,
      networkPassphrase: Networks.PUBLIC
    })
      .addOperation(contract.call('lastprice', asset))
      .setTimeout(30)
      .build();
    
    // Simulate the transaction
    const simulated = await server.simulateTransaction(transaction);
    
    if (SorobanRpc.Api.isSimulationSuccess(simulated) && simulated.result) {
      const result = scValToNative(simulated.result.retval);
      if (result && result.price) {
        const price = Number(result.price) / 1e14; // Convert from 14 decimals
        console.log(`   ✅ SUCCESS: ${assetSymbol} price = $${price.toFixed(2)}`);
        console.log(`   Timestamp: ${new Date(Number(result.timestamp) * 1000).toISOString()}`);
        return true;
      }
    }
    
    if (SorobanRpc.Api.isSimulationError(simulated)) {
      console.log(`   ❌ Simulation error: ${simulated.error}`);
      return false;
    }
    
    console.log(`   ⚠️ No price data returned`);
    return false;
    
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Mainnet Reflector Oracle Verification');
  console.log('=========================================');
  
  // Connect to mainnet
  const server = new SorobanRpc.Server('https://soroban-rpc.stellar.org');
  
  const results: Record<string, boolean> = {};
  
  // Test External Oracle (should have crypto prices)
  results.external = await verifyOracle(
    server,
    MAINNET_ORACLES.EXTERNAL,
    'External (CEX/DEX)',
    'BTC'
  );
  
  // Test another asset on External Oracle
  await verifyOracle(
    server,
    MAINNET_ORACLES.EXTERNAL,
    'External (CEX/DEX)',
    'ETH'
  );
  
  // Test Stellar Oracle (should have XLM)
  results.stellar = await verifyOracle(
    server,
    MAINNET_ORACLES.STELLAR,
    'Stellar Pubnet',
    'XLM'
  );
  
  // Test Forex Oracle (should have USD, EUR, etc)
  results.forex = await verifyOracle(
    server,
    MAINNET_ORACLES.FOREX,
    'Foreign Exchange',
    'EUR'
  );
  
  // Summary
  console.log('\n📋 VERIFICATION SUMMARY');
  console.log('=======================');
  console.log(`External Oracle: ${results.external ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`Stellar Oracle:  ${results.stellar ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`Forex Oracle:    ${results.forex ? '✅ VALID' : '❌ INVALID'}`);
  
  if (Object.values(results).every(r => r)) {
    console.log('\n✅ All mainnet oracle addresses are CONFIRMED VALID!');
    console.log('\n📝 Confirmed Mainnet Addresses:');
    console.log(`   External: ${MAINNET_ORACLES.EXTERNAL}`);
    console.log(`   Stellar:  ${MAINNET_ORACLES.STELLAR}`);
    console.log(`   Forex:    ${MAINNET_ORACLES.FOREX}`);
  } else {
    console.log('\n⚠️ Some oracle addresses may need verification');
    console.log('Note: Some oracles may not have all asset types available');
  }
}

// Run verification
main().catch(console.error);