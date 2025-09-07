/**
 * Utility functions for Stellar/Soroban operations
 */

import {
  Contract,
  TransactionBuilder,
  Account,
  Networks,
  xdr,
  Address,
  Keypair,
  scValToNative,
  nativeToScVal,
  Transaction,
  rpc,
} from '@stellar/stellar-sdk';
import { RPC_URL, NETWORK_PASSPHRASE, DECIMALS, REFLECTOR_DECIMALS } from '../config/contracts';

// Initialize Soroban RPC Server
export const server = new rpc.Server(RPC_URL);

/**
 * Convert a number to contract format (with decimals)
 */
export function toContractAmount(amount: number, decimals: number = DECIMALS): bigint {
  return BigInt(Math.floor(amount * Math.pow(10, decimals)));
}

/**
 * Convert from contract format to number
 */
export function fromContractAmount(amount: bigint | string, decimals: number = DECIMALS): number {
  const bigIntAmount = typeof amount === 'string' ? BigInt(amount) : amount;
  return Number(bigIntAmount) / Math.pow(10, decimals);
}

/**
 * Parse Reflector oracle price (14 decimals)
 */
export function parseReflectorPrice(price: bigint | string): number {
  return fromContractAmount(price, REFLECTOR_DECIMALS);
}

/**
 * Format price for display
 */
export function formatPrice(price: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(price);
}

/**
 * Format amount for display
 */
export function formatAmount(amount: number, symbol: string, decimals: number = 4): string {
  return `${amount.toFixed(decimals)} ${symbol}`;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Calculate basis points
 */
export function toBasisPoints(percentage: number): number {
  return Math.round(percentage * 100);
}

/**
 * From basis points to percentage
 */
export function fromBasisPoints(bps: number): number {
  return bps / 100;
}

/**
 * Build a transaction for contract invocation
 */
export async function buildTransaction(
  sourceAccount: Account,
  contract: Contract,
  method: string,
  params: xdr.ScVal[],
  fee?: string
): Promise<TransactionBuilder> {
  const tx = new TransactionBuilder(sourceAccount, {
    fee: fee || '100000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30);
  
  return tx;
}

/**
 * Simulate a transaction
 */
export async function simulateTransaction(tx: TransactionBuilder) {
  const built = tx.build();
  const simulation = await server.simulateTransaction(built);
  
  // Type guard for error response
  if ('error' in simulation && simulation.error) {
    return { error: simulation.error, result: null };
  }
  
  // Return success response
  return { error: null, result: (simulation as any) };
}

/**
 * Prepare and send transaction
 */
export async function prepareAndSendTransaction(
  tx: Transaction | TransactionBuilder,
  keypair?: Keypair
): Promise<rpc.Api.SendTransactionResponse> {
  const built = tx instanceof TransactionBuilder ? tx.build() : tx;
  const prepared = await server.prepareTransaction(built);
  
  if (keypair) {
    prepared.sign(keypair);
  }
  
  return await server.sendTransaction(prepared);
}

/**
 * Wait for transaction confirmation
 */
export async function waitForTransaction(
  hash: string,
  maxAttempts: number = 10
): Promise<rpc.Api.GetTransactionResponse> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const result = await server.getTransaction(hash);
    
    if (result.status !== 'NOT_FOUND') {
      return result;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }
  
  throw new Error(`Transaction ${hash} not found after ${maxAttempts} attempts`);
}

/**
 * Parse contract error
 */
export function parseContractError(error: any): string {
  if (error?.message) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Unknown contract error';
}

/**
 * Convert JS value to Soroban ScVal
 */
export function toScVal(value: any, type?: string): xdr.ScVal {
  return nativeToScVal(value, { type });
}

/**
 * Convert Soroban ScVal to JS value
 */
export function fromScVal(scVal: xdr.ScVal): any {
  return scValToNative(scVal);
}

/**
 * Create Address ScVal
 */
export function addressToScVal(address: string): xdr.ScVal {
  return Address.fromString(address).toScVal();
}

/**
 * Create u64 ScVal
 */
export function u64ToScVal(value: number | bigint): xdr.ScVal {
  return xdr.ScVal.scvU64(xdr.Uint64.fromString(value.toString()));
}

/**
 * Create i128 ScVal
 */
export function i128ToScVal(value: bigint): xdr.ScVal {
  const hi = value >> 64n;
  const lo = value & 0xffffffffffffffffn;
  
  return xdr.ScVal.scvI128(new xdr.Int128Parts({
    hi: xdr.Int64.fromString(hi.toString()),
    lo: xdr.Uint64.fromString(lo.toString()),
  }));
}

/**
 * Create symbol ScVal
 */
export function symbolToScVal(symbol: string): xdr.ScVal {
  return xdr.ScVal.scvSymbol(symbol);
}

/**
 * Health factor calculation for liquidations
 */
export function calculateHealthFactor(
  collateralValue: number,
  borrowedValue: number,
  liquidationThreshold: number
): number {
  if (borrowedValue === 0) return Number.MAX_SAFE_INTEGER;
  
  const collateralizationRatio = (collateralValue / borrowedValue) * 100;
  return collateralizationRatio / liquidationThreshold;
}

/**
 * Check if position is liquidatable
 */
export function isLiquidatable(healthFactor: number): boolean {
  return healthFactor < 1.0;
}

/**
 * Calculate liquidation bonus
 */
export function calculateLiquidationBonus(
  collateralAmount: number,
  bonusPercentage: number = 5
): number {
  return collateralAmount * (bonusPercentage / 100);
}

/**
 * Calculate rebalancing amounts
 */
export function calculateRebalanceAmounts(
  currentValue: number,
  totalValue: number,
  targetPercentage: number
): { action: 'buy' | 'sell'; amount: number } {
  const targetValue = (totalValue * targetPercentage) / 100;
  const difference = targetValue - currentValue;
  
  return {
    action: difference > 0 ? 'buy' : 'sell',
    amount: Math.abs(difference),
  };
}