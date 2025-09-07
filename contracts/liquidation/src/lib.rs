#![no_std]

mod reflector;
use reflector::{ReflectorClient, Asset, PriceData};

use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Env, Map, Vec, log, Symbol, String
};

// Reflector Oracle Addresses - Testnet
const TESTNET_EXTERNAL_ORACLE: &str = "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63";
const TESTNET_STELLAR_ORACLE: &str = "CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP";

// Reflector Oracle Addresses - Mainnet
const MAINNET_EXTERNAL_ORACLE: &str = "CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN";
const MAINNET_STELLAR_ORACLE: &str = "CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M";
const MAX_PERSISTENT_TTL: u32 = 535680;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AssetType {
    Stellar(Address),
    Crypto(Symbol),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Loan {
    pub owner: Address,
    pub collateral_asset: AssetType,
    pub collateral_amount: i128,
    pub borrowed_asset: AssetType,
    pub borrowed_amount: i128,
    pub liquidation_threshold: i128, // in basis points (e.g., 15000 = 150%)
    pub created_at: u64,
    pub status: LoanStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum LoanStatus {
    Active,
    Liquidated,
    Closed,
}

#[contracttype]
pub enum DataKey {
    Loans,
    LoanCounter,
    UserLoans(Address),
    OracleAddress,
    LiquidationRewards,
}

#[contract]
pub struct LiquidationProtection;

#[contractimpl]
impl LiquidationProtection {
    pub fn initialize(env: Env, oracle_address: Address) {
        env.storage().instance().set(&DataKey::OracleAddress, &oracle_address);
        env.storage().persistent().set(&DataKey::LoanCounter, &0u64);
        env.storage().persistent().set(&DataKey::LiquidationRewards, &Map::<Address, i128>::new(&env));
        
        // Extend TTL
        env.storage().instance().extend_ttl(100, MAX_PERSISTENT_TTL);
    }
    
    // Create a collateralized loan position
    pub fn create_loan(
        env: Env,
        owner: Address,
        collateral_asset: AssetType,
        collateral_amount: i128,
        borrowed_asset: AssetType,
        borrowed_amount: i128,
        liquidation_threshold: i128,
    ) -> u64 {
        owner.require_auth();
        
        // Validate liquidation threshold (must be > 100%)
        if liquidation_threshold <= 10000 {
            panic!("Liquidation threshold must be > 100%");
        }
        
        // Check initial collateralization ratio
        let collateral_ratio = Self::calculate_collateral_ratio(
            &env,
            &collateral_asset,
            collateral_amount,
            &borrowed_asset,
            borrowed_amount
        );
        
        if collateral_ratio < liquidation_threshold {
            panic!("Initial collateral insufficient");
        }
        
        let loan_id = Self::get_next_loan_id(&env);
        
        let loan = Loan {
            owner: owner.clone(),
            collateral_asset,
            collateral_amount,
            borrowed_asset,
            borrowed_amount,
            liquidation_threshold,
            created_at: env.ledger().timestamp(),
            status: LoanStatus::Active,
        };
        
        Self::save_loan(&env, loan_id, &loan);
        Self::add_user_loan(&env, &owner, loan_id);
        
        log!(&env, "Loan created: ID={}, CollRatio={}bps", loan_id, collateral_ratio);
        
        loan_id
    }
    
    // Check if a loan position needs liquidation (from Reflector example)
    pub fn check_liquidation(env: Env, loan_id: u64) -> bool {
        let loan = Self::get_loan(&env, loan_id);
        
        if loan.status != LoanStatus::Active {
            return false;
        }
        
        // Get oracle address (using external oracle for all assets)
        let oracle_address = env.storage()
            .instance()
            .get(&DataKey::OracleAddress)
            .unwrap_or(Address::from_string(&String::from_str(&env, TESTNET_EXTERNAL_ORACLE)));
        
        // Get prices from Reflector oracle
        let client = ReflectorClient::new(&env, &oracle_address);
        let collateral_price_data = match loan.collateral_asset {
            AssetType::Crypto(ref symbol) => client.lastprice(&Asset::Other(symbol.clone())),
            AssetType::Stellar(ref addr) => client.lastprice(&Asset::Stellar(addr.clone())),
        };
        let borrowed_price_data = match loan.borrowed_asset {
            AssetType::Crypto(ref symbol) => client.lastprice(&Asset::Other(symbol.clone())),
            AssetType::Stellar(ref addr) => client.lastprice(&Asset::Stellar(addr.clone())),
        };
        
        if collateral_price_data.is_none() || borrowed_price_data.is_none() {
            log!(&env, "Price data unavailable for loan {}", loan_id);
            return false;
        }
        
        let collateral_price = collateral_price_data.unwrap().price;
        let borrowed_price = borrowed_price_data.unwrap().price;
        
        // Calculate collateral value and borrowed value
        let collateral_value = collateral_price * loan.collateral_amount;
        let borrowed_value = borrowed_price * loan.borrowed_amount;
        
        // Calculate current collateralization ratio
        let collateralization_ratio = (collateral_value * 10000) / borrowed_value;
        
        log!(&env, "Loan {} collateral ratio: {}bps (threshold: {}bps)", 
             loan_id, collateralization_ratio, loan.liquidation_threshold);
        
        // Check if below liquidation threshold
        if collateralization_ratio <= loan.liquidation_threshold {
            log!(&env, "LIQUIDATION TRIGGERED for loan {}", loan_id);
            return true;
        }
        
        false
    }
    
    // Execute liquidation
    pub fn liquidate_position(env: Env, liquidator: Address, loan_id: u64) -> i128 {
        liquidator.require_auth();
        
        if !Self::check_liquidation(env.clone(), loan_id) {
            panic!("Position not eligible for liquidation");
        }
        
        let mut loan = Self::get_loan(&env, loan_id);
        
        // Calculate liquidation reward (typically 5-10% bonus)
        let liquidation_bonus_bps = 500; // 5%
        let reward = (loan.collateral_amount * liquidation_bonus_bps) / 10000;
        
        // Mark loan as liquidated
        loan.status = LoanStatus::Liquidated;
        Self::save_loan(&env, loan_id, &loan);
        
        // Record liquidation reward for liquidator
        Self::add_liquidation_reward(&env, &liquidator, reward);
        
        log!(&env, "Loan {} liquidated by {}. Reward: {}", 
             loan_id, liquidator, reward);
        
        reward
    }
    
    // Monitor health factor using TWAP for more stable pricing
    pub fn get_health_factor_twap(env: Env, loan_id: u64, periods: u32) -> i128 {
        let loan = Self::get_loan(&env, loan_id);
        
        if loan.status != LoanStatus::Active {
            return 0;
        }
        
        let oracle_address = Self::get_oracle_address(&env);
        let client = ReflectorClient::new(&env, &oracle_address);
        
        // Use TWAP for more stable pricing
        let collateral_twap = match loan.collateral_asset {
            AssetType::Crypto(ref symbol) => client.twap(&Asset::Other(symbol.clone()), &periods),
            AssetType::Stellar(ref addr) => client.twap(&Asset::Stellar(addr.clone()), &periods),
        };
        let borrowed_twap = match loan.borrowed_asset {
            AssetType::Crypto(ref symbol) => client.twap(&Asset::Other(symbol.clone()), &periods),
            AssetType::Stellar(ref addr) => client.twap(&Asset::Stellar(addr.clone()), &periods),
        };
        
        if collateral_twap.is_none() || borrowed_twap.is_none() {
            return 0;
        }
        
        let collateral_value = collateral_twap.unwrap() * loan.collateral_amount;
        let borrowed_value = borrowed_twap.unwrap() * loan.borrowed_amount;
        
        // Health factor = (collateral_value * liquidation_threshold) / borrowed_value
        // If < 1, position can be liquidated
        let health_factor = (collateral_value * 10000) / (borrowed_value * loan.liquidation_threshold / 10000);
        
        log!(&env, "Loan {} health factor (TWAP): {}", loan_id, health_factor);
        
        health_factor
    }
    
    // Add collateral to improve health factor
    pub fn add_collateral(env: Env, owner: Address, loan_id: u64, additional_amount: i128) {
        owner.require_auth();
        
        let mut loan = Self::get_loan(&env, loan_id);
        
        if loan.owner != owner {
            panic!("Unauthorized");
        }
        
        if loan.status != LoanStatus::Active {
            panic!("Loan not active");
        }
        
        loan.collateral_amount += additional_amount;
        Self::save_loan(&env, loan_id, &loan);
        
        log!(&env, "Added {} collateral to loan {}", additional_amount, loan_id);
    }
    
    // Partial repayment to improve health
    pub fn repay_loan(env: Env, owner: Address, loan_id: u64, repay_amount: i128) {
        owner.require_auth();
        
        let mut loan = Self::get_loan(&env, loan_id);
        
        if loan.owner != owner {
            panic!("Unauthorized");
        }
        
        if loan.status != LoanStatus::Active {
            panic!("Loan not active");
        }
        
        loan.borrowed_amount -= repay_amount;
        
        if loan.borrowed_amount <= 0 {
            loan.status = LoanStatus::Closed;
        }
        
        Self::save_loan(&env, loan_id, &loan);
        
        log!(&env, "Repaid {} on loan {}", repay_amount, loan_id);
    }
    
    // Internal helper functions
    fn calculate_collateral_ratio(
        env: &Env,
        collateral_asset: &AssetType,
        collateral_amount: i128,
        borrowed_asset: &AssetType,
        borrowed_amount: i128,
    ) -> i128 {
        let oracle_address = env.storage()
            .instance()
            .get(&DataKey::OracleAddress)
            .unwrap_or(Address::from_string(&String::from_str(&env, TESTNET_EXTERNAL_ORACLE)));
        let client = ReflectorClient::new(&env, &oracle_address);
        
        let collateral_price = match collateral_asset {
            AssetType::Crypto(ref symbol) => client.lastprice(&Asset::Other(symbol.clone())),
            AssetType::Stellar(ref addr) => client.lastprice(&Asset::Stellar(addr.clone())),
        };
        let borrowed_price = match borrowed_asset {
            AssetType::Crypto(ref symbol) => client.lastprice(&Asset::Other(symbol.clone())),
            AssetType::Stellar(ref addr) => client.lastprice(&Asset::Stellar(addr.clone())),
        };
        
        if collateral_price.is_none() || borrowed_price.is_none() {
            panic!("Price data unavailable");
        }
        
        let collateral_value = collateral_price.unwrap().price * collateral_amount;
        let borrowed_value = borrowed_price.unwrap().price * borrowed_amount;
        
        (collateral_value * 10000) / borrowed_value
    }
    
    fn get_next_loan_id(env: &Env) -> u64 {
        let counter: u64 = env.storage()
            .persistent()
            .get(&DataKey::LoanCounter)
            .unwrap_or(0);
        
        let next_id = counter + 1;
        env.storage()
            .persistent()
            .set(&DataKey::LoanCounter, &next_id);
        
        // Extend TTL
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::LoanCounter, 100, MAX_PERSISTENT_TTL);
        
        next_id
    }
    
    fn save_loan(env: &Env, loan_id: u64, loan: &Loan) {
        let mut loans: Map<u64, Loan> = env.storage()
            .persistent()
            .get(&DataKey::Loans)
            .unwrap_or(Map::new(&env));
        
        loans.set(loan_id, loan.clone());
        env.storage().persistent().set(&DataKey::Loans, &loans);
        
        // Extend TTL
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Loans, 100, MAX_PERSISTENT_TTL);
    }
    
    fn get_loan(env: &Env, loan_id: u64) -> Loan {
        let loans: Map<u64, Loan> = env.storage()
            .persistent()
            .get(&DataKey::Loans)
            .unwrap_or(Map::new(&env));
        
        loans.get(loan_id).unwrap()
    }
    
    fn add_user_loan(env: &Env, user: &Address, loan_id: u64) {
        let mut user_loans = env.storage()
            .persistent()
            .get(&DataKey::UserLoans(user.clone()))
            .unwrap_or(Vec::new(&env));
        
        user_loans.push_back(loan_id);
        env.storage()
            .persistent()
            .set(&DataKey::UserLoans(user.clone()), &user_loans);
        
        // Extend TTL
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::UserLoans(user.clone()), 100, MAX_PERSISTENT_TTL);
    }
    
    fn get_oracle_address(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::OracleAddress)
            .unwrap_or(Address::from_string(&String::from_str(&env, TESTNET_EXTERNAL_ORACLE)))
    }
    
    fn add_liquidation_reward(env: &Env, liquidator: &Address, amount: i128) {
        let mut rewards: Map<Address, i128> = env.storage()
            .persistent()
            .get(&DataKey::LiquidationRewards)
            .unwrap_or(Map::new(&env));
        
        let current = rewards.get(liquidator.clone()).unwrap_or(0);
        rewards.set(liquidator.clone(), current + amount);
        
        env.storage().persistent().set(&DataKey::LiquidationRewards, &rewards);
        
        // Extend TTL
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::LiquidationRewards, 100, MAX_PERSISTENT_TTL);
    }
}