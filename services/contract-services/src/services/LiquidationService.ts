/**
 * Liquidation Contract Service
 * Handles all interactions with the deployed liquidation contract
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
  calculateHealthFactor,
  isLiquidatable,
} from '../utils/stellar';
import { CONTRACTS } from '../config/contracts';

export interface Loan {
  id: number;
  borrower: string;
  collateralAsset: string;
  collateralAmount: bigint;
  borrowedAsset: string;
  borrowedAmount: bigint;
  liquidationThreshold: number; // in basis points
  isLiquidated: boolean;
  createdAt: number;
}

export interface CreateLoanParams {
  borrower: string;
  collateralAsset: string;
  collateralAmount: number;
  borrowedAsset: string;
  borrowedAmount: number;
  liquidationThreshold: number; // percentage (e.g., 150 for 150%)
}

export interface LoanHealth {
  loan: Loan;
  collateralValue: number;
  borrowedValue: number;
  collateralizationRatio: number;
  healthFactor: number;
  isLiquidatable: boolean;
}

export class LiquidationService {
  private contract: Contract;
  private contractId: string;

  constructor(contractId: string = CONTRACTS.LIQUIDATION) {
    this.contractId = contractId;
    this.contract = new Contract(contractId);
  }

  /**
   * Initialize the liquidation contract with oracle address
   */
  async initialize(
    oracleAddress: string,
    sourceAccount: Account,
    keypair?: Keypair
  ): Promise<boolean> {
    try {
      const tx = await buildTransaction(
        sourceAccount,
        this.contract,
        'initialize',
        [addressToScVal(oracleAddress)]
      );

      const response = await prepareAndSendTransaction(tx, keypair);
      
      if (response.status === 'PENDING') {
        const result = await waitForTransaction(response.hash);
        return result.status === 'SUCCESS';
      }
      
      return false;
    } catch (error) {
      throw new Error(`Failed to initialize: ${parseContractError(error)}`);
    }
  }

  /**
   * Create a new loan position
   */
  async createLoan(
    params: CreateLoanParams,
    sourceAccount: Account,
    keypair?: Keypair
  ): Promise<number> {
    try {
      const {
        borrower,
        collateralAsset,
        collateralAmount,
        borrowedAsset,
        borrowedAmount,
        liquidationThreshold,
      } = params;

      // Convert threshold from percentage to basis points
      const thresholdBps = liquidationThreshold * 100;

      const tx = await buildTransaction(
        sourceAccount,
        this.contract,
        'create_loan',
        [
          addressToScVal(borrower),
          addressToScVal(collateralAsset),
          i128ToScVal(toContractAmount(collateralAmount)),
          addressToScVal(borrowedAsset),
          i128ToScVal(toContractAmount(borrowedAmount)),
          u64ToScVal(thresholdBps),
        ]
      );

      const simulation = await simulateTransaction(tx);
      if (simulation.error) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      const response = await prepareAndSendTransaction(tx, keypair);
      
      if (response.status === 'PENDING') {
        const result = await waitForTransaction(response.hash);
        
        if (result.status === 'SUCCESS' && result.returnValue) {
          const loanId = fromScVal(result.returnValue);
          return Number(loanId);
        }
      }
      
      throw new Error('Failed to create loan');
    } catch (error) {
      throw new Error(`Failed to create loan: ${parseContractError(error)}`);
    }
  }

  /**
   * Get loan details
   */
  async getLoan(loanId: number, sourceAccount: Account): Promise<Loan> {
    try {
      const tx = await buildTransaction(
        sourceAccount,
        this.contract,
        'get_loan',
        [u64ToScVal(loanId)]
      );

      const simulation = await simulateTransaction(tx);
      
      if (simulation.error) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      if (simulation.result) {
        const result = fromScVal(simulation.result.retval);
        
        return {
          id: Number(result.id),
          borrower: result.borrower,
          collateralAsset: result.collateral_asset,
          collateralAmount: BigInt(result.collateral_amount),
          borrowedAsset: result.borrowed_asset,
          borrowedAmount: BigInt(result.borrowed_amount),
          liquidationThreshold: Number(result.liquidation_threshold),
          isLiquidated: result.is_liquidated,
          createdAt: Number(result.created_at),
        };
      }
      
      throw new Error('No result from simulation');
    } catch (error) {
      throw new Error(`Failed to get loan: ${parseContractError(error)}`);
    }
  }

  /**
   * Check if a loan is liquidatable
   */
  async checkLiquidation(
    loanId: number,
    collateralPrice: number,
    borrowedPrice: number,
    sourceAccount: Account
  ): Promise<boolean> {
    try {
      const tx = await buildTransaction(
        sourceAccount,
        this.contract,
        'check_liquidation',
        [
          u64ToScVal(loanId),
          i128ToScVal(toContractAmount(collateralPrice)),
          i128ToScVal(toContractAmount(borrowedPrice)),
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
      throw new Error(`Failed to check liquidation: ${parseContractError(error)}`);
    }
  }

  /**
   * Execute liquidation
   */
  async liquidate(
    loanId: number,
    liquidator: string,
    sourceAccount: Account,
    keypair?: Keypair
  ): Promise<boolean> {
    try {
      const tx = await buildTransaction(
        sourceAccount,
        this.contract,
        'liquidate',
        [
          u64ToScVal(loanId),
          addressToScVal(liquidator),
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
      throw new Error(`Failed to liquidate: ${parseContractError(error)}`);
    }
  }

  /**
   * Get health factor for a loan
   */
  async getHealthFactor(
    loanId: number,
    collateralPrice: number,
    borrowedPrice: number,
    sourceAccount: Account
  ): Promise<number> {
    try {
      const tx = await buildTransaction(
        sourceAccount,
        this.contract,
        'health_factor',
        [
          u64ToScVal(loanId),
          i128ToScVal(toContractAmount(collateralPrice)),
          i128ToScVal(toContractAmount(borrowedPrice)),
        ]
      );

      const simulation = await simulateTransaction(tx);
      
      if (simulation.error) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      if (simulation.result) {
        const factor = fromScVal(simulation.result.retval);
        return Number(factor) / 100; // Convert from percentage
      }
      
      return 0;
    } catch (error) {
      throw new Error(`Failed to get health factor: ${parseContractError(error)}`);
    }
  }

  /**
   * Get all loans for a user
   */
  async getUserLoans(borrower: string, sourceAccount: Account): Promise<number[]> {
    try {
      const tx = await buildTransaction(
        sourceAccount,
        this.contract,
        'get_user_loans',
        [addressToScVal(borrower)]
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
      throw new Error(`Failed to get user loans: ${parseContractError(error)}`);
    }
  }

  /**
   * Calculate loan health with prices
   */
  async calculateLoanHealth(
    loan: Loan,
    collateralPrice: number,
    borrowedPrice: number
  ): Promise<LoanHealth> {
    const collateralValue = fromContractAmount(loan.collateralAmount) * collateralPrice;
    const borrowedValue = fromContractAmount(loan.borrowedAmount) * borrowedPrice;
    
    const collateralizationRatio = borrowedValue > 0 
      ? (collateralValue / borrowedValue) * 100 
      : Number.MAX_SAFE_INTEGER;
    
    const liquidationThresholdPercent = loan.liquidationThreshold / 100;
    const healthFactor = calculateHealthFactor(
      collateralValue,
      borrowedValue,
      liquidationThresholdPercent
    );

    return {
      loan,
      collateralValue,
      borrowedValue,
      collateralizationRatio,
      healthFactor,
      isLiquidatable: isLiquidatable(healthFactor),
    };
  }

  /**
   * Monitor multiple loans for liquidation opportunities
   */
  async monitorLoans(
    loanIds: number[],
    prices: Map<string, number>,
    sourceAccount: Account
  ): Promise<LoanHealth[]> {
    const results: LoanHealth[] = [];

    for (const loanId of loanIds) {
      try {
        const loan = await this.getLoan(loanId, sourceAccount);
        
        const collateralPrice = prices.get(loan.collateralAsset) || 0;
        const borrowedPrice = prices.get(loan.borrowedAsset) || 0;
        
        if (collateralPrice > 0 && borrowedPrice > 0) {
          const health = await this.calculateLoanHealth(
            loan,
            collateralPrice,
            borrowedPrice
          );
          results.push(health);
        }
      } catch (error) {
        console.error(`Failed to monitor loan ${loanId}:`, error);
      }
    }

    return results;
  }

  /**
   * Format loan for display
   */
  formatLoan(loan: Loan): {
    id: number;
    borrower: string;
    collateralAsset: string;
    collateralAmount: number;
    borrowedAsset: string;
    borrowedAmount: number;
    liquidationThreshold: number;
    isLiquidated: boolean;
    createdAt: Date;
  } {
    return {
      id: loan.id,
      borrower: loan.borrower,
      collateralAsset: loan.collateralAsset,
      collateralAmount: fromContractAmount(loan.collateralAmount),
      borrowedAsset: loan.borrowedAsset,
      borrowedAmount: fromContractAmount(loan.borrowedAmount),
      liquidationThreshold: loan.liquidationThreshold / 100,
      isLiquidated: loan.isLiquidated,
      createdAt: new Date(loan.createdAt * 1000),
    };
  }
}