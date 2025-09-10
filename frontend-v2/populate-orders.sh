#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Contract details
CONTRACT_ID="CC2VFR2DSZ4DYB52YXTTDHUMFF6SFN3OMRZH6PAKN7K5BH22PPWOGWFL"
NETWORK="testnet"
SOURCE_ACCOUNT="alice"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  POPULATING STELLAR GUARD ORDERS${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Contract ID: $CONTRACT_ID${NC}"
echo -e "${BLUE}Network: $NETWORK${NC}"
echo -e "${BLUE}Source Account: $SOURCE_ACCOUNT${NC}"
echo ""

# Get the user address
USER_ADDRESS=$(stellar keys address $SOURCE_ACCOUNT)
echo -e "${GREEN}User Address: $USER_ADDRESS${NC}"
echo ""

# Counter for successful orders
SUCCESS_COUNT=0
FAIL_COUNT=0

# Function to create a stop loss order
create_stop_loss() {
    local asset=$1
    local amount=$2
    local stop_price=$3
    
    echo -e "${YELLOW}Creating stop loss order for $asset...${NC}"
    echo "  Asset: $asset"
    echo "  Amount: $amount"
    echo "  Stop Price: $stop_price"
    
    OUTPUT=$(stellar contract invoke \
        --id $CONTRACT_ID \
        --source-account $SOURCE_ACCOUNT \
        --network $NETWORK \
        --send=yes \
        -- \
        create_stop_loss \
        --owner $USER_ADDRESS \
        --asset "$asset" \
        --amount "$amount" \
        --stop_price "$stop_price" 2>&1)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Successfully created stop loss order for $asset${NC}"
        echo "  Order ID: $OUTPUT"
        ((SUCCESS_COUNT++))
    else
        echo -e "${RED}✗ Failed to create stop loss order for $asset${NC}"
        echo "  Error: $OUTPUT"
        ((FAIL_COUNT++))
    fi
    echo ""
}

# Function to create OCO (One-Cancels-Other) order
create_oco_order() {
    local asset=$1
    local amount=$2
    local stop_price=$3
    local take_profit_price=$4
    
    echo -e "${YELLOW}Creating OCO order for $asset...${NC}"
    echo "  Asset: $asset"
    echo "  Amount: $amount"
    echo "  Stop Price: $stop_price"
    echo "  Take Profit Price: $take_profit_price"
    
    OUTPUT=$(stellar contract invoke \
        --id $CONTRACT_ID \
        --source-account $SOURCE_ACCOUNT \
        --network $NETWORK \
        --send=yes \
        -- \
        create_oco_order \
        --owner $USER_ADDRESS \
        --asset "$asset" \
        --amount "$amount" \
        --stop_price "$stop_price" \
        --take_profit_price "$take_profit_price" 2>&1)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Successfully created OCO order for $asset${NC}"
        echo "  Order ID: $OUTPUT"
        ((SUCCESS_COUNT++))
    else
        echo -e "${RED}✗ Failed to create OCO order for $asset${NC}"
        echo "  Error: $OUTPUT"
        ((FAIL_COUNT++))
    fi
    echo ""
}

# Function to create TWAP stop order
create_twap_stop() {
    local asset=$1
    local amount=$2
    local stop_percentage=$3
    local twap_periods=$4
    
    echo -e "${YELLOW}Creating TWAP stop order for $asset...${NC}"
    echo "  Asset: $asset"
    echo "  Amount: $amount"
    echo "  Stop Percentage: $stop_percentage%"
    echo "  TWAP Periods: $twap_periods"
    
    OUTPUT=$(stellar contract invoke \
        --id $CONTRACT_ID \
        --source-account $SOURCE_ACCOUNT \
        --network $NETWORK \
        --send=yes \
        -- \
        create_twap_stop \
        --owner $USER_ADDRESS \
        --asset "$asset" \
        --amount "$amount" \
        --stop_percentage "$stop_percentage" \
        --twap_periods "$twap_periods" 2>&1)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Successfully created TWAP stop order for $asset${NC}"
        echo "  Order ID: $OUTPUT"
        ((SUCCESS_COUNT++))
    else
        echo -e "${RED}✗ Failed to create TWAP stop order for $asset${NC}"
        echo "  Error: $OUTPUT"
        ((FAIL_COUNT++))
    fi
    echo ""
}

# Create various types of orders with realistic data

echo -e "${BLUE}=== Creating STOP LOSS Orders ===${NC}"
echo ""

# Stop loss orders (asset, amount in stroops, stop_price in stroops)
# XLM orders - amounts in stroops (1 XLM = 10^7 stroops)
create_stop_loss "XLM" "1000000000" "1100000"   # 100 XLM, stop at $0.11
create_stop_loss "XLM" "5000000000" "1050000"   # 500 XLM, stop at $0.105
create_stop_loss "XLM" "2000000000" "1150000"   # 200 XLM, stop at $0.115
create_stop_loss "USDC" "100000000000" "9900000"  # 10000 USDC, stop at $0.99
create_stop_loss "USDC" "50000000000" "9950000"   # 5000 USDC, stop at $0.995
create_stop_loss "BTC" "10000000" "420000000000"   # 0.001 BTC, stop at $42000
create_stop_loss "ETH" "100000000" "28000000000"   # 0.01 ETH, stop at $2800

echo -e "${BLUE}=== Creating OCO (One-Cancels-Other) Orders ===${NC}"
echo ""

# OCO orders (asset, amount, stop_price, take_profit_price)
create_oco_order "XLM" "3000000000" "1100000" "1500000"       # 300 XLM, stop $0.11, TP $0.15
create_oco_order "XLM" "7500000000" "1050000" "1600000"       # 750 XLM, stop $0.105, TP $0.16
create_oco_order "USDC" "200000000000" "9800000" "10200000"   # 20000 USDC, stop $0.98, TP $1.02
create_oco_order "BTC" "5000000" "400000000000" "500000000000"  # 0.0005 BTC, stop $40k, TP $50k
create_oco_order "ETH" "50000000" "26000000000" "35000000000"   # 0.005 ETH, stop $2600, TP $3500

echo -e "${BLUE}=== Creating TWAP Stop Orders ===${NC}"
echo ""

# TWAP orders (asset, amount, stop_percentage, twap_periods)
create_twap_stop "XLM" "10000000000" "5" "6"     # 1000 XLM, 5% stop, 6 periods
create_twap_stop "XLM" "20000000000" "10" "12"   # 2000 XLM, 10% stop, 12 periods
create_twap_stop "USDC" "500000000000" "3" "10"  # 50000 USDC, 3% stop, 10 periods
create_twap_stop "BTC" "20000000" "15" "8"       # 0.002 BTC, 15% stop, 8 periods
create_twap_stop "ETH" "150000000" "8" "6"       # 0.015 ETH, 8% stop, 6 periods

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}           SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Successful orders: $SUCCESS_COUNT${NC}"
echo -e "${RED}✗ Failed orders: $FAIL_COUNT${NC}"
echo ""

