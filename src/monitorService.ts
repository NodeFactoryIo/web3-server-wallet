import {ServerWeb3Wallet} from "./serverWallet";
import {TransactionResponse} from "ethers/providers";
import {BigNumber} from "ethers/utils";

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

  private transactionIsConfirmed(transaction: TransactionResponse): boolean {
    if(transaction.blockNumber) {
      return true;
    }

    return false;
  }

  private transactionIsOld(transaction: TransactionResponse): boolean {
    if(transaction.timestamp) {
      if(new Date().getTime() - transaction.timestamp > 180) {
        return true;
      }
    }

    return false;
  }

  private transactionIsDropped(transaction: TransactionResponse): boolean {
    return false;
  }

  private async resendTransaction(transaction: TransactionResponse): Promise<void> {
    await this.wallet.walletStorage.deleteTransaction(transaction);
    transaction.gasPrice = new BigNumber(transaction.gasPrice.toNumber() * 1.5);
    await this.wallet.sendTransaction(transaction)
  }

}
