import * as StellarSdk from '@stellar/stellar-sdk';
import { getServer, getNetworkPassphrase, signTransaction } from '@/lib/stellar';

// Contract address from environment
export const STOP_LOSS_CONTRACT = process.env.NEXT_PUBLIC_STOP_LOSS_CONTRACT || '';

export enum OrderType {
  StopLoss = 'stop_loss',
  TakeProfit = 'take_profit', 
  TrailingStop = 'trailing_stop',
  OCO = 'oco'
}

export interface StopLossOrder {
  id: bigint;
  user: string;
  asset: string;
  amount: bigint;
  stopPrice: bigint;
  orderType: OrderType;
  status: 'active' | 'executed' | 'cancelled';
  createdAt: number;
}

// Create stop-loss order with proper error handling
export const createStopLossOrder = async (
  userAddress: string,
  asset: string,
  amount: bigint,
  stopPrice: bigint,
  orderType: OrderType = OrderType.StopLoss
): Promise<bigint | null> => {
  try {
    if (!STOP_LOSS_CONTRACT) {
      throw new Error('Stop-loss contract address not configured');
    }

    const server = getServer();
    const account = await server.getAccount(userAddress);
    
    // Use the Contract class to properly format operations
    const contract = new StellarSdk.Contract(STOP_LOSS_CONTRACT);
    let operation;
    
    switch (orderType) {
      case OrderType.StopLoss:
        operation = contract.call(
          'create_stop_loss',
          StellarSdk.Address.fromString(userAddress).toScVal(),
          StellarSdk.xdr.ScVal.scvSymbol(asset),
          StellarSdk.nativeToScVal(amount, { type: 'i128' }),
          StellarSdk.nativeToScVal(stopPrice, { type: 'i128' })
        );
        break;
        
      case OrderType.TrailingStop:
        operation = contract.call(
          'create_trailing_stop',
          StellarSdk.Address.fromString(userAddress).toScVal(),
          StellarSdk.xdr.ScVal.scvSymbol(asset),
          StellarSdk.nativeToScVal(amount, { type: 'i128' }),
          StellarSdk.xdr.ScVal.scvU32(Number(stopPrice))
        );
        break;
        
      case OrderType.TakeProfit:
        // Take profit uses the same function as stop loss
        operation = contract.call(
          'create_stop_loss',
          StellarSdk.Address.fromString(userAddress).toScVal(),
          StellarSdk.xdr.ScVal.scvSymbol(asset),
          StellarSdk.nativeToScVal(amount, { type: 'i128' }),
          StellarSdk.nativeToScVal(stopPrice, { type: 'i128' })
        );
        break;
        
      default:
        throw new Error(`Unsupported order type: ${orderType}`);
    }
    
    // Build the transaction
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '100000', // Base fee
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    // Prepare the transaction (adds Soroban data)
    console.log('Preparing transaction...');
    let preparedTx;
    try {
      // First simulate to validate the transaction
      console.log('Simulating transaction first...');
      const simResponse = await server.simulateTransaction(tx);
      
      // In SDK v14, check for error differently
      if ('error' in simResponse && simResponse.error) {
        console.error('Simulation error:', simResponse.error);
        throw new Error(`Simulation failed: ${simResponse.error}`);
      }
      
      // Check if simulation was successful
      if ('transactionData' in simResponse && simResponse.transactionData) {
        console.log('Simulation successful, now preparing transaction...');
        // After successful simulation, use prepareTransaction
        // This properly handles Soroban data and fees
        preparedTx = await server.prepareTransaction(tx);
        console.log('Transaction prepared successfully');
        console.log('Fee set to:', preparedTx.fee);
      } else {
        // Fallback to regular prepare
        preparedTx = await server.prepareTransaction(tx);
        console.log('Transaction prepared via prepareTransaction');
      }
    } catch (prepareError: any) {
      console.error('Prepare failed, using fallback:', prepareError.message);
      // If prepare fails, we'll try cloning with higher fee
      const clonedTx = StellarSdk.TransactionBuilder.cloneFrom(tx, {
        fee: '1000000',
      });
      preparedTx = clonedTx.build();
      console.log('Using fallback transaction with higher fee');
    }

    // Sign the transaction
    console.log('Signing transaction...');
    const signedXdr = await signTransaction(preparedTx.toXDR());
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signedXdr,
      getNetworkPassphrase()
    );
    
    console.log('Sending transaction to network...');
    const result = await server.sendTransaction(signedTx);
    console.log('Send transaction result:', result);
    
    if (result.status === 'PENDING') {
      // Wait for confirmation
      const hash = result.hash;
      console.log('Transaction pending with hash:', hash);
      
      let getResponse = await server.getTransaction(hash);
      
      let retries = 0;
      while (getResponse.status === 'NOT_FOUND' && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        getResponse = await server.getTransaction(hash);
        retries++;
      }
      
      console.log('Final transaction status:', getResponse.status);
      
      if (getResponse.status === 'SUCCESS') {
        // Extract order ID from result
        try {
          if (getResponse.returnValue) {
            // Parse the u64 return value
            const returnVal = StellarSdk.scValToNative(getResponse.returnValue);
            console.log('Order created with ID:', returnVal);
            // returnVal is already a BigInt from scValToNative for u64 types
            return typeof returnVal === 'bigint' ? returnVal : BigInt(returnVal);
          }
        } catch (e) {
          console.log('Could not parse return value:', e);
          // If parsing fails, try to extract using value() method
          try {
            const returnVal = getResponse.returnValue;
            if (returnVal && 'value' in returnVal && typeof returnVal.value === 'function') {
              const val = returnVal.value();
              if (val !== null && val !== undefined) {
                console.log('Using extracted value:', val);
                return BigInt(val as string | number | bigint);
              }
            }
          } catch (extractError) {
            console.log('Could not extract value:', extractError);
          }
        }
        
        // Fallback: transaction succeeded but couldn't get order ID
        console.log('Transaction succeeded! Using timestamp as order ID');
        return BigInt(Date.now());
      } else if (getResponse.status === 'FAILED') {
        console.error('Transaction failed with result:', getResponse);
        if (getResponse.resultXdr) {
          console.error('Result XDR:', getResponse.resultXdr);
        }
        throw new Error(`Transaction failed: ${JSON.stringify(getResponse)}`);
      } else {
        throw new Error(`Transaction status: ${getResponse.status}`);
      }
    } else if (result.status === 'ERROR') {
      console.error('Transaction error:', result);
      if (result.errorResult) {
        console.error('Error details:', result.errorResult);
      }
      throw new Error(`Transaction error: ${JSON.stringify(result)}`);
    }
    
    console.error('Unexpected result status:', result);
    throw new Error(`Transaction submission failed with status: ${result.status}`);
  } catch (error: any) {
    console.error('Full error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('Error response:', error.response);
    }
    return null;
  }
};

