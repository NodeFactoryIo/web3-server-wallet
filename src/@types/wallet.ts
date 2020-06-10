import {SigningKey} from "ethers/utils"
import {TransactionResponse} from "ethers/providers/abstract-provider"

export interface IWalletSource {
  assignWallet(): Promise<SigningKey>;
}

export interface IWalletStorage {
  publicKey: string;

  getTransactions(): Promise<TransactionResponse[]>;
  saveTransaction(tx: TransactionResponse): Promise<void>;
  deleteTransaction(tx: TransactionResponse): Promise<void>;
}