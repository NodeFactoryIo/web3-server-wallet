import {utils, providers} from "ethers";

export type SavedTransactionResponse = providers.TransactionResponse & {
  submitTime: number;
  hash: string;
};

export interface IWalletSourceStorage {
  /**
   * Assigns wallet and removes it from available pool of wallets.
   */
  assignWallet(): Promise<utils.SigningKey | undefined>;
  /**
   * Releases assigned wallet and returns it to pool of available wallets.
   */
  releaseWallet(address: string): Promise<void>;
}

export interface IWalletTransactionStorage {
  /**
   * Returns transactions from storage filtered by address and sorted by nonce ASC.
   */
  getTransactions(address: string): Promise<SavedTransactionResponse[]>;
  /**
   * Saves transaction to storage with submit time.
   */
  saveTransaction(tx: providers.TransactionResponse): Promise<void>;
  /**
   * Deletes transaction from storage by hash.
   */
  deleteTransaction(hash: string): Promise<void>;
}
