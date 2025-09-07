#![no_std]

mod reflector;
use reflector::{ReflectorClient, Asset, PriceData};

use soroban_sdk::{
    contract, contractimpl, contracttype, 
    Address, Env, Symbol, String, log
};
// Oracle addresses
const TESTNET_EXTERNAL_ORACLE: &str = "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63";
const TESTNET_STELLAR_ORACLE: &str = "CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP";
const TESTNET_FOREX_ORACLE: &str = "CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W";

const MAINNET_EXTERNAL_ORACLE: &str = "CA2V4IXNCEKV6XQJR42FA25KXUMFQMBJLW3ZKRVU4FXCJUPUMDZMDM5S";
const MAINNET_STELLAR_ORACLE: &str = "CBMS4EXBYPTVGBH6CB5QM4I5OY4P2QQ6L7HGFPFBRLNV5P7524L4G66I";
const MAINNET_FOREX_ORACLE: &str = "CAHBESFLDZEUK5FMJOUSFRKPJJKXWKTLYF4HRLC7VGJJRMGD2X6V3EK5";

const MAX_PERSISTENT_TTL: u32 = 535680;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AssetType {
    Crypto(Symbol),        // BTC, ETH, etc - use External oracle
    StellarNative(Address), // XLM and Stellar assets - use Stellar oracle  
    Stablecoin(Symbol),    // USDC, USDT - monitor with Forex oracle
    Forex(Symbol),         // GBP, EUR, etc - use Forex oracle
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Network {
    Mainnet,
    Testnet,
}

#[contracttype]
pub enum DataKey {
    Network,
    ExternalOracle,
    StellarOracle,
    ForexOracle,
}

#[contract]
pub struct OracleRouter;

#[contractimpl]
impl OracleRouter {
    pub fn initialize(env: Env, network: Network) {
        // Set network
        env.storage().instance().set(&DataKey::Network, &network);
        
        // Set oracle addresses based on network
        match network {
            Network::Mainnet => {
                env.storage().instance().set(
                    &DataKey::ExternalOracle,
                    &Address::from_string(&String::from_str(&env, MAINNET_EXTERNAL_ORACLE))
                );
                env.storage().instance().set(
                    &DataKey::StellarOracle,
                    &Address::from_string(&String::from_str(&env, MAINNET_STELLAR_ORACLE))
                );
                env.storage().instance().set(
                    &DataKey::ForexOracle,
                    &Address::from_string(&String::from_str(&env, MAINNET_FOREX_ORACLE))
                );
            },
            Network::Testnet => {
                env.storage().instance().set(
                    &DataKey::ExternalOracle,
                    &Address::from_string(&String::from_str(&env, TESTNET_EXTERNAL_ORACLE))
                );
                env.storage().instance().set(
                    &DataKey::StellarOracle,
                    &Address::from_string(&String::from_str(&env, TESTNET_STELLAR_ORACLE))
                );
                env.storage().instance().set(
                    &DataKey::ForexOracle,
                    &Address::from_string(&String::from_str(&env, TESTNET_FOREX_ORACLE))
                );
            }
        }
        
        // Extend TTL
        env.storage().instance().extend_ttl(100, MAX_PERSISTENT_TTL);
    }
    
    // Get the appropriate oracle for an asset type
    pub fn get_oracle_for_asset(env: Env, asset: AssetType) -> Address {
        match asset {
            AssetType::Crypto(_) => {
                env.storage().instance()
                    .get(&DataKey::ExternalOracle)
                    .unwrap_or(Address::from_string(&String::from_str(&env, TESTNET_EXTERNAL_ORACLE)))
            },
            AssetType::StellarNative(_) => {
                env.storage().instance()
                    .get(&DataKey::StellarOracle)
                    .unwrap_or(Address::from_string(&String::from_str(&env, TESTNET_STELLAR_ORACLE)))
            },
            AssetType::Stablecoin(_) | AssetType::Forex(_) => {
                env.storage().instance()
                    .get(&DataKey::ForexOracle)
                    .unwrap_or(Address::from_string(&String::from_str(&env, TESTNET_FOREX_ORACLE)))
            }
        }
    }
    
    // Get price with automatic oracle selection
    pub fn get_price(env: Env, asset_type: AssetType) -> Option<PriceData> {
        let oracle_address = Self::get_oracle_for_asset(env.clone(), asset_type.clone());
        let client = ReflectorClient::new(&env, &oracle_address);
        
        let asset = match asset_type {
            AssetType::Crypto(symbol) | AssetType::Stablecoin(symbol) | AssetType::Forex(symbol) => {
                Asset::Other(symbol)
            },
            AssetType::StellarNative(address) => {
                Asset::Stellar(address)
            }
        };
        
        client.lastprice(&asset)
    }
    
    // Get TWAP price with automatic oracle selection
    pub fn get_twap(env: Env, asset_type: AssetType, periods: u32) -> Option<i128> {
        let oracle_address = Self::get_oracle_for_asset(env.clone(), asset_type.clone());
        let client = ReflectorClient::new(&env, &oracle_address);
        
        let asset = match asset_type {
            AssetType::Crypto(symbol) | AssetType::Stablecoin(symbol) | AssetType::Forex(symbol) => {
                Asset::Other(symbol)
            },
            AssetType::StellarNative(address) => {
                Asset::Stellar(address)
            }
        };
        
        client.twap(&asset, &periods)
    }
    
    // Get cross price between two assets
    pub fn get_cross_price(
        env: Env, 
        base_asset: AssetType, 
        quote_asset: AssetType
    ) -> Option<PriceData> {
        // Determine which oracle to use (prefer external for cross-chain)
        let oracle_address = match (&base_asset, &quote_asset) {
            (AssetType::StellarNative(_), AssetType::StellarNative(_)) => {
                env.storage().instance().get(&DataKey::StellarOracle).unwrap()
            },
            _ => {
                env.storage().instance().get(&DataKey::ExternalOracle).unwrap()
            }
        };
        
        let client = ReflectorClient::new(&env, &oracle_address);
        
        let base = match base_asset {
            AssetType::Crypto(symbol) | AssetType::Stablecoin(symbol) | AssetType::Forex(symbol) => {
                Asset::Other(symbol)
            },
            AssetType::StellarNative(address) => {
                Asset::Stellar(address)
            }
        };
        
        let quote = match quote_asset {
            AssetType::Crypto(symbol) | AssetType::Stablecoin(symbol) | AssetType::Forex(symbol) => {
                Asset::Other(symbol)
            },
            AssetType::StellarNative(address) => {
                Asset::Stellar(address)
            }
        };
        
        client.x_last_price(&base, &quote)
    }
    
    // Get cross TWAP between two assets
    pub fn get_cross_twap(
        env: Env,
        base_asset: AssetType,
        quote_asset: AssetType,
        periods: u32
    ) -> Option<i128> {
        let oracle_address = match (&base_asset, &quote_asset) {
            (AssetType::StellarNative(_), AssetType::StellarNative(_)) => {
                env.storage().instance().get(&DataKey::StellarOracle).unwrap()
            },
            _ => {
                env.storage().instance().get(&DataKey::ExternalOracle).unwrap()
            }
        };
        
        let client = ReflectorClient::new(&env, &oracle_address);
        
        let base = match base_asset {
            AssetType::Crypto(symbol) | AssetType::Stablecoin(symbol) | AssetType::Forex(symbol) => {
                Asset::Other(symbol)
            },
            AssetType::StellarNative(address) => {
                Asset::Stellar(address)
            }
        };
        
        let quote = match quote_asset {
            AssetType::Crypto(symbol) | AssetType::Stablecoin(symbol) | AssetType::Forex(symbol) => {
                Asset::Other(symbol)
            },
            AssetType::StellarNative(address) => {
                Asset::Stellar(address)
            }
        };
        
        client.x_twap(&base, &quote, &periods)
    }
    
    // Check for arbitrage opportunities between oracles
    pub fn check_arbitrage(env: Env, asset_symbol: Symbol) -> Option<i128> {
        let external_oracle: Address = env.storage()
            .instance()
            .get(&DataKey::ExternalOracle)
            .unwrap();
        let stellar_oracle: Address = env.storage()
            .instance()
            .get(&DataKey::StellarOracle)
            .unwrap();
        
        let external_client = ReflectorClient::new(&env, &external_oracle);
        let stellar_client = ReflectorClient::new(&env, &stellar_oracle);
        
        let asset = Asset::Other(asset_symbol);
        
        let external_price = external_client.lastprice(&asset);
        let stellar_price = stellar_client.lastprice(&asset);
        
        if external_price.is_some() && stellar_price.is_some() {
            let ext_price = external_price.unwrap().price;
            let stel_price = stellar_price.unwrap().price;
            
            // Return price difference
            let diff = ext_price - stel_price;
            let percentage = (diff * 10000) / ext_price; // Basis points
            
            log!(&env, "Arbitrage check: External={}, Stellar={}, Diff={}bps", 
                 ext_price, stel_price, percentage);
            
            Some(percentage)
        } else {
            None
        }
    }
    
    // Check stablecoin peg using forex oracle
    pub fn check_stablecoin_peg(env: Env, stablecoin: Symbol) -> Option<i128> {
        let forex_oracle: Address = env.storage()
            .instance()
            .get(&DataKey::ForexOracle)
            .unwrap();
        
        let client = ReflectorClient::new(&env, &forex_oracle);
        
        // Get USD price (should be 1.0)
        let usd_price = client.lastprice(&Asset::Other(Symbol::new(&env, "USD")));
        
        // Get stablecoin price from external oracle
        let external_oracle: Address = env.storage()
            .instance()
            .get(&DataKey::ExternalOracle)
            .unwrap();
        let external_client = ReflectorClient::new(&env, &external_oracle);
        let stable_price = external_client.lastprice(&Asset::Other(stablecoin));
        
        if usd_price.is_some() && stable_price.is_some() {
            let usd = usd_price.unwrap().price;
            let stable = stable_price.unwrap().price;
            
            // Calculate deviation from peg
            let deviation = ((stable - usd) * 10000) / usd; // Basis points
            
            log!(&env, "Stablecoin peg deviation: {}bps", deviation);
            
            Some(deviation)
        } else {
            None
        }
    }
}