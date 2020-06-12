import {SigningKey} from "ethers/utils"
import {TransactionResponse} from "ethers/providers/abstract-provider"

export interface IWalletSource {
  assignWallet(): Promise<SigningKey>;
}

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export interface SavedTransactionResponse extends TransactionResponse {
  submitTime: number;
}

export interface IWalletStorage {
  publicKey: string;

  getTransactions(): Promise<SavedTransactionResponse[]>;
  saveTransaction(tx: TransactionResponse): Promise<void>;
  deleteTransaction(tx: TransactionResponse): Promise<void>;
}
