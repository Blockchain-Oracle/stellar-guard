/**
 * Wallet Service
 * Handles wallet connections and account management
 */

import {
  Keypair,
  Account,
  Networks,
} from '@stellar/stellar-sdk';
import { server } from '../utils/stellar';
import { NETWORK_PASSPHRASE } from '../config/contracts';

export interface WalletInfo {
  publicKey: string;
  isConnected: boolean;
  network: string;
}

export class WalletService {
  private currentAccount: Account | null = null;
  private currentKeypair: Keypair | null = null;

  /**
   * Connect to Freighter wallet
   */
  async connectFreighter(): Promise<WalletInfo> {
    if (typeof (globalThis as any).window === 'undefined') {
      throw new Error('Freighter is only available in browser');
    }

    const freighter = ((globalThis as any).window as any).freighter;
    if (!freighter || !freighter.isConnected()) {
      throw new Error('Freighter wallet not found or not connected');
    }

    try {
      const publicKey = await freighter.getPublicKey();
      const network = await freighter.getNetwork();
      
      // Load account from network
      const account = await server.getAccount(publicKey);
      this.currentAccount = account;
      
      return {
        publicKey,
        isConnected: true,
        network,
      };
    } catch (error) {
      throw new Error(`Failed to connect Freighter: ${error}`);
    }
  }

  /**
   * Connect with secret key (for testing/development)
   */
  async connectWithSecret(secretKey: string): Promise<WalletInfo> {
    try {
      const keypair = Keypair.fromSecret(secretKey);
      const publicKey = keypair.publicKey();
      
      // Load account from network
      const account = await server.getAccount(publicKey);
      
      this.currentAccount = account;
      this.currentKeypair = keypair;
      
      return {
        publicKey,
        isConnected: true,
        network: NETWORK_PASSPHRASE,
      };
    } catch (error) {
      throw new Error(`Failed to connect with secret key: ${error}`);
    }
  }

  /**
   * Get current account
   */
  async getAccount(): Promise<Account> {
    if (this.currentAccount) {
      // Refresh account to get latest sequence
      const publicKey = this.currentAccount.accountId();
      const freshAccount = await server.getAccount(publicKey);
      this.currentAccount = freshAccount as Account;
      return this.currentAccount;
    }
    
    throw new Error('No account connected');
  }

  /**
   * Get current keypair (if available)
   */
  getKeypair(): Keypair | null {
    return this.currentKeypair;
  }

  /**
   * Sign transaction with Freighter
   */
  async signWithFreighter(xdr: string): Promise<string> {
    if (typeof (globalThis as any).window === 'undefined') {
      throw new Error('Freighter is only available in browser');
    }

    const freighter = ((globalThis as any).window as any).freighter;
    if (!freighter) {
      throw new Error('Freighter not found');
    }

    try {
      return await freighter.signTransaction(xdr, {
        network: NETWORK_PASSPHRASE,
      });
    } catch (error) {
      throw new Error(`Failed to sign with Freighter: ${error}`);
    }
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.currentAccount !== null;
  }

  /**
   * Disconnect wallet
   */
  disconnect(): void {
    this.currentAccount = null;
    this.currentKeypair = null;
  }

  /**
   * Get account balances
   */
  async getBalances(): Promise<Array<{ asset: string; balance: string }>> {
    const account = await this.getAccount();
    
    // Fetch account details from Horizon
    const response = await fetch(
      `https://horizon-testnet.stellar.org/accounts/${account.accountId()}`
    );
    const accountData: any = await response.json();
    
    return accountData.balances.map((balance: any) => ({
      asset: balance.asset_type === 'native' 
        ? 'XLM' 
        : `${balance.asset_code}:${balance.asset_issuer}`,
      balance: balance.balance,
    }));
  }

  /**
   * Check if account exists
   */
  async accountExists(publicKey: string): Promise<boolean> {
    try {
      await server.getAccount(publicKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fund testnet account
   */
  async fundTestnetAccount(publicKey: string): Promise<boolean> {
    if (NETWORK_PASSPHRASE !== Networks.TESTNET) {
      throw new Error('Friendbot only works on testnet');
    }

    try {
      const response = await fetch(
        `https://friendbot.stellar.org?addr=${publicKey}`
      );
      return response.ok;
    } catch (error) {
      throw new Error(`Failed to fund account: ${error}`);
    }
  }
}