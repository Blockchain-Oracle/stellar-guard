import { Buffer } from "buffer";
import { Address } from '@stellar/stellar-sdk';
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from '@stellar/stellar-sdk/contract';
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Typepoint,
  Duration,
} from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk'
export * as contract from '@stellar/stellar-sdk/contract'
export * as rpc from '@stellar/stellar-sdk/rpc'

if (typeof window !== 'undefined') {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CDSKXUU5BDMKMLDS4T3PL6RUX7XLVG3DW7ZSV7LL5LS2WJVJ6ZP5EUMM",
  }
} as const

export type OrderStatus = {tag: "Active", values: void} | {tag: "Executed", values: void} | {tag: "Cancelled", values: void};


export interface StopOrder {
  amount: i128;
  asset: string;
  created_at: u64;
  id: u64;
  owner: string;
  status: OrderStatus;
  stop_price: i128;
}

export type DataKey = {tag: "Order", values: readonly [u64]} | {tag: "UserOrders", values: readonly [string]} | {tag: "NextOrderId", values: void} | {tag: "OracleAddress", values: void};

export interface Client {
  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initialize the contract with oracle address
   */
  initialize: ({oracle_address}: {oracle_address: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a create_stop_loss transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Create a new stop-loss order
   */
  create_stop_loss: ({owner, asset, amount, stop_price}: {owner: string, asset: string, amount: i128, stop_price: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a get_order transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get an order by ID
   */
  get_order: ({order_id}: {order_id: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<StopOrder>>

  /**
   * Construct and simulate a get_user_orders transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get all orders for a user
   */
  get_user_orders: ({user}: {user: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<u64>>>

  /**
   * Construct and simulate a cancel_order transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cancel an order
   */
  cancel_order: ({owner, order_id}: {owner: string, order_id: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a check_and_execute transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Check and execute order if price condition met
   * In production, this would be called by the monitoring service
   */
  check_and_execute: ({order_id, current_price}: {order_id: u64, current_price: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<boolean>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAgAAAAAAAAAAAAAAC09yZGVyU3RhdHVzAAAAAAMAAAAAAAAAAAAAAAZBY3RpdmUAAAAAAAAAAAAAAAAACEV4ZWN1dGVkAAAAAAAAAAAAAAAJQ2FuY2VsbGVkAAAA",
        "AAAAAQAAAAAAAAAAAAAACVN0b3BPcmRlcgAAAAAAAAcAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAAAAAApjcmVhdGVkX2F0AAAAAAAGAAAAAAAAAAJpZAAAAAAABgAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAAZzdGF0dXMAAAAAB9AAAAALT3JkZXJTdGF0dXMAAAAAAAAAAApzdG9wX3ByaWNlAAAAAAAL",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABAAAAAEAAAAAAAAABU9yZGVyAAAAAAAAAQAAAAYAAAABAAAAAAAAAApVc2VyT3JkZXJzAAAAAAABAAAAEwAAAAAAAAAAAAAAC05leHRPcmRlcklkAAAAAAAAAAAAAAAADU9yYWNsZUFkZHJlc3MAAAA=",
        "AAAAAAAAACtJbml0aWFsaXplIHRoZSBjb250cmFjdCB3aXRoIG9yYWNsZSBhZGRyZXNzAAAAAAppbml0aWFsaXplAAAAAAABAAAAAAAAAA5vcmFjbGVfYWRkcmVzcwAAAAAAEwAAAAA=",
        "AAAAAAAAABxDcmVhdGUgYSBuZXcgc3RvcC1sb3NzIG9yZGVyAAAAEGNyZWF0ZV9zdG9wX2xvc3MAAAAEAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAABWFzc2V0AAAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAApzdG9wX3ByaWNlAAAAAAALAAAAAQAAAAY=",
        "AAAAAAAAABJHZXQgYW4gb3JkZXIgYnkgSUQAAAAAAAlnZXRfb3JkZXIAAAAAAAABAAAAAAAAAAhvcmRlcl9pZAAAAAYAAAABAAAH0AAAAAlTdG9wT3JkZXIAAAA=",
        "AAAAAAAAABlHZXQgYWxsIG9yZGVycyBmb3IgYSB1c2VyAAAAAAAAD2dldF91c2VyX29yZGVycwAAAAABAAAAAAAAAAR1c2VyAAAAEwAAAAEAAAPqAAAABg==",
        "AAAAAAAAAA9DYW5jZWwgYW4gb3JkZXIAAAAADGNhbmNlbF9vcmRlcgAAAAIAAAAAAAAABW93bmVyAAAAAAAAEwAAAAAAAAAIb3JkZXJfaWQAAAAGAAAAAA==",
        "AAAAAAAAAGxDaGVjayBhbmQgZXhlY3V0ZSBvcmRlciBpZiBwcmljZSBjb25kaXRpb24gbWV0CkluIHByb2R1Y3Rpb24sIHRoaXMgd291bGQgYmUgY2FsbGVkIGJ5IHRoZSBtb25pdG9yaW5nIHNlcnZpY2UAAAARY2hlY2tfYW5kX2V4ZWN1dGUAAAAAAAACAAAAAAAAAAhvcmRlcl9pZAAAAAYAAAAAAAAADWN1cnJlbnRfcHJpY2UAAAAAAAALAAAAAQAAAAE=" ]),
      options
    )
  }
  public readonly fromJSON = {
    initialize: this.txFromJSON<null>,
        create_stop_loss: this.txFromJSON<u64>,
        get_order: this.txFromJSON<StopOrder>,
        get_user_orders: this.txFromJSON<Array<u64>>,
        cancel_order: this.txFromJSON<null>,
        check_and_execute: this.txFromJSON<boolean>
  }
}