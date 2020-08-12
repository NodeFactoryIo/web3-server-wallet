import {Wallet, providers, BigNumber, utils} from "ethers";
import {IWalletTransactionStorage, IWalletSourceStorage, SavedTransactionResponse} from "./@types/wallet";
import {estimateGasPrice} from "./utils";
import pushable, {Pushable} from "it-pushable";

export class ServerWeb3Wallet extends Wallet {
  private transactionQueue: Pushable<providers.TransactionRequest>;
  private sendTransactionQueue: AsyncGenerator<providers.TransactionResponse>;

  public walletStorage: IWalletTransactionStorage;
  public gasPriceLimit: number;

  protected constructor(
    key: utils.SigningKey,
    walletStorage: IWalletTransactionStorage,
    provider?: providers.Provider,
    gasPriceLimit=50000000000
  ) {
    super(key, provider);
    this.walletStorage = walletStorage;
    this.gasPriceLimit = gasPriceLimit;
    this.transactionQueue = pushable()
    this.sendTransactionQueue = this.sendTransactionGenerator();
  }

  public static async create(
    walletSourceStorage: IWalletSourceStorage,
    walletTransactionStorage: IWalletTransactionStorage,
    provider?: providers.Provider,
    gasPriceLimit?: number
  ): Promise<ServerWeb3Wallet | undefined> {
    const assignedWallet = await walletSourceStorage.assignWallet();

    if(assignedWallet) {
      return new ServerWeb3Wallet(
        assignedWallet,
        walletTransactionStorage,
        provider,
        gasPriceLimit,
      );
    }
  }

  public async sendTransaction(
    tx: providers.TransactionRequest,
    gasPriceOption="safeLow",
  ): Promise<providers.TransactionResponse> {

    if(tx.gasPrice == null) {
      tx.gasPrice = await estimateGasPrice(
        gasPriceOption,
      );
    }

    if(tx.gasPrice && tx.gasPrice > this.gasPriceLimit) {
      tx.gasPrice = BigNumber.from(this.gasPriceLimit);
    }

    this.transactionQueue.push(tx);
    const result = (await this.sendTransactionQueue.next()).value;

    if(result instanceof Error) {
      throw result;
    }

    return result;
  }

  private async *sendTransactionGenerator(): AsyncGenerator<providers.TransactionResponse | Error> {
    for await (const tx of this.transactionQueue) {
      if(tx.nonce == null){
        tx.nonce = await this.getNonce();
      }

      try {
        const txResponse = await this.submitTransaction(tx);
        if(txResponse.hash) {
          await this.walletStorage.saveTransaction(txResponse);
        }
        yield txResponse;
      } catch (error) {
        yield error;
      }
    }
  }

  private async getNonce(): Promise<BigNumber> {
    const transactions = await this.walletStorage.getTransactions(
      await this.getAddress()
    );
    const transactionCount = await this.getTransactionCount();

    const gapNonce = this.findGapNonce(transactions, transactionCount);
    if(gapNonce) {
      return BigNumber.from(gapNonce);
    }

    if(transactions.length) {
      return BigNumber.from(transactions[transactions.length - 1].nonce + 1);
    }

    return BigNumber.from(transactionCount);
  }

  private findGapNonce(
    transactions: SavedTransactionResponse[],
    lastNonce: number
  ): number | undefined {
    if(transactions[0] && transactions[0].nonce - lastNonce > 0) {
      return lastNonce;
    }

    for(let i=0; i < transactions.length - 1; i++) {
      if(transactions[i+1].nonce - (transactions[i].nonce + 1) > 0) {
        return transactions[i].nonce + 1;
      }
    }

    return;
  }

  private async submitTransaction(tx: providers.TransactionRequest): Promise<providers.TransactionResponse> {
    const populatedTx = await this.populateTransaction(tx);
    const signedTx = await this.signTransaction(populatedTx);
    return await this.provider.sendTransaction(signedTx);
  }

}