// Get user orders  
export const getUserOrders = async (userAddress: string): Promise<StopLossOrder[]> => {
  try {
    if (!STOP_LOSS_CONTRACT) {
      throw new Error('Stop-loss contract address not configured');
    }

    const server = getServer();
    
    // Create a view-only transaction for simulation
    const sourceAccount = new StellarSdk.Account(
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      '0'
    );
    
    const operation = StellarSdk.Operation.invokeHostFunction({
      func: StellarSdk.xdr.HostFunction.hostFunctionTypeInvokeContract(
        new StellarSdk.xdr.InvokeContractArgs({
          contractAddress: StellarSdk.Address.fromString(STOP_LOSS_CONTRACT).toScAddress(),
          functionName: 'get_user_orders',
          args: [StellarSdk.Address.fromString(userAddress).toScVal()]
        })
      ),
      auth: []
    });
    
    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100000',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();
    
    const simulated = await server.simulateTransaction(tx);
    
    // Check for errors
    if ('error' in simulated && simulated.error) {
      console.error('Simulation error:', simulated.error);
      return [];
    }
    
    // Try to get the result from different possible locations
    let result = null;
    if ('result' in simulated && simulated.result) {
      result = simulated.result;
    } else if ('results' in simulated && (simulated as any).results?.length > 0) {
      result = (simulated as any).results[0];
    } else if ('returnValue' in simulated && (simulated as any).returnValue) {
      result = (simulated as any).returnValue;
    }
    
    if (result) {
      try {
        const orderIds = StellarSdk.scValToNative(result) as bigint[];
        const orders: StopLossOrder[] = [];
        
        // For each order ID, fetch details
        for (const orderId of orderIds) {
          // You would need to fetch individual order details here
          orders.push({
            id: orderId,
            user: userAddress,
            asset: 'BTC', // Would need to fetch from contract
            amount: BigInt(0),
            stopPrice: BigInt(0),
            orderType: OrderType.StopLoss,
            status: 'active',
            createdAt: Date.now()
          });
        }
        
        return orders;
      } catch (e) {
        console.error('Error parsing user orders:', e);
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return [];
  }
};

// Cancel order
export const cancelOrder = async (userAddress: string, orderId: bigint): Promise<boolean> => {
  try {
    if (!STOP_LOSS_CONTRACT) {
      throw new Error('Stop-loss contract address not configured');
    }

    const server = getServer();
    const account = await server.getAccount(userAddress);
    
    const operation = StellarSdk.Operation.invokeHostFunction({
      func: StellarSdk.xdr.HostFunction.hostFunctionTypeInvokeContract(
        new StellarSdk.xdr.InvokeContractArgs({
          contractAddress: StellarSdk.Address.fromString(STOP_LOSS_CONTRACT).toScAddress(),
          functionName: 'cancel_order',
          args: [
            StellarSdk.Address.fromString(userAddress).toScVal(),
            StellarSdk.nativeToScVal(orderId, { type: 'u64' })
          ]
        })
      ),
      auth: []
    });
    
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '1000000',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const signedXdr = await signTransaction(tx.toXDR());
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signedXdr,
      getNetworkPassphrase()
    );
    
    const result = await server.sendTransaction(signedTx);
    
    if (result.status === 'PENDING') {
      const hash = result.hash;
      let getResponse = await server.getTransaction(hash);
      
      let retries = 0;
      while (getResponse.status === 'NOT_FOUND' && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        getResponse = await server.getTransaction(hash);
        retries++;
      }
      
      return getResponse.status === 'SUCCESS';
    }
    
    return false;
  } catch (error) {
    console.error('Error cancelling order:', error);
    return false;
  }
};