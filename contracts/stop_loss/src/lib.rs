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
const TESTNET_FOREX_ORACLE: &str = "CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W";

// Reflector Oracle Addresses - Mainnet  
const MAINNET_EXTERNAL_ORACLE: &str = "CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN";
const MAINNET_STELLAR_ORACLE: &str = "CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M";
const MAINNET_FOREX_ORACLE: &str = "CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC";

// Contract Constants
const MAX_PERSISTENT_TTL: u32 = 31536000; // 1 year in seconds
const MIN_ORDER_AMOUNT: i128 = 1_000_000; // 0.1 token (7 decimals)
const PROTOCOL_FEE_BPS: u32 = 10; // 0.1%
const MAX_ORDERS_PER_USER: u32 = 100; // Max orders per user

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StopLossOrder {
    pub owner: Address,
    pub asset: Symbol,
    pub amount: i128,
    pub stop_price: i128,
    pub trailing_percent: Option<u32>,
    pub highest_price: i128,
    pub take_profit_price: Option<i128>,
    pub created_at: u64,
    pub status: OrderStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum OrderStatus {
    Active,
    Executed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum OrderType {
    StopLoss,
    TrailingStop,
    TakeProfit,
    OCO, // One-Cancels-Other
}

#[contracttype]
pub enum DataKey {
    Orders,
    OrderCounter,
    UserOrders(Address),
    Config,
    Admin,
    OracleAddress,
    ProtocolFeeRecipient,
}

#[contract]
pub struct StopLossContract;

#[contractimpl]
impl StopLossContract {
    pub fn initialize(
        env: Env, 
        admin: Address,
        oracle_address: Address,
        fee_recipient: Address,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::OracleAddress, &oracle_address);
        env.storage().instance().set(&DataKey::ProtocolFeeRecipient, &fee_recipient);
        env.storage().persistent().set(&DataKey::OrderCounter, &0u64);
        
        // Extend instance TTL
        env.storage().instance().extend_ttl(100, MAX_PERSISTENT_TTL);
    }
    
    pub fn create_stop_loss(
        env: Env,
        owner: Address,
        asset: Symbol,
        amount: i128,
        stop_price: i128,
    ) -> u64 {
        owner.require_auth();
        
        if amount < MIN_ORDER_AMOUNT {
            panic!("Amount too small");
        }
        
        let order_id = Self::get_next_order_id(&env);
        let current_price = Self::get_current_price(&env, &asset);
        
        let order = StopLossOrder {
            owner: owner.clone(),
            asset,
            amount,
            stop_price,
            trailing_percent: None,
            highest_price: current_price,
            take_profit_price: None,
            created_at: env.ledger().timestamp(),
            status: OrderStatus::Active,
        };
        
        Self::save_order(&env, order_id, &order);
        Self::add_user_order(&env, &owner, order_id);
        
        log!(&env, "Stop-loss order created: {}", order_id);
        order_id
    }
    
    pub fn create_trailing_stop(
        env: Env,
        owner: Address,
        asset: Symbol,
        amount: i128,
        trailing_percent: u32,
    ) -> u64 {
        owner.require_auth();
        
        if amount < MIN_ORDER_AMOUNT {
            panic!("Amount too small");
        }
        
        if trailing_percent == 0 || trailing_percent > 50 {
            panic!("Invalid trailing percent");
        }
        
        let order_id = Self::get_next_order_id(&env);
        let current_price = Self::get_current_price(&env, &asset);
        let stop_price = current_price * (100 - trailing_percent as i128) / 100;
        
        let order = StopLossOrder {
            owner: owner.clone(),
            asset,
            amount,
            stop_price,
            trailing_percent: Some(trailing_percent),
            highest_price: current_price,
            take_profit_price: None,
            created_at: env.ledger().timestamp(),
            status: OrderStatus::Active,
        };
        
        Self::save_order(&env, order_id, &order);
        Self::add_user_order(&env, &owner, order_id);
        
        log!(&env, "Trailing stop order created: {}", order_id);
        order_id
    }
    
    pub fn create_oco_order(
        env: Env,
        owner: Address,
        asset: Symbol,
        amount: i128,
        stop_price: i128,
        take_profit_price: i128,
    ) -> u64 {
        owner.require_auth();
        
        if amount < MIN_ORDER_AMOUNT {
            panic!("Amount too small");
        }
        
        let order_id = Self::get_next_order_id(&env);
        let current_price = Self::get_current_price(&env, &asset);
        
        if stop_price >= current_price || take_profit_price <= current_price {
            panic!("Invalid price levels");
        }
        
        let order = StopLossOrder {
            owner: owner.clone(),
            asset,
            amount,
            stop_price,
            trailing_percent: None,
            highest_price: current_price,
            take_profit_price: Some(take_profit_price),
            created_at: env.ledger().timestamp(),
            status: OrderStatus::Active,
        };
        
        Self::save_order(&env, order_id, &order);
        Self::add_user_order(&env, &owner, order_id);
        
        log!(&env, "OCO order created: {}", order_id);
        order_id
    }
    
    pub fn check_and_execute(env: Env, order_id: u64) -> bool {
        let mut order = Self::get_order(&env, order_id);
        
        if order.status != OrderStatus::Active {
            return false;
        }
        
        let current_price = Self::get_current_price(&env, &order.asset);
        let mut should_execute = false;
        let mut execution_reason = "";
        
        // Update trailing stop if applicable
        if let Some(trailing_percent) = order.trailing_percent {
            if current_price > order.highest_price {
                order.highest_price = current_price;
                let new_stop = current_price * (100 - trailing_percent as i128) / 100;
                if new_stop > order.stop_price {
                    order.stop_price = new_stop;
                    Self::save_order(&env, order_id, &order);
                    log!(&env, "Trailing stop adjusted to: {}", new_stop);
                }
            }
        }
        
        // Check stop-loss condition
        if current_price <= order.stop_price {
            should_execute = true;
            execution_reason = "stop-loss triggered";
        }
        
        // Check take-profit condition
        if let Some(take_profit) = order.take_profit_price {
            if current_price >= take_profit {
                should_execute = true;
                execution_reason = "take-profit triggered";
            }
        }
        
        if should_execute {
            Self::execute_order(&env, order_id, current_price);
            log!(&env, "Order {} executed: {}", order_id, execution_reason);
            true
        } else {
            false
        }
    }
    
    // NEW: Create TWAP-based stop loss for more stable execution
    pub fn create_twap_stop(
        env: Env,
        owner: Address,
        asset: Symbol,
        amount: i128,
        twap_periods: u32,
        stop_percentage: u32,
    ) -> u64 {
        owner.require_auth();
        
        if amount < MIN_ORDER_AMOUNT {
            panic!("Amount too small");
        }
        
        if twap_periods < 3 || twap_periods > 20 {
            panic!("TWAP periods must be between 3 and 20");
        }
        
        let order_id = Self::get_next_order_id(&env);
        
        // Get TWAP price instead of spot price
        let twap_price = Self::get_twap_price(&env, &asset, twap_periods);
        let stop_price = twap_price * (100 - stop_percentage as i128) / 100;
        
        let order = StopLossOrder {
            owner: owner.clone(),
            asset,
            amount,
            stop_price,
            trailing_percent: None,
            highest_price: twap_price,
            take_profit_price: None,
            created_at: env.ledger().timestamp(),
            status: OrderStatus::Active,
        };
        
        Self::save_order(&env, order_id, &order);
        Self::add_user_order(&env, &owner, order_id);
        
        log!(&env, "TWAP stop-loss created: {} (TWAP: {}, Stop: {})", 
             order_id, twap_price, stop_price);
        
        order_id
    }
    
    // NEW: Check and execute using TWAP instead of spot price
    pub fn check_and_execute_twap(env: Env, order_id: u64, twap_periods: u32) -> bool {
        let mut order = Self::get_order(&env, order_id);
        
        if order.status != OrderStatus::Active {
            return false;
        }
        
        // Use TWAP for more stable price comparison
        let twap_price = Self::get_twap_price(&env, &order.asset, twap_periods);
        let mut should_execute = false;
        
        // Update trailing stop based on TWAP
        if let Some(trailing_percent) = order.trailing_percent {
            if twap_price > order.highest_price {
                order.highest_price = twap_price;
                let new_stop = twap_price * (100 - trailing_percent as i128) / 100;
                if new_stop > order.stop_price {
                    order.stop_price = new_stop;
                    Self::save_order(&env, order_id, &order);
                    log!(&env, "TWAP trailing stop adjusted to: {}", new_stop);
                }
            }
        }
        
        // Check conditions using TWAP
        if twap_price <= order.stop_price {
            should_execute = true;
            log!(&env, "TWAP stop triggered: {} <= {}", twap_price, order.stop_price);
        }
        
        if let Some(take_profit) = order.take_profit_price {
            if twap_price >= take_profit {
                should_execute = true;
                log!(&env, "TWAP take-profit triggered: {} >= {}", twap_price, take_profit);
            }
        }
        
        if should_execute {
            Self::execute_order(&env, order_id, twap_price);
            true
        } else {
            false
        }
    }
    
    // NEW: Create cross-asset stop order (e.g., stop BTC position if ETH crashes)
    pub fn create_cross_asset_stop(
        env: Env,
        owner: Address,
        position_asset: Symbol,
        trigger_asset: Symbol,
        amount: i128,
        trigger_price: i128,
    ) -> u64 {
        owner.require_auth();
        
        if amount < MIN_ORDER_AMOUNT {
            panic!("Amount too small");
        }
        
        let order_id = Self::get_next_order_id(&env);
        
        // Get cross price ratio
        let cross_price = Self::get_cross_price(&env, &trigger_asset, &position_asset);
        
        let order = StopLossOrder {
            owner: owner.clone(),
            asset: position_asset,
            amount,
            stop_price: trigger_price, // This represents the trigger asset price
            trailing_percent: None,
            highest_price: cross_price,
            take_profit_price: None,
            created_at: env.ledger().timestamp(),
            status: OrderStatus::Active,
        };
        
        Self::save_order(&env, order_id, &order);
        Self::add_user_order(&env, &owner, order_id);
        
        log!(&env, "Cross-asset stop created: {} (Cross price: {})", order_id, cross_price);
        
        order_id
    }
    
    // NEW: Get historical price volatility for risk assessment
    pub fn get_price_volatility(env: Env, asset: Symbol, periods: u32) -> i128 {
        let oracle_address: Address = env.storage()
            .instance()
            .get(&DataKey::OracleAddress)
            .unwrap_or(Address::from_string(&String::from_str(&env, TESTNET_EXTERNAL_ORACLE)));
        
        let client = ReflectorClient::new(&env, &oracle_address);
        let asset_type = Asset::Other(asset.clone());  // Changed to Other for Symbol type
        
        // Get historical prices
        let prices_data = client.prices(&asset_type, &periods);
        
        if prices_data.is_none() {
            return 0;
        }
        
        let prices = prices_data.unwrap();
        
        // Calculate standard deviation
        let mut sum = 0i128;
        let mut count = 0u32;
        
        for price_data in prices.iter() {
            sum += price_data.price;
            count += 1;
        }
        
        let mean = sum / count as i128;
        let mut variance_sum = 0i128;
        
        for price_data in prices.iter() {
            let diff = price_data.price - mean;
            variance_sum += diff * diff;
        }
        
        let volatility = variance_sum / count as i128;
        
        log!(&env, "Price volatility over {} periods: {}", periods, volatility);
        
        volatility
    }
    
    pub fn cancel_order(env: Env, owner: Address, order_id: u64) {
        owner.require_auth();
        
        let mut order = Self::get_order(&env, order_id);
        
        if order.owner != owner {
            panic!("Unauthorized");
        }
        
        if order.status != OrderStatus::Active {
            panic!("Order not active");
        }
        
        order.status = OrderStatus::Cancelled;
        Self::save_order(&env, order_id, &order);
        
        log!(&env, "Order {} cancelled", order_id);
    }
    
    pub fn get_user_orders(env: Env, user: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::UserOrders(user))
            .unwrap_or(Vec::new(&env))
    }
    
    pub fn get_order_details(env: Env, order_id: u64) -> StopLossOrder {
        Self::get_order(&env, order_id)
    }
    
    // Internal helper functions
    fn get_next_order_id(env: &Env) -> u64 {
        let counter: u64 = env.storage()
            .persistent()
            .get(&DataKey::OrderCounter)
            .unwrap_or(0);
        
        let next_id = counter + 1;
        env.storage()
            .persistent()
            .set(&DataKey::OrderCounter, &next_id);
        
        // Extend TTL for counter
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::OrderCounter, 100, MAX_PERSISTENT_TTL);
        
        next_id
    }
    
    fn get_current_price(env: &Env, asset: &Symbol) -> i128 {
        let oracle_address: Address = env.storage()
            .instance()
            .get(&DataKey::OracleAddress)
            .unwrap_or(Address::from_string(&String::from_str(&env, TESTNET_EXTERNAL_ORACLE)));
        
        let client = ReflectorClient::new(&env, &oracle_address);
        let asset_type = Asset::Other(asset.clone());  // Changed to Other for Symbol type
        
        let price_data = client.lastprice(&asset_type);
        
        if price_data.is_none() {
            panic!("Price not available");
        }
        
        let price_info = price_data.unwrap();
        
        // Check if price is not stale (older than 10 minutes)
        let current_time = env.ledger().timestamp();
        if current_time - price_info.timestamp > 600 {
            panic!("Price data is stale");
        }
        
        price_info.price
    }
    
    fn save_order(env: &Env, order_id: u64, order: &StopLossOrder) {
        let mut orders: Map<u64, StopLossOrder> = env.storage()
            .persistent()
            .get(&DataKey::Orders)
            .unwrap_or(Map::new(&env));
        
        orders.set(order_id, order.clone());
        env.storage().persistent().set(&DataKey::Orders, &orders);
        
        // Extend TTL
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Orders, 100, MAX_PERSISTENT_TTL);
    }
    
    fn get_order(env: &Env, order_id: u64) -> StopLossOrder {
        let orders: Map<u64, StopLossOrder> = env.storage()
            .persistent()
            .get(&DataKey::Orders)
            .unwrap_or(Map::new(&env));
        
        orders.get(order_id).unwrap()
    }
    
    fn add_user_order(env: &Env, user: &Address, order_id: u64) {
        let mut user_orders = env.storage()
            .persistent()
            .get(&DataKey::UserOrders(user.clone()))
            .unwrap_or(Vec::new(&env));
        
        if user_orders.len() >= MAX_ORDERS_PER_USER {
            panic!("Max orders per user exceeded");
        }
        
        user_orders.push_back(order_id);
        env.storage()
            .persistent()
            .set(&DataKey::UserOrders(user.clone()), &user_orders);
        
        // Extend TTL
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::UserOrders(user.clone()), 100, MAX_PERSISTENT_TTL);
    }
    
    fn execute_order(env: &Env, order_id: u64, execution_price: i128) {
        let mut order = Self::get_order(&env, order_id);
        order.status = OrderStatus::Executed;
        
        // Calculate and deduct protocol fee
        let fee_amount = (order.amount * PROTOCOL_FEE_BPS as i128) / 10000;
        let net_amount = order.amount - fee_amount;
        
        // Here you would integrate with DEX to execute the trade
        // For now, we just mark it as executed
        
        Self::save_order(&env, order_id, &order);
        
        log!(&env, "Order {} executed at price: {}", order_id, execution_price);
    }
    
    // NEW: Get TWAP price from Reflector oracle
    fn get_twap_price(env: &Env, asset: &Symbol, periods: u32) -> i128 {
        let oracle_address: Address = env.storage()
            .instance()
            .get(&DataKey::OracleAddress)
            .unwrap_or(Address::from_string(&String::from_str(&env, TESTNET_EXTERNAL_ORACLE)));
        
        let client = ReflectorClient::new(&env, &oracle_address);
        let asset_type = Asset::Other(asset.clone());  // Changed to Other for Symbol type
        
        let twap = client.twap(&asset_type, &periods);
        
        if twap.is_none() {
            panic!("TWAP price not available");
        }
        
        twap.unwrap()
    }
    
    // NEW: Get cross price between two assets
    fn get_cross_price(env: &Env, base_asset: &Symbol, quote_asset: &Symbol) -> i128 {
        let oracle_address: Address = env.storage()
            .instance()
            .get(&DataKey::OracleAddress)
            .unwrap_or(Address::from_string(&String::from_str(&env, TESTNET_EXTERNAL_ORACLE)));
        
        let client = ReflectorClient::new(&env, &oracle_address);
        
        let base = Asset::Other(base_asset.clone());  // Changed to Other for Symbol type
        let quote = Asset::Other(quote_asset.clone());  // Changed to Other for Symbol type
        
        let cross_price_data = client.x_last_price(&base, &quote);
        
        if cross_price_data.is_none() {
            panic!("Cross price not available");
        }
        
        cross_price_data.unwrap().price
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    
    #[test]
    fn test_create_stop_loss() {
        let env = Env::default();
        let contract_id = env.register_contract(None, StopLossContract);
        let client = StopLossContractClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let oracle = Address::generate(&env);
        let fee_recipient = Address::generate(&env);
        let user = Address::generate(&env);
        let asset = Address::generate(&env);
        
        client.initialize(&admin, &oracle, &fee_recipient);
        
        env.mock_all_auths();
        
        let order_id = client.create_stop_loss(
            &user,
            &asset,
            &10_000_000_000, // 1000 tokens
            &900_000_000,    // Stop at 90
        );
        
        assert_eq!(order_id, 1);
    }
}