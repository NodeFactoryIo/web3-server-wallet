import {ServerWeb3Wallet} from "./serverWallet";
import {SavedTransactionResponse} from "./@types/wallet";
import {BigNumber} from "ethers/utils";
import {estimateGasPrice} from "./utils";


export class TxMonitorService {
  private wallet: ServerWeb3Wallet;
  private intervalId?: NodeJS.Timeout;
  private neededConfirmations: number;
  private oldTransactionTime: number;

  constructor(wallet: ServerWeb3Wallet, neededConfirmations=5, oldTransactionTime=180) {
    this.wallet = wallet;
    this.neededConfirmations = neededConfirmations;
    this.oldTransactionTime = oldTransactionTime;
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
        this.wallet.walletStorage.deleteTransaction(transaction)
        continue;
      }

      if(this.transactionIsOld(transaction) || this.transactionIsDropped(transaction)) {
        await this.resendTransaction(transaction);
        break;
      }
    }
  }

  private transactionIsConfirmed(transaction: SavedTransactionResponse): boolean {
    if(transaction.blockNumber && transaction.confirmations > this.neededConfirmations) {
      return true;
    }

    return false;
  }

  private transactionIsOld(transaction: SavedTransactionResponse): boolean {
    if(new Date().getTime() - transaction.submitTime > this.oldTransactionTime) {
      return true;
    }

    return false;
  }

  private transactionIsDropped(transaction: SavedTransactionResponse): boolean {
    if(transaction.hash && !this.wallet.provider.getTransactionReceipt(transaction.hash)) {
      return true
    }

    return false
  }

  private async resendTransaction(transaction: SavedTransactionResponse): Promise<void> {
    await this.wallet.walletStorage.deleteTransaction(transaction);
    const newGasPrice = await this.recalculateGasPrice(transaction.gasPrice)
    await this.wallet.sendTransaction({
      gasPrice: newGasPrice,
      to: transaction.to,
      from: transaction.from,
      nonce: transaction.nonce,
      gasLimit: transaction.gasLimit,
      data: transaction.data,
      value: transaction.value,
      chainId: transaction.chainId
    });
  }

  private async recalculateGasPrice(gasPrice: BigNumber): Promise<BigNumber> {
    const estimatedGasPrice = await estimateGasPrice("fastest");
    if(estimatedGasPrice && gasPrice < estimatedGasPrice) {
      return estimatedGasPrice;
    }

    return new BigNumber(Math.round(gasPrice.toNumber() * 1.2));
  }

}
