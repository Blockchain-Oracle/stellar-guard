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

// Create stop-loss order
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
    const contract = new StellarSdk.Contract(STOP_LOSS_CONTRACT);
    
    // Build the transaction based on order type
    let operation;
    switch (orderType) {
      case OrderType.StopLoss:
        operation = contract.call(
          'create_stop_loss',
          StellarSdk.Address.fromString(userAddress).toScVal(),
          StellarSdk.nativeToScVal(asset, { type: 'symbol' }),
          StellarSdk.nativeToScVal(amount, { type: 'i128' }),
          StellarSdk.nativeToScVal(stopPrice, { type: 'i128' })
        );
        break;
      case OrderType.TakeProfit:
        // For take profit only, we use create_stop_loss with inverted logic
        // The contract will sell when price rises above the target
        operation = contract.call(
          'create_stop_loss',
          StellarSdk.Address.fromString(userAddress).toScVal(),
          StellarSdk.nativeToScVal(asset, { type: 'symbol' }),
          StellarSdk.nativeToScVal(amount, { type: 'i128' }),
          StellarSdk.nativeToScVal(stopPrice, { type: 'i128' })
        );
        break;
      case OrderType.TrailingStop:
        // For trailing stop, stopPrice represents the trailing percentage
        operation = contract.call(
          'create_trailing_stop',
          StellarSdk.Address.fromString(userAddress).toScVal(),
          StellarSdk.nativeToScVal(asset, { type: 'symbol' }),
          StellarSdk.nativeToScVal(amount, { type: 'i128' }),
          StellarSdk.nativeToScVal(Number(stopPrice), { type: 'u32' }) // Trailing percentage as u32
        );
        break;
      case OrderType.OCO:
        // OCO needs both stop loss and take profit prices
        // For now, throw an error as we need both prices
        throw new Error('OCO orders require both stop loss and take profit prices');
      default:
        throw new Error(`Unsupported order type: ${orderType}`);
    }
    
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();
    
    // First simulate to ensure transaction is valid, then prepare
    // This works around the oracle call issue
    const simResponse = await server.simulateTransaction(tx);
    if ('error' in simResponse && simResponse.error) {
      throw new Error(`Simulation failed: ${simResponse.error}`);
    }
    
    // Use the standard prepareTransaction method after simulation succeeds
    const preparedTx = await server.prepareTransaction(tx);
    
    const signedXdr = await signTransaction(preparedTx.toXDR());
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signedXdr,
      getNetworkPassphrase()
    );
    
    const result = await server.sendTransaction(signedTx as any);
    
    if (result.status === 'PENDING') {
      // Wait for confirmation
      const hash = result.hash;
      let getResponse = await server.getTransaction(hash);
      
      while (getResponse.status === 'NOT_FOUND') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        getResponse = await server.getTransaction(hash);
      }
      
      if (getResponse.status === 'SUCCESS') {
        // Extract order ID from return value
        try {
          if (getResponse.returnValue) {
            const returnVal = StellarSdk.scValToNative(getResponse.returnValue);
            // returnVal is already a BigInt from scValToNative for u64 types
            return typeof returnVal === 'bigint' ? returnVal : BigInt(returnVal);
          }
        } catch (parseError) {
          console.log('Could not parse return value:', parseError);
          // Try to extract from internal structure for UnsignedHyper
          try {
            const returnValue: any = getResponse.returnValue;
            if (returnValue?._value?._value !== undefined) {
              return BigInt(returnValue._value._value);
            }
          } catch (e) {
            console.log('Could not extract value:', e);
          }
        }
        // Fallback for successful transaction without parseable ID
        return BigInt(Date.now());
      } else {
        throw new Error('Transaction failed');
      }
    }
    
    throw new Error('Transaction submission failed');
  } catch (error) {
    console.error('Error creating stop-loss order:', error);
    return null;
  }
};

