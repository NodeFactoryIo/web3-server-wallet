import {ServerWeb3Wallet} from "./serverWallet";
import {SavedTransactionResponse} from "./@types/wallet";
import {transactionIsConfirmed, transactionIsOld, transactionIsDropped, recalculateGasPrice} from "./utils";

interface ITxMonitorOptions {
  neededConfirmations: number;
  // number to time original gasPrice when resending it
  gasPriceIncrease: number;
  transactionTimeout: number;
}

export class TxMonitorService {
  private wallet: ServerWeb3Wallet;
  private intervalId?: NodeJS.Timeout;
  private options: ITxMonitorOptions;
  private defaultOptions = {
    neededConfirmations: 5,
    gasPriceIncrease: 1.2,
    transactionTimeout: 180
  }

  constructor(wallet: ServerWeb3Wallet, options?: Partial<ITxMonitorOptions>) {
    this.wallet = wallet;
    this.options = Object.assign({}, this.defaultOptions, options)
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

      if(transactionIsConfirmed(transaction, this.options.neededConfirmations)) {
        await this.wallet.walletStorage.deleteTransaction(transaction.hash)
        continue;
      }

      if(
        transactionIsOld(transaction, this.options.transactionTimeout) ||
        await transactionIsDropped(transaction, this.wallet.provider)
      ) {
        await this.resendTransaction(transaction);
        break;
      }
    }
  }

  private async resendTransaction(transaction: SavedTransactionResponse): Promise<void> {
    await this.wallet.walletStorage.deleteTransaction(transaction.hash);
    const newGasPrice = await recalculateGasPrice(
      transaction.gasPrice,
      this.options.gasPriceIncrease
    );
    try {
      await this.wallet.sendTransaction({
        ...transaction,
        gasPrice: newGasPrice
      });
    } catch {
      console.error(`Resending transaction with hash ${transaction.hash} failed.`)
    }
  }


}
