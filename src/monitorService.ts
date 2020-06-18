import {ServerWeb3Wallet} from "./serverWallet";
import {SavedTransactionResponse} from "./@types/wallet";
import {
  transactionIsConfirmed,
  transactionIsOld,
  recalculateGasPrice,
  transactionNotInBlock
} from "./utils";

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
    transactionTimeout: 180000
  }

  constructor(wallet: ServerWeb3Wallet, options?: Partial<ITxMonitorOptions>) {
    this.wallet = wallet;
    this.options = Object.assign({}, this.defaultOptions, options)
  };

  public async start(interval=300000): Promise<void> {
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
      const transactionInfo = await this.wallet.provider.getTransaction(transaction.hash);

      if(transactionIsConfirmed(transactionInfo, this.options.neededConfirmations)) {
        await this.wallet.walletStorage.deleteTransaction(transaction.hash)
        continue;
      }

      if(transactionNotInBlock(transactionInfo) && transactionIsOld(transaction, this.options.transactionTimeout)) {
        await this.resendTransaction(transaction);
        break;
      }
    }
  }

  private async resendTransaction(transaction: SavedTransactionResponse): Promise<void> {
    const newGasPrice = await recalculateGasPrice(
      transaction.gasPrice,
      this.options.gasPriceIncrease
    );
    await this.wallet.walletStorage.deleteTransaction(transaction.hash);
    try {
      await this.wallet.sendTransaction({
        to: transaction.to,
        nonce: transaction.nonce,
        gasLimit: transaction.gasLimit,
        data: transaction.data,
        value: transaction.value,
        chainId: transaction.chainId,
        gasPrice: newGasPrice
      });
    } catch(error) {
      console.error(error)
      console.error(`Resending transaction with hash ${transaction.hash} failed.`)
    }
  }


}
