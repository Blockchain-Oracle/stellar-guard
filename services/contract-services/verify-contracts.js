/**
 * Verify deployed contracts are accessible
 */

const { CONTRACTS } = require('./dist');
const { Contract, Keypair, rpc } = require('@stellar/stellar-sdk');

const TEST_SECRET = 'SBT37CGNZLWR6E6ISKXBVIQ3IEPAO5CGIBAOQBKMDADDSZIECQFL4OPZ';
const TEST_KEYPAIR = Keypair.fromSecret(TEST_SECRET);

async function verifyContracts() {
  console.log('\n🔍 Verifying Deployed Contracts\n');
  
  const server = new rpc.Server('https://soroban-testnet.stellar.org:443');
  
  // Check each contract
  for (const [name, address] of Object.entries(CONTRACTS)) {
    console.log(`\n${name}: ${address}`);
    
    try {
      // Get contract data
      const contract = new Contract(address);
      const contractData = await server.getContractData(
        contract.address(), 
        rpc.xdr.ScVal.scvSymbol('ADMIN')
      );
      
      if (contractData) {
        console.log('✅ Contract exists and has data');
      } else {
        console.log('⚠️  Contract exists but no ADMIN data');
      }
    } catch (e) {
      if (e.message.includes('not found')) {
        console.log('❌ Contract data not found - may need initialization');
      } else {
        console.log('⚠️  Error checking contract:', e.message);
      }
    }
    
    // Try to get contract WASM
    try {
      const wasmId = await server.getContractWasmByContractId(address);
      if (wasmId) {
        console.log(`✅ Contract WASM ID: ${wasmId.slice(0, 16)}...`);
      }
    } catch (e) {
      console.log('⚠️  Could not get WASM ID');
    }
  }
  
  console.log('\n📝 Summary:');
  console.log('- Stop-Loss Contract:', CONTRACTS.STOP_LOSS);
  console.log('- Liquidation Contract:', CONTRACTS.LIQUIDATION);
  console.log('- Oracle Router:', CONTRACTS.ORACLE_ROUTER);
  console.log('\nAll contracts are deployed to testnet.');
  console.log('Some may need initialization or have uninitialized state.');
}

verifyContracts().catch(console.error);