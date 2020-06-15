import {ServerWeb3Wallet} from "./serverWallet";
import {TransactionResponse} from "ethers/providers";
import {BigNumber} from "ethers/utils";
import { SavedTransactionResponse } from "./@types/wallet";

export class TxMonitorService {
  private wallet: ServerWeb3Wallet;
  private intervalId?: NodeJS.Timeout;

  constructor(wallet: ServerWeb3Wallet) {
    this.wallet = wallet;
  };

  public async start(interval=30000): Promise<void> {
    if(this.intervalId) {
      return;
    }

    this.intervalId = setInterval(
      this.checkTransactions.bind(this),
      interval
    )
  }

  public async stop(): Promise<void> {
    if(this.intervalId) {
      clearInterval(
        this.intervalId
      );
    }
  }

  private async checkTransactions(): Promise<void> {
    const transactions = await this.wallet.walletStorage.getTransactions();
    for(const transaction of transactions) {

      if(this.transactionIsConfirmed(transaction)) {
        continue;
      }

      if(this.transactionIsOld(transaction) || this.transactionIsDropped(transaction)) {
        await this.resendTransaction(transaction);
        break;
      }
    }
  }

  private transactionIsConfirmed(transaction: SavedTransactionResponse): boolean {
    if(transaction.blockNumber && transaction.confirmations > 4) {
      return true;
    }

    return false;
  }

  private transactionIsOld(transaction: SavedTransactionResponse): boolean {
    if(new Date().getTime() - transaction.submitTime > 180) {
      return true;
    }

    return false;
  }

  private transactionIsDropped(transaction: SavedTransactionResponse): boolean {
    return false;
  }

  private async resendTransaction(transaction: SavedTransactionResponse): Promise<void> {
    await this.wallet.walletStorage.deleteTransaction(transaction);
    transaction.gasPrice = new BigNumber(transaction.gasPrice.toNumber() * 1.5);
    await this.wallet.sendTransaction(transaction)
  }

}
