#!/bin/bash

# Deploy script for StellarGuard contracts

set -e

echo "🚀 StellarGuard Contract Deployment"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for required tools
check_requirements() {
    echo "📋 Checking requirements..."
    
    if ! command -v stellar &> /dev/null; then
        echo -e "${RED}❌ Stellar CLI not found${NC}"
        echo "Please install: https://developers.stellar.org/docs/tools/stellar-cli"
        exit 1
    fi
    
    if ! command -v cargo &> /dev/null; then
        echo -e "${RED}❌ Cargo not found${NC}"
        echo "Please install Rust: https://rustup.rs/"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All requirements met${NC}"
}

# Build contracts
build_contracts() {
    echo -e "\n${YELLOW}🔨 Building contracts...${NC}"
    
    cd contracts
    cargo build --release --target wasm32-unknown-unknown
    
    echo -e "${GREEN}✅ Contracts built successfully${NC}"
    cd ..
}

# Deploy a contract
deploy_contract() {
    local contract_name=$1
    local wasm_path=$2
    
    echo -e "\n${YELLOW}📦 Deploying ${contract_name}...${NC}"
    
    stellar contract deploy \
        --wasm ${wasm_path} \
        --source ${DEPLOYER_SECRET} \
        --network ${NETWORK} \
        --fee 1000000
}

# Initialize contracts
initialize_contracts() {
    echo -e "\n${YELLOW}🔧 Initializing contracts...${NC}"
    
    # Initialize stop-loss contract
    stellar contract invoke \
        --id ${STOP_LOSS_CONTRACT_ID} \
        --source ${DEPLOYER_SECRET} \
        --network ${NETWORK} \
        --fee 1000000 \
        -- \
        initialize \
        --admin ${ADMIN_ADDRESS} \
        --oracle_address ${REFLECTOR_ORACLE} \
        --fee_recipient ${FEE_RECIPIENT}
    
    # Initialize execution engine
    stellar contract invoke \
        --id ${EXECUTION_ENGINE_ID} \
        --source ${DEPLOYER_SECRET} \
        --network ${NETWORK} \
        --fee 1000000 \
        -- \
        initialize \
        --admin ${ADMIN_ADDRESS} \
        --stop_loss_contract ${STOP_LOSS_CONTRACT_ID} \
        --oracle_address ${REFLECTOR_ORACLE} \
        --fee_recipient ${FEE_RECIPIENT}
    
    echo -e "${GREEN}✅ Contracts initialized${NC}"
}

# Main deployment flow
main() {
    echo "Select network:"
    echo "1) Testnet"
    echo "2) Mainnet"
    read -p "Choice (1-2): " network_choice
    
    case $network_choice in
        1)
            export NETWORK="testnet"
            export REFLECTOR_ORACLE="CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN"
            ;;
        2)
            export NETWORK="mainnet"
            export REFLECTOR_ORACLE="CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN"
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            exit 1
            ;;
    esac
    
    echo -e "\n${YELLOW}Network: ${NETWORK}${NC}"
    
    # Get deployer secret key
    read -s -p "Enter deployer secret key: " DEPLOYER_SECRET
    echo
    
    # Get admin address
    read -p "Enter admin address: " ADMIN_ADDRESS
    
    # Get fee recipient
    read -p "Enter fee recipient address: " FEE_RECIPIENT
    
    # Check requirements
    check_requirements
    
    # Build contracts
    build_contracts
    
    # Deploy contracts
    echo -e "\n${YELLOW}Deploying contracts...${NC}"
    
    STOP_LOSS_ID=$(deploy_contract "stop_loss" "target/wasm32-unknown-unknown/release/stop_loss.wasm")
    echo "Stop-Loss Contract ID: ${STOP_LOSS_ID}"
    
    EXECUTION_ENGINE_ID=$(deploy_contract "execution_engine" "target/wasm32-unknown-unknown/release/execution_engine.wasm")
    echo "Execution Engine ID: ${EXECUTION_ENGINE_ID}"
    
    # Save contract IDs
    echo -e "\n${YELLOW}📝 Saving contract addresses...${NC}"
    cat > .env.contracts << EOF
NETWORK=${NETWORK}
STOP_LOSS_CONTRACT=${STOP_LOSS_ID}
EXECUTION_ENGINE_CONTRACT=${EXECUTION_ENGINE_ID}
REFLECTOR_ORACLE=${REFLECTOR_ORACLE}
ADMIN_ADDRESS=${ADMIN_ADDRESS}
FEE_RECIPIENT=${FEE_RECIPIENT}
EOF
    
    echo -e "${GREEN}✅ Deployment complete!${NC}"
    echo -e "\nContract addresses saved to .env.contracts"
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo "1. Update frontend/.env with contract addresses"
    echo "2. Start the monitoring service"
    echo "3. Deploy the frontend"
}

# Run main function
main "$@"