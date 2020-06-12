import {ServerWeb3Wallet} from "./serverWallet";
import {TransactionResponse} from "ethers/providers";

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

      if(this.transactionIsOld(transaction)) {
        this.resendTransaction(transaction);
        break;
      }
    }
  }

  private transactionIsConfirmed(transaction: TransactionResponse): boolean {
    return transaction.confirmations > 11;
  }

  private transactionIsOld(transaction: TransactionResponse): boolean {
    if(transaction.timestamp) {
      if(new Date().getTime() - transaction.timestamp > 180) {
        return true;
      }
    }

    return false;
  }

  private async resendTransaction(transaction: TransactionResponse): Promise<void> {
    this.wallet.walletStorage.deleteTransaction(transaction);
    this.wallet.sendTransaction(transaction)
  }

}