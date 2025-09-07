#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, MockAuth, MockAuthInvoke},
    token, vec, Env, Address
};

#[test]
fn test_create_stop_loss_order() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, StopLossContract);
    let client = StopLossContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let asset = Address::generate(&env);
    let amount: i128 = 1000000000; // 100 tokens with 7 decimals
    let stop_price: i128 = 500000000; // $50 with 7 decimals
    
    // Create stop loss order
    let order_id = client.create_stop_loss(&owner, &asset, &amount, &stop_price);
    
    assert_eq!(order_id, 1);
    
    // Get order details
    let order = client.get_order(&order_id);
    assert_eq!(order.owner, owner);
    assert_eq!(order.asset, asset);
    assert_eq!(order.amount, amount);
    assert_eq!(order.stop_price, stop_price);
    assert_eq!(order.status, OrderStatus::Active);
}

#[test]
fn test_create_twap_stop_order() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, StopLossContract);
    let client = StopLossContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let asset = Address::generate(&env);
    let amount: i128 = 1000000000;
    let twap_periods: u32 = 5;
    let stop_percentage: u32 = 9500; // 95% = 5% stop loss
    
    // Create TWAP stop order
    let order_id = client.create_twap_stop(
        &owner, 
        &asset, 
        &amount, 
        &twap_periods,
        &stop_percentage
    );
    
    assert_eq!(order_id, 1);
    
    // Verify order created
    let order = client.get_order(&order_id);
    assert_eq!(order.owner, owner);
    assert_eq!(order.asset, asset);
    assert_eq!(order.amount, amount);
    assert_eq!(order.status, OrderStatus::Active);
}

#[test]
fn test_cancel_order() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, StopLossContract);
    let client = StopLossContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let asset = Address::generate(&env);
    let amount: i128 = 1000000000;
    let stop_price: i128 = 500000000;
    
    // Create order
    let order_id = client.create_stop_loss(&owner, &asset, &amount, &stop_price);
    
    // Cancel order
    client.cancel_order(&owner, &order_id);
    
    // Verify order cancelled
    let order = client.get_order(&order_id);
    assert_eq!(order.status, OrderStatus::Cancelled);
}

#[test]
fn test_update_trailing_stop() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, StopLossContract);
    let client = StopLossContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let asset = Address::generate(&env);
    let amount: i128 = 1000000000;
    let stop_price: i128 = 500000000;
    let trailing_percent: u32 = 500; // 5%
    
    // Create trailing stop order
    let order_id = client.create_trailing_stop(
        &owner,
        &asset, 
        &amount,
        &stop_price,
        &trailing_percent
    );
    
    // Simulate price increase to $60
    let new_price: i128 = 600000000;
    client.update_trailing_stop(&order_id, &new_price);
    
    // Verify stop price updated
    let order = client.get_order(&order_id);
    let expected_new_stop = new_price * 95 / 100; // 95% of new price
    assert_eq!(order.stop_price, expected_new_stop);
}

#[test]
fn test_get_user_orders() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, StopLossContract);
    let client = StopLossContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let asset1 = Address::generate(&env);
    let asset2 = Address::generate(&env);
    
    // Create multiple orders
    client.create_stop_loss(&owner, &asset1, &1000000000, &500000000);
    client.create_stop_loss(&owner, &asset2, &2000000000, &300000000);
    client.create_stop_loss(&owner, &asset1, &1500000000, &450000000);
    
    // Get user orders
    let orders = client.get_user_orders(&owner);
    assert_eq!(orders.len(), 3);
    
    // Verify all orders belong to owner
    for order_id in orders.iter() {
        let order = client.get_order(&order_id);
        assert_eq!(order.owner, owner);
    }
}

#[test]
#[should_panic(expected = "Order not found")]
fn test_get_nonexistent_order() {
    let env = Env::default();
    let contract_id = env.register_contract(None, StopLossContract);
    let client = StopLossContractClient::new(&env, &contract_id);
    
    // Try to get non-existent order
    client.get_order(&999);
}

#[test]
#[should_panic(expected = "Only owner can cancel")]
fn test_cancel_order_not_owner() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, StopLossContract);
    let client = StopLossContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let other = Address::generate(&env);
    let asset = Address::generate(&env);
    
    // Create order with owner
    let order_id = client.create_stop_loss(&owner, &asset, &1000000000, &500000000);
    
    // Try to cancel with different address
    client.cancel_order(&other, &order_id);
}

#[test]
fn test_cross_asset_stop() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, StopLossContract);
    let client = StopLossContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let base_asset = Address::generate(&env); // BTC
    let quote_asset = Address::generate(&env); // ETH
    let amount: i128 = 1000000000;
    let stop_ratio: i128 = 150000000; // 15 ETH per BTC with 7 decimals
    
    // Create cross-asset stop order
    let order_id = client.create_cross_asset_stop(
        &owner,
        &base_asset,
        &quote_asset,
        &amount,
        &stop_ratio
    );
    
    assert_eq!(order_id, 1);
    
    // Verify order details
    let order = client.get_order(&order_id);
    assert_eq!(order.owner, owner);
    assert_eq!(order.asset, base_asset);
    assert_eq!(order.amount, amount);
}

#[test]
fn test_batch_order_creation() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, StopLossContract);
    let client = StopLossContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    
    // Create batch of orders
    let orders = vec![
        &env,
        OrderParams {
            asset: Address::generate(&env),
            amount: 1000000000,
            stop_price: 500000000,
            order_type: OrderType::StopLoss,
        },
        OrderParams {
            asset: Address::generate(&env),
            amount: 2000000000,
            stop_price: 300000000,
            order_type: OrderType::TakeProfit,
        },
        OrderParams {
            asset: Address::generate(&env),
            amount: 1500000000,
            stop_price: 450000000,
            order_type: OrderType::StopLoss,
        }
    ];
    
    let order_ids = client.create_batch_orders(&owner, &orders);
    
    assert_eq!(order_ids.len(), 3);
    
    // Verify all orders created correctly
    for (i, order_id) in order_ids.iter().enumerate() {
        let order = client.get_order(&order_id);
        assert_eq!(order.owner, owner);
        assert_eq!(order.amount, orders.get(i as u32).unwrap().amount);
    }
}