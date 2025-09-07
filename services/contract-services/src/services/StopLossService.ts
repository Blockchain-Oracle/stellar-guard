/**
 * Stop-Loss Contract Service
 * Handles all interactions with the deployed stop-loss contract
 */

import {
  Contract,
  Account,
  Keypair,
} from '@stellar/stellar-sdk';
import {
  server,
  toContractAmount,
  fromContractAmount,
  addressToScVal,
  i128ToScVal,
  u64ToScVal,
  buildTransaction,
  simulateTransaction,
  prepareAndSendTransaction,
  waitForTransaction,
  fromScVal,
  parseContractError,
} from '../utils/stellar';
import { CONTRACTS, DECIMALS } from '../config/contracts';

export interface StopLossOrder {
  id: number;
  owner: string;
  asset: string;
  amount: bigint;
  stopPrice: bigint;
  status: 'Active' | 'Executed' | 'Cancelled';
  createdAt: number;
}

export interface CreateOrderParams {
  owner: string;
  asset: string;
  amount: number;
  stopPrice: number;
}

export class StopLossService {
  private contract: Contract;
  private contractId: string;

  constructor(contractId: string = CONTRACTS.STOP_LOSS) {
    this.contractId = contractId;
    this.contract = new Contract(contractId);
  }

  /**
   * Create a new stop-loss order
   */
  async createStopLossOrder(
    params: CreateOrderParams,
    sourceAccount: Account,
    keypair?: Keypair
  ): Promise<number> {
    try {
      const { owner, asset, amount, stopPrice } = params;
      
      // Convert amounts to contract format
      const amountScVal = i128ToScVal(toContractAmount(amount));
      const stopPriceScVal = i128ToScVal(toContractAmount(stopPrice));
      
      // Build transaction
      const tx = await buildTransaction(
        sourceAccount,
        this.contract,
        'create_stop_loss',
        [
          addressToScVal(owner),
          addressToScVal(asset),
          amountScVal,
          stopPriceScVal,
        ]
      );

      // Simulate first
      const simulation = await simulateTransaction(tx);
      if (simulation.error) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      // Send transaction
      const response = await prepareAndSendTransaction(tx, keypair);
      
      if (response.status === 'PENDING') {
        // Wait for confirmation
        const result = await waitForTransaction(response.hash);
        
        if (result.status === 'SUCCESS' && result.returnValue) {
          // Parse the order ID from return value
          const orderId = fromScVal(result.returnValue);
          return Number(orderId);
        } else {
          throw new Error('Transaction failed');
        }
      }
      
      throw new Error('Failed to create order');
    } catch (error) {
      throw new Error(`Failed to create stop-loss order: ${parseContractError(error)}`);
    }
  }

  /**
   * Get order details by ID
   */
  async getOrder(orderId: number, sourceAccount: Account): Promise<StopLossOrder> {
    try {
      const tx = await buildTransaction(
        sourceAccount,
        this.contract,
        'get_order',
        [u64ToScVal(orderId)]
      );

      const simulation = await simulateTransaction(tx);
      
      if (simulation.error) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      if (simulation.result) {
        const result = fromScVal(simulation.result.retval);
        
        return {
          id: Number(result.id),
          owner: result.owner,
          asset: result.asset,
          amount: BigInt(result.amount),
          stopPrice: BigInt(result.stop_price),
          status: result.status,
          createdAt: Number(result.created_at),
        };
      }
      
      throw new Error('No result from simulation');
    } catch (error) {
      throw new Error(`Failed to get order: ${parseContractError(error)}`);
    }
  }

  /**
   * Get all orders for a user
   */
  async getUserOrders(userAddress: string, sourceAccount: Account): Promise<number[]> {
    try {
      const tx = await buildTransaction(
        sourceAccount,
        this.contract,
        'get_user_orders',
        [addressToScVal(userAddress)]
      );

      const simulation = await simulateTransaction(tx);
      
      if (simulation.error) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      if (simulation.result) {
        const result = fromScVal(simulation.result.retval);
        return result.map((id: any) => Number(id));
      }
      
      return [];
    } catch (error) {
      throw new Error(`Failed to get user orders: ${parseContractError(error)}`);
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(
    orderId: number,
    owner: string,
    sourceAccount: Account,
    keypair?: Keypair
  ): Promise<boolean> {
    try {
      const tx = await buildTransaction(
        sourceAccount,
        this.contract,
        'cancel_order',
        [
          addressToScVal(owner),
          u64ToScVal(orderId),
        ]
      );

      const simulation = await simulateTransaction(tx);
      if (simulation.error) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      const response = await prepareAndSendTransaction(tx, keypair);
      
      if (response.status === 'PENDING') {
        const result = await waitForTransaction(response.hash);
        return result.status === 'SUCCESS';
      }
      
      return false;
    } catch (error) {
      throw new Error(`Failed to cancel order: ${parseContractError(error)}`);
    }
  }

  /**
   * Check if an order should be executed based on current price
   */
  async checkAndExecute(
    orderId: number,
    currentPrice: number,
    sourceAccount: Account
  ): Promise<boolean> {
    try {
      const tx = await buildTransaction(
        sourceAccount,
        this.contract,
        'check_and_execute',
        [
          u64ToScVal(orderId),
          i128ToScVal(toContractAmount(currentPrice)),
        ]
      );

      const simulation = await simulateTransaction(tx);
      
      if (simulation.error) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      if (simulation.result) {
        return fromScVal(simulation.result.retval);
      }
      
      return false;
    } catch (error) {
      throw new Error(`Failed to check execution: ${parseContractError(error)}`);
    }
  }

  /**
   * Get multiple orders by IDs
   */
  async getOrders(orderIds: number[], sourceAccount: Account): Promise<StopLossOrder[]> {
    const orders: StopLossOrder[] = [];
    
    for (const orderId of orderIds) {
      try {
        const order = await this.getOrder(orderId, sourceAccount);
        orders.push(order);
      } catch (error) {
        console.error(`Failed to get order ${orderId}:`, error);
      }
    }
    
    return orders;
  }

  /**
   * Get all active orders for a user
   */
  async getActiveOrders(userAddress: string, sourceAccount: Account): Promise<StopLossOrder[]> {
    const orderIds = await this.getUserOrders(userAddress, sourceAccount);
    const orders = await this.getOrders(orderIds, sourceAccount);
    
    return orders.filter(order => order.status === 'Active');
  }

  /**
   * Calculate if stop loss would trigger at given price
   */
  wouldTrigger(order: StopLossOrder, currentPrice: number): boolean {
    const currentPriceScaled = toContractAmount(currentPrice);
    return currentPriceScaled <= order.stopPrice;
  }

  /**
   * Format order for display
   */
  formatOrder(order: StopLossOrder): {
    id: number;
    owner: string;
    asset: string;
    amount: number;
    stopPrice: number;
    status: string;
    createdAt: Date;
  } {
    return {
      id: order.id,
      owner: order.owner,
      asset: order.asset,
      amount: fromContractAmount(order.amount),
      stopPrice: fromContractAmount(order.stopPrice),
      status: order.status,
      createdAt: new Date(order.createdAt * 1000),
    };
  }
}