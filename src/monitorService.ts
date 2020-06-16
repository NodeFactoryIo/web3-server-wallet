import {ServerWeb3Wallet} from "./serverWallet";
import {SavedTransactionResponse} from "./@types/wallet";
import {transactionIsConfirmed, transactionIsOld, transactionIsDropped, recalculateGasPrice} from "./utils";

export class TxMonitorService {
  private wallet: ServerWeb3Wallet;
  private intervalId?: NodeJS.Timeout;
  private neededConfirmations: number;
  private oldTransactionTime: number;
  private gasPriceIncrease: number;

  constructor(wallet: ServerWeb3Wallet, neededConfirmations=5, oldTransactionTime=180, gasPriceIncrease=1.2) {
    this.wallet = wallet;
    this.neededConfirmations = neededConfirmations;
    this.oldTransactionTime = oldTransactionTime;
    this.gasPriceIncrease = gasPriceIncrease;
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

  protected async checkTransactions(): Promise<void> {
    const transactions = await this.wallet.walletStorage.getTransactions(
      await this.wallet.getAddress()
    );
    for(const transaction of transactions) {

      if(transactionIsConfirmed(transaction, this.neededConfirmations)) {
        this.wallet.walletStorage.deleteTransaction(transaction)
        continue;
      }

      if(
        transactionIsOld(transaction, this.oldTransactionTime) ||
        transactionIsDropped(transaction, this.wallet.provider)
      ) {
        await this.resendTransaction(transaction);
        break;
      }
    }
  }

  private async resendTransaction(transaction: SavedTransactionResponse): Promise<void> {
    await this.wallet.walletStorage.deleteTransaction(transaction);
    const newGasPrice = await recalculateGasPrice(transaction.gasPrice, this.gasPriceIncrease);
    try {
      await this.wallet.sendTransaction({
        ...transaction,
        gasPrice: newGasPrice
      });
    } catch {}
  }


}
