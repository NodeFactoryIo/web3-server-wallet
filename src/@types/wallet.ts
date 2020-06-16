import {SigningKey} from "ethers/utils"
import {TransactionResponse} from "ethers/providers/abstract-provider"

export type SavedTransactionResponse = TransactionResponse & {submitTime: number}

export interface IWalletSourceStorage {
  /**
   * Assigns wallet and removes it from available pool of wallets.
   */
  assignWallet(): Promise<SigningKey | undefined>;
  /**
   * Releases assigned wallet and returns it to pool of available wallets.
   */
  releaseWallet(publicKey: string): Promise<void>;
}

export interface IWalletTransactionStorage {
  /**
   * Returns transactions from storage filtered by address and sorted by nonce ASC.
   */
  getTransactions(address: string): Promise<SavedTransactionResponse[]>;
  /**
   * Saves transaction to storage with submit time.
   */
  saveTransaction(tx: TransactionResponse): Promise<void>;
  /**
   * Deletes transaction from storage by hash.
   */
  deleteTransaction(tx: TransactionResponse): Promise<void>;
}
