import {Wallet} from "ethers";
import {SigningKey, BigNumber, populateTransaction} from "ethers/utils";
import {IWalletTransactionStorage, IWalletSourceStorage, SavedTransactionResponse} from "./@types/wallet"
import {TransactionRequest, TransactionResponse, Provider} from "ethers/providers";
import {estimateGasPrice} from "./utils";

export class ServerWeb3Wallet extends Wallet {
  public walletStorage: IWalletTransactionStorage;

  private gasPriceLimit: number;

  protected constructor(
    key: SigningKey,
    walletStorage: IWalletTransactionStorage,
    provider?: Provider,
    gasPriceLimit=50000000000
  ) {
    super(key, provider);
    this.walletStorage = walletStorage;
    this.gasPriceLimit = gasPriceLimit;
  };

  public static async create(
    walletSourceStorage: IWalletSourceStorage,
    walletTransactionStorage: IWalletTransactionStorage,
    provider?: Provider,
    gasPriceLimit?
  ): Promise<ServerWeb3Wallet | undefined> {
    const assignedWallet = await walletSourceStorage.assignWallet();

    if(assignedWallet) {
      return new ServerWeb3Wallet(
        assignedWallet,
        walletTransactionStorage,
        provider,
        gasPriceLimit,
      )
    }
  }

  public async sendTransaction(
    tx: TransactionRequest,
    gasPriceOption="safeLow",
  ): Promise<TransactionResponse> {

    if(tx.gasPrice == null) {
      tx.gasPrice = await estimateGasPrice(
        gasPriceOption,
      )
    }

    if(tx.gasPrice && tx.gasPrice > this.gasPriceLimit) {
      tx.gasPrice = new BigNumber(this.gasPriceLimit);
    }

    if(tx.nonce == null){
      tx.nonce = await this.getNonce();
    }

    const txResponse = await this.getTransactionResponse(tx);
    if(txResponse.hash) {
      await this.walletStorage.saveTransaction(txResponse,);
    }
    return txResponse;
  }

  private async getNonce(): Promise<BigNumber> {
    const transactions = await this.walletStorage.getTransactions(
      await this.getAddress()
    );
    const transactionCount = await this.getTransactionCount();

    const gapNonce = this.findGapNonce(transactions, transactionCount);
    if(gapNonce) {
      return new BigNumber(gapNonce)
    }

    if(transactions.length) {
      return new BigNumber(transactions[transactions.length - 1].nonce + 1);
    }

    return new BigNumber(transactionCount);
  }

  private findGapNonce(
    transactions: SavedTransactionResponse[],
    transactionCount: number
  ): number | undefined {
    if(transactions[0] && transactions[0].nonce - transactionCount > 0) {
      return transactionCount;
    }

    for(let i=0; i < transactions.length - 1; i++) {
      if(transactions[i+1].nonce - (transactions[i].nonce + 1) > 0) {
        return transactions[i].nonce + 1;
      }
    }

    return;
  }

  private async getTransactionResponse(tx: TransactionRequest): Promise<TransactionResponse> {
    const populatedTx = await populateTransaction(tx, this.provider, this.address)
    const signedTx = await this.sign(populatedTx);
    return await this.provider.sendTransaction(signedTx);
  }

}