# Check total orders in contract
echo -e "${GREEN}=== Checking Total Orders in Contract ===${NC}"
TOTAL_ORDERS=$(stellar contract invoke \
    --id $CONTRACT_ID \
    --source-account $SOURCE_ACCOUNT \
    --network $NETWORK \
    -- \
    get_all_orders 2>/dev/null | jq '. | length' 2>/dev/null)

if [ -n "$TOTAL_ORDERS" ]; then
    echo -e "${GREEN}Total orders in contract: $TOTAL_ORDERS${NC}"
else
    TOTAL_ORDERS=$(stellar contract invoke \
        --id $CONTRACT_ID \
        --source-account $SOURCE_ACCOUNT \
        --network $NETWORK \
        -- \
        get_all_orders 2>/dev/null)
    echo -e "${GREEN}Orders in contract: $TOTAL_ORDERS${NC}"
fi

echo ""
echo -e "${GREEN}=== Getting Active Orders ===${NC}"
stellar contract invoke \
    --id $CONTRACT_ID \
    --source-account $SOURCE_ACCOUNT \
    --network $NETWORK \
    -- \
    get_active_orders 2>/dev/null

echo ""
echo -e "${GREEN}✓ Order population script complete!${NC}"
echo -e "${BLUE}You can now check your frontend to see the populated orders.${NC}"