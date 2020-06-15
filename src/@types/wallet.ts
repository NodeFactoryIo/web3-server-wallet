import {SigningKey} from "ethers/utils"
import {TransactionResponse} from "ethers/providers/abstract-provider"

export interface IWalletSource {
  assignWallet(): Promise<SigningKey>;
}

export type SavedTransactionResponse = TransactionResponse & {submitTime: number}

export interface IWalletTransactionStorage {
  publicKey: string;

  getTransactions(): Promise<SavedTransactionResponse[]>;
  saveTransaction(tx: TransactionResponse): Promise<void>;
  deleteTransaction(tx: TransactionResponse): Promise<void>;
}
