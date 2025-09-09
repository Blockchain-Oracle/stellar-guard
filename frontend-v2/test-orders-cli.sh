#!/bin/bash

# Stellar Guard CLI Testing Script
# Test creating and querying orders using Stellar CLI

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contract configuration
CONTRACT_ID="CC2VFR2DSZ4DYB52YXTTDHUMFF6SFN3OMRZH6PAKN7K5BH22PPWOGWFL"
NETWORK="testnet"

# Test account - Replace with your funded testnet account
TEST_SECRET="SBFDDGL2JKM2KKEEWUYTQUXH3Y5WMGKQFDEMV2EPEVDLQVLCIZDRP7AN"
TEST_PUBLIC="GDQC3N4DGWPUCOIJ5MLPVXLZZKXCGD5M37EQTMBJBFFHUXJIYQEENBZ6"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  STELLAR GUARD ORDER CLI TEST SCRIPT  ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print section headers
print_header() {
    echo ""
    echo -e "${YELLOW}========== $1 ==========${NC}"
    echo ""
}

# Function to run command and show output
run_command() {
    echo -e "${GREEN}Executing:${NC} $1"
    eval $1
    echo ""
}

# 1. Check contract functions
print_header "CONTRACT INFORMATION"
echo "Contract ID: $CONTRACT_ID"
echo "Network: $NETWORK"
echo "Test Account: $TEST_PUBLIC"
echo ""

# 2. Get current order count
print_header "GET ORDER COUNT"
run_command "stellar contract invoke \\
    --id $CONTRACT_ID \\
    --source-account $TEST_PUBLIC \\
    --network $NETWORK \\
    -- \\
    get_order_count"

# 3. Get all orders
print_header "GET ALL ORDERS"
run_command "stellar contract invoke \\
    --id $CONTRACT_ID \\
    --source-account $TEST_PUBLIC \\
    --network $NETWORK \\
    -- \\
    get_all_orders"

# 4. Create a Stop Loss order
print_header "CREATE STOP LOSS ORDER"
echo "Creating order: Asset=XLM, Amount=100, Stop Price=0.45"
run_command "stellar contract invoke \\
    --id $CONTRACT_ID \\
    --source $TEST_SECRET \\
    --network $NETWORK \\
    --send=yes \\
    -- \\
    create_order \\
    --asset XLM \\
    --amount 1000000000 \\
    --stop_price 4500000 \\
    --order_type '{\"vec\":[{\"symbol\":\"StopLoss\"}]}'"

# Store the order ID (you'll need to manually update this after seeing the output)
ORDER_ID="0"  # Update this with the actual order ID from the output

# 5. Get specific order details
print_header "GET ORDER DETAILS"
echo "Fetching details for order #$ORDER_ID"
run_command "stellar contract invoke \\
    --id $CONTRACT_ID \\
    --source-account $TEST_PUBLIC \\
    --network $NETWORK \\
    -- \\
    get_order \\
    --order_id $ORDER_ID"

# 6. Get user orders
print_header "GET USER ORDERS"
run_command "stellar contract invoke \\
    --id $CONTRACT_ID \\
    --source-account $TEST_PUBLIC \\
    --network $NETWORK \\
    -- \\
    get_user_orders \\
    --user $TEST_PUBLIC"

# 7. Get active orders
print_header "GET ACTIVE ORDERS"
run_command "stellar contract invoke \\
    --id $CONTRACT_ID \\
    --source-account $TEST_PUBLIC \\
    --network $NETWORK \\
    -- \\
    get_active_orders"

# 8. Get orders by status
print_header "GET ORDERS BY STATUS (Active)"
run_command "stellar contract invoke \\
    --id $CONTRACT_ID \\
    --source-account $TEST_PUBLIC \\
    --network $NETWORK \\
    -- \\
    get_orders_by_status \\
    --status '{\"vec\":[{\"symbol\":\"Active\"}]}'"

# 9. Get paginated orders
print_header "GET PAGINATED ORDERS"
echo "Getting first 5 orders starting from index 0"
run_command "stellar contract invoke \\
    --id $CONTRACT_ID \\
    --source-account $TEST_PUBLIC \\
    --network $NETWORK \\
    -- \\
    get_orders_paginated \\
    --start 0 \\
    --limit 5"

# 10. Cancel an order (optional - uncomment to test)
# print_header "CANCEL ORDER"
# echo "Cancelling order #$ORDER_ID"
# run_command "stellar contract invoke \\
#     --id $CONTRACT_ID \\
#     --source $TEST_SECRET \\
#     --network $NETWORK \\
#     --send=yes \\
#     -- \\
#     cancel_order \\
#     --order_id $ORDER_ID"

print_header "TEST COMPLETE"
echo -e "${GREEN}All tests completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Check the order ID from the create_order output"
echo "2. Update the ORDER_ID variable in this script"
echo "3. Run specific queries with the actual order ID"
echo "4. Check the frontend to see if orders are displayed"
echo ""