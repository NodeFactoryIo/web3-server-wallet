import {SigningKey} from "ethers/utils"
import {TransactionResponse} from "ethers/providers/abstract-provider"

export type SavedTransactionResponse = TransactionResponse & {submitTime: number}

export interface IWalletSourceStorage {
  /**
   * Returns available wallets (wallets that are not assigned).
   */
  getWallets(): Promise<SigningKey[]>;
  /**
   * Assigns wallet and removes it from "getWallets" pool of wallets.
   * Returns false if wallet taken.
   */
  assignWallet(publicKey: string): Promise<boolean>;
  /**
   * Releases assigned wallet and returns it to "getWallets" pool of wallets.
   */
  releaseWallet(publicKey: string): Promise<void>;
}

export interface IWalletTransactionStorage {
  publicKey: string;

  /**
   * Returns transactions from storage sorted by nonce ASC.
   */
  getTransactions(): Promise<SavedTransactionResponse[]>;
  /**
   * Saves transaction to storage with submit time.
   */
  saveTransaction(tx: TransactionResponse): Promise<void>;
  /**
   * Deletes transaction from storage by hash.
   */
  deleteTransaction(tx: TransactionResponse): Promise<void>;
}