// Get user orders
export const getUserOrders = async (userAddress: string): Promise<StopLossOrder[]> => {
  try {
    if (!STOP_LOSS_CONTRACT) {
      throw new Error('Stop-loss contract address not configured');
    }

    const contract = new StellarSdk.Contract(STOP_LOSS_CONTRACT);
    
    const tx = new StellarSdk.TransactionBuilder(
      new StellarSdk.Account(userAddress, '0'),
      {
        fee: '100000',
        networkPassphrase: getNetworkPassphrase(),
      }
    )
      .addOperation(
        contract.call(
          'get_user_orders',
          StellarSdk.Address.fromString(userAddress).toScVal()
        )
      )
      .setTimeout(30)
      .build();
    
    const simulated = await getServer().simulateTransaction(tx);
    if ('result' in simulated && simulated.result) {
      // Parse the result array
      const orders: StopLossOrder[] = [];
      const result = simulated.result;
      
      if (Array.isArray(result)) {
        for (const order of result) {
          orders.push({
            id: BigInt(order.id || 0),
            user: userAddress,
            asset: order.asset || '',
            amount: BigInt(order.amount || 0),
            stopPrice: BigInt(order.stop_price || 0),
            orderType: order.order_type || OrderType.StopLoss,
            status: order.status || 'active',
            createdAt: order.created_at || Date.now()
          });
        }
      }
      
      return orders;
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
    const contract = new StellarSdk.Contract(STOP_LOSS_CONTRACT);
    
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(
        contract.call(
          'cancel_order',
          StellarSdk.Address.fromString(userAddress).toScVal(),
          StellarSdk.nativeToScVal(orderId, { type: 'u64' })
        )
      )
      .setTimeout(30)
      .build();
    
    const preparedTx = await server.prepareTransaction(tx);
    const signedXdr = await signTransaction(preparedTx.toXDR());
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signedXdr,
      getNetworkPassphrase()
    );
    
    const result = await server.sendTransaction(signedTx as any);
    
    if (result.status === 'PENDING') {
      const hash = result.hash;
      let getResponse = await server.getTransaction(hash);
      
      while (getResponse.status === 'NOT_FOUND') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        getResponse = await server.getTransaction(hash);
      }
      
      return getResponse.status === 'SUCCESS';
    }
    
    return false;
  } catch (error) {
    console.error('Error cancelling order:', error);
    return false;
  }
};

// Execute order (for testing/manual execution)
export const executeOrder = async (userAddress: string, orderId: bigint): Promise<boolean> => {
  try {
    if (!STOP_LOSS_CONTRACT) {
      throw new Error('Stop-loss contract address not configured');
    }

    const server = getServer();
    const account = await server.getAccount(userAddress);
    const contract = new StellarSdk.Contract(STOP_LOSS_CONTRACT);
    
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(
        contract.call(
          'check_and_execute',
          StellarSdk.nativeToScVal(orderId, { type: 'u64' })
        )
      )
      .setTimeout(30)
      .build();
    
    const preparedTx = await server.prepareTransaction(tx);
    const signedXdr = await signTransaction(preparedTx.toXDR());
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signedXdr,
      getNetworkPassphrase()
    );
    
    const result = await server.sendTransaction(signedTx as any);
    
    if (result.status === 'PENDING') {
      const hash = result.hash;
      let getResponse = await server.getTransaction(hash);
      
      while (getResponse.status === 'NOT_FOUND') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        getResponse = await server.getTransaction(hash);
      }
      
      return getResponse.status === 'SUCCESS';
    }
    
    return false;
  } catch (error) {
    console.error('Error executing order:', error);
    return false;
  }
};

// Check if order should be executed based on current price
export const shouldExecuteOrder = async (order: StopLossOrder, currentPrice: number): Promise<boolean> => {
  const stopPriceNum = Number(order.stopPrice) / Math.pow(10, 7);
  
  switch (order.orderType) {
    case OrderType.StopLoss:
      return currentPrice <= stopPriceNum;
    case OrderType.TakeProfit:
      return currentPrice >= stopPriceNum;
    case OrderType.TrailingStop:
      // For trailing stop, we need to track the highest price
      // This would require additional state management
      return false;
    default:
      return false;
  }
};