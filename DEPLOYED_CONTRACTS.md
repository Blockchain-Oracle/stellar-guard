# 🚀 DEPLOYED CONTRACTS - STELLAR TESTNET

## Network Information
- **Network**: Testnet
- **RPC URL**: https://soroban-testnet.stellar.org
- **Explorer**: https://stellar.expert/explorer/testnet/

## Deployment Account
- **Alias**: alice
- **Public Key**: `GBAOLK457RDF3AFRQA3LWD3OZTWUNGSUK4JDAIFBLX5TS5IB5YL5V6OH`
- **Secret Key**: `SBDFU6DIZQ4YJAX6237BB6H2OTRNAA53O4ORZW3I4XX5LYSUS6MHFWAD`

---

## ✅ DEPLOYED CONTRACTS

### 1. Stop-Loss Contract (Updated v2 with SDK v23.0.2)
- **Contract ID**: `CC2VFR2DSZ4DYB52YXTTDHUMFF6SFN3OMRZH6PAKN7K5BH22PPWOGWFL`
- **Explorer Link**: [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CC2VFR2DSZ4DYB52YXTTDHUMFF6SFN3OMRZH6PAKN7K5BH22PPWOGWFL)
- **Deployment TX**: `dee0332475ff405cf155fd604e80f67f5e0dc3cd24b259ce9aa915dc13160d00`
- **Status**: ✅ DEPLOYED & INITIALIZED (Latest)
- **Previous Contract**: `CB7MN5A7IOEBR6OJS2BU7BDUGAGX2TPN2VCSQOWYGUV7WAVUVNBVQHOX` (deprecated)
- **Functions**:
  - `initialize(admin, oracle_address, fee_recipient)` - Initialize contract
  - `create_stop_loss(owner, asset, amount, stop_price)` - Create order
  - `create_trailing_stop(owner, asset, amount, trailing_percent)` - Create trailing stop
  - `create_oco_order(owner, asset, amount, stop_price, take_profit_price)` - Create OCO order
  - `get_order_details(order_id)` - Get order details
  - `get_user_orders(user)` - Get user's orders
  - `get_all_orders()` - Get all order IDs (NEW)
  - `get_order_count()` - Get total order count (NEW)
  - `get_orders_paginated(start, limit)` - Get orders with pagination (NEW)
  - `get_active_orders()` - Get only active orders (NEW)
  - `get_orders_by_status(status)` - Get orders by status (NEW)
  - `cancel_order(owner, order_id)` - Cancel order
  - `check_and_execute(order_id)` - Execute if triggered

### 2. Liquidation Contract (working_liquidation)
- **Contract ID**: `CACBFLZ2IDRV45WZ2SYZ27C5ILPJTP6TUS5PQDXZBPNXCOHOP7CPLRJW`
- **Explorer Link**: [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CACBFLZ2IDRV45WZ2SYZ27C5ILPJTP6TUS5PQDXZBPNXCOHOP7CPLRJW)
- **Status**: ✅ DEPLOYED & INITIALIZED
- **Functions**:
  - `initialize(oracle_address)`
  - `create_loan(borrower, collateral_asset, collateral_amount, borrowed_asset, borrowed_amount, liquidation_threshold)`
  - `check_liquidation(loan_id, collateral_price, borrowed_price)`
  - `liquidate(loan_id)`

### 3. Portfolio Rebalancer Contract
- **Contract ID**: `[TO BE DEPLOYED]`
- **Status**: 🔄 PENDING
- **Functions**:
  - `initialize(oracle_address)`
  - `create_portfolio(owner, positions)`
  - `calculate_rebalance(portfolio_id, threshold_bps)`
  - `update_positions(portfolio_id, owner, positions)`

### 4. Oracle Router Contract (working_oracle_router)
- **Contract ID**: `CB3AWIGZ66E3DNPWY22T2RRKW2VYYKQNJOYTT56FD4LOVKVGTFF5L3FN`
- **Explorer Link**: [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CB3AWIGZ66E3DNPWY22T2RRKW2VYYKQNJOYTT56FD4LOVKVGTFF5L3FN)
- **Status**: ✅ DEPLOYED & INITIALIZED
- **Functions**:
  - `initialize(network)`
  - `get_oracle_for_asset(asset_type)`
  - `route_price_query(asset_type)`

### 5. Execution Engine Contract
- **Contract ID**: `[TO BE DEPLOYED]`
- **Status**: 🔄 PENDING
- **Functions**:
  - `initialize(stop_loss_contract, oracle_address)`
  - `execute_order(order_id, slippage_bps)`
  - `execute_batch(order_ids)`

---

## 📡 REFLECTOR ORACLE ADDRESSES (TESTNET)

### External Oracle (CEX/DEX Prices)
- **Address**: `CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63`
- **Supported**: BTC, ETH, USDC, USDT, SOL, AVAX, LINK, DOT, MATIC, etc.

### Stellar Oracle (Native Assets)
- **Address**: `CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP`
- **Supported**: XLM and Stellar native assets

### Forex Oracle (Fiat Rates)
- **Address**: `CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W`
- **Supported**: USD, EUR, GBP, JPY, CNY, etc.

---

## 🧪 TEST DATA

### Created Orders on Stop-Loss Contract
1. **Order #1**
   - Owner: `GBAOLK457RDF3AFRQA3LWD3OZTWUNGSUK4JDAIFBLX5TS5IB5YL5V6OH`
   - Asset: `CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63` (External Oracle as asset)
   - Amount: 1,000,000,000 (100 units with 7 decimals)
   - Stop Price: 500,000,000 ($50 with 7 decimals)
   - Status: Active
   - Created At: 1757010545

---

## 🔧 DEPLOYMENT COMMANDS

### Deploy Contract
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/CONTRACT_NAME.wasm \
  --source alice \
  --network testnet
```

### Initialize Contract
```bash
stellar contract invoke \
  --id CONTRACT_ID \
  --source alice \
  --network testnet \
  -- \
  initialize \
  --oracle_address ORACLE_ADDRESS
```

### Generate TypeScript Bindings
```bash
stellar contract bindings typescript \
  --network testnet \
  --contract-id CONTRACT_ID \
  --output-dir packages/CONTRACT_NAME
```

---

## 📝 NOTES

1. All contracts use 7 decimal precision for amounts and prices
2. Reflector oracles use 14 decimal precision (divide by 10^14)
3. All contracts are upgradeable via the admin key
4. Gas fees on testnet are minimal (100,000 stroops per operation)

---

## 🔄 UPDATE HISTORY

- **2024-09-04 19:26**: Deployed simple_stop_loss contract
- **2024-09-04 19:27**: Initialized with External Oracle
- **2024-09-04 19:28**: Created first test order
- **2024-09-04 19:29**: Generated TypeScript bindings
- **2024-09-04 19:53**: Deployed liquidation contract
- **2024-09-04 19:53**: Deployed oracle router contract
- **2024-09-04 19:54**: Initialized both contracts
- **2024-09-04 19:55**: Created loan #1 in liquidation contract
- **2024-09-04 19:56**: Tested liquidation checks with different prices

---

## ⚠️ IMPORTANT

Keep this file updated whenever:
- New contracts are deployed
- Contract addresses change
- New test data is created
- Oracle addresses are updated