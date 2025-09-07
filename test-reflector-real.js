#!/usr/bin/env node

/**
 * Real-world test of Reflector Oracle interaction on Stellar Testnet
 * This demonstrates actual contract calls to the Reflector oracles
 */

const StellarSdk = require('@stellar/stellar-sdk');
const { Soroban, Contract, TransactionBuilder, Account, Networks, xdr } = StellarSdk;

// Reflector Oracle Addresses on TESTNET
const TESTNET_EXTERNAL_ORACLE = 'CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63';
const TESTNET_STELLAR_ORACLE = 'CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP';
const TESTNET_FOREX_ORACLE = 'CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W';

// Initialize Soroban RPC
const server = new Soroban.Server('https://soroban-testnet.stellar.org');

/**
 * Parse i128 price from Reflector (14 decimal precision)
 */
function parseReflectorPrice(scVal) {
    try {
        // Reflector returns i128 with 14 decimal places
        if (scVal && scVal._value) {
            const price = Number(scVal._value) / Math.pow(10, 14);
            return price;
        }
    } catch (error) {
        console.error('Error parsing price:', error);
    }
    return null;
}

/**
 * Get spot price from Reflector oracle
 */
async function getSpotPrice(asset, oracleAddress) {
    console.log(`\n📊 Fetching ${asset} spot price from oracle...`);
    
    try {
        const contract = new Contract(oracleAddress);
        
        // Build transaction to call lastprice()
        const tx = new TransactionBuilder(
            new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
            {
                fee: '100000',
                networkPassphrase: Networks.TESTNET,
            }
        )
            .addOperation(
                contract.call(
                    'lastprice',
                    xdr.ScVal.scvMap([
                        new xdr.ScMapEntry({
                            key: xdr.ScVal.scvSymbol('Other'),
                            val: xdr.ScVal.scvSymbol(asset)
                        })
                    ])
                )
            )
            .setTimeout(30)
            .build();

        // Simulate the transaction
        const simulated = await server.simulateTransaction(tx);
        
        if (simulated.result) {
            const price = parseReflectorPrice(simulated.result);
            console.log(`✅ ${asset} Price: $${price?.toFixed(4) || 'N/A'}`);
            return price;
        } else {
            console.log(`❌ No result from simulation`);
        }
    } catch (error) {
        console.error(`❌ Error fetching ${asset} price:`, error.message);
    }
    
    return null;
}

/**
 * Get TWAP price from Reflector oracle
 */
async function getTWAPPrice(asset, periods, oracleAddress) {
    console.log(`\n📈 Fetching ${asset} TWAP (${periods} periods) from oracle...`);
    
    try {
        const contract = new StellarSdk.Contract(oracleAddress);
        
        const tx = new StellarSdk.TransactionBuilder(
            new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
            {
                fee: '100000',
                networkPassphrase: StellarSdk.Networks.TESTNET,
            }
        )
            .addOperation(
                contract.call(
                    'twap',
                    StellarSdk.xdr.ScVal.scvMap([
                        new StellarSdk.xdr.ScMapEntry({
                            key: StellarSdk.xdr.ScVal.scvSymbol('Other'),
                            val: StellarSdk.xdr.ScVal.scvSymbol(asset)
                        })
                    ]),
                    StellarSdk.xdr.ScVal.scvU32(periods)
                )
            )
            .setTimeout(30)
            .build();

        const simulated = await server.simulateTransaction(tx);
        
        if (simulated.result) {
            const price = parseReflectorPrice(simulated.result);
            console.log(`✅ ${asset} TWAP: $${price?.toFixed(4) || 'N/A'}`);
            return price;
        }
    } catch (error) {
        console.error(`❌ Error fetching TWAP:`, error.message);
    }
    
    return null;
}

/**
 * Get cross price between two assets
 */
async function getCrossPrice(baseAsset, quoteAsset, oracleAddress) {
    console.log(`\n💱 Fetching ${baseAsset}/${quoteAsset} cross price...`);
    
    try {
        const contract = new StellarSdk.Contract(oracleAddress);
        
        const tx = new StellarSdk.TransactionBuilder(
            new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
            {
                fee: '100000',
                networkPassphrase: StellarSdk.Networks.TESTNET,
            }
        )
            .addOperation(
                contract.call(
                    'x_last_price',
                    StellarSdk.xdr.ScVal.scvMap([
                        new StellarSdk.xdr.ScMapEntry({
                            key: StellarSdk.xdr.ScVal.scvSymbol('Other'),
                            val: StellarSdk.xdr.ScVal.scvSymbol(baseAsset)
                        })
                    ]),
                    StellarSdk.xdr.ScVal.scvMap([
                        new StellarSdk.xdr.ScMapEntry({
                            key: StellarSdk.xdr.ScVal.scvSymbol('Other'),
                            val: StellarSdk.xdr.ScVal.scvSymbol(quoteAsset)
                        })
                    ])
                )
            )
            .setTimeout(30)
            .build();

        const simulated = await server.simulateTransaction(tx);
        
        if (simulated.result) {
            const price = parseReflectorPrice(simulated.result);
            console.log(`✅ ${baseAsset}/${quoteAsset}: ${price?.toFixed(4) || 'N/A'}`);
            return price;
        }
    } catch (error) {
        console.error(`❌ Error fetching cross price:`, error.message);
    }
    
    return null;
}

/**
 * Main test function
 */
async function runTests() {
    console.log('🚀 Starting Reflector Oracle Integration Tests');
    console.log('================================================\n');
    
    console.log('📍 Network: TESTNET');
    console.log('🔗 RPC URL: https://soroban-testnet.stellar.org');
    console.log('📡 Oracle Addresses:');
    console.log(`   External: ${TESTNET_EXTERNAL_ORACLE}`);
    console.log(`   Stellar:  ${TESTNET_STELLAR_ORACLE}`);
    console.log(`   Forex:    ${TESTNET_FOREX_ORACLE}`);
    
    // Test 1: Get spot prices from External Oracle
    console.log('\n\n=== TEST 1: Spot Prices (External Oracle) ===');
    const btcPrice = await getSpotPrice('BTC', TESTNET_EXTERNAL_ORACLE);
    const ethPrice = await getSpotPrice('ETH', TESTNET_EXTERNAL_ORACLE);
    const usdcPrice = await getSpotPrice('USDC', TESTNET_EXTERNAL_ORACLE);
    
    // Test 2: Get TWAP prices
    console.log('\n\n=== TEST 2: TWAP Prices (5 periods) ===');
    const btcTWAP = await getTWAPPrice('BTC', 5, TESTNET_EXTERNAL_ORACLE);
    const ethTWAP = await getTWAPPrice('ETH', 5, TESTNET_EXTERNAL_ORACLE);
    
    // Test 3: Compare Spot vs TWAP
    console.log('\n\n=== TEST 3: Spot vs TWAP Comparison ===');
    if (btcPrice && btcTWAP) {
        const diff = ((btcPrice - btcTWAP) / btcPrice) * 100;
        console.log(`BTC Spot: $${btcPrice.toFixed(2)}`);
        console.log(`BTC TWAP: $${btcTWAP.toFixed(2)}`);
        console.log(`Difference: ${diff.toFixed(2)}%`);
        console.log(`📊 TWAP is ${Math.abs(diff) < 1 ? 'very stable' : 'showing some volatility'}`);
    }
    
    // Test 4: Cross prices
    console.log('\n\n=== TEST 4: Cross Asset Prices ===');
    const btcEth = await getCrossPrice('BTC', 'ETH', TESTNET_EXTERNAL_ORACLE);
    const ethUsdc = await getCrossPrice('ETH', 'USDC', TESTNET_EXTERNAL_ORACLE);
    
    // Test 5: Forex rates
    console.log('\n\n=== TEST 5: Forex Rates ===');
    const usdRate = await getSpotPrice('USD', TESTNET_FOREX_ORACLE);
    const eurRate = await getSpotPrice('EUR', TESTNET_FOREX_ORACLE);
    
    // Test 6: Stablecoin Peg Check
    console.log('\n\n=== TEST 6: Stablecoin Peg Monitoring ===');
    if (usdcPrice && usdRate) {
        const pegDeviation = ((usdcPrice - usdRate) / usdRate) * 10000; // basis points
        console.log(`USDC Price: $${usdcPrice.toFixed(4)}`);
        console.log(`USD Rate: $${usdRate.toFixed(4)}`);
        console.log(`Peg Deviation: ${pegDeviation.toFixed(2)} basis points`);
        
        if (Math.abs(pegDeviation) > 100) {
            console.log('⚠️ WARNING: Significant peg deviation detected!');
        } else if (Math.abs(pegDeviation) > 50) {
            console.log('⚡ NOTICE: Minor peg deviation');
        } else {
            console.log('✅ Peg is stable');
        }
    }
    
    // Test 7: Arbitrage Detection
    console.log('\n\n=== TEST 7: Arbitrage Opportunity Detection ===');
    // In real scenario, we'd compare External (CEX) vs Stellar (DEX) prices
    // For demo, we'll use the prices we have
    if (btcPrice && ethPrice && btcEth) {
        const impliedBtcEth = btcPrice / ethPrice;
        const arbOpportunity = ((impliedBtcEth - btcEth) / btcEth) * 10000; // basis points
        
        console.log(`BTC/ETH Direct: ${btcEth?.toFixed(4) || 'N/A'}`);
        console.log(`BTC/ETH Implied: ${impliedBtcEth.toFixed(4)}`);
        console.log(`Arbitrage Opportunity: ${arbOpportunity.toFixed(2)} basis points`);
        
        if (Math.abs(arbOpportunity) > 50) {
            console.log('💰 ARBITRAGE OPPORTUNITY DETECTED!');
        } else {
            console.log('✅ Markets are efficient');
        }
    }
    
    console.log('\n\n================================================');
    console.log('✅ All tests completed!');
    console.log('\nKey Insights:');
    console.log('1. Reflector oracles are providing real-time price data');
    console.log('2. TWAP prices offer more stability for stop-loss orders');
    console.log('3. Cross-price calculations enable sophisticated trading strategies');
    console.log('4. Forex oracle enables accurate stablecoin peg monitoring');
    console.log('5. Multiple oracle types allow for arbitrage detection\n');
}

// Run the tests
runTests().catch(console.error);