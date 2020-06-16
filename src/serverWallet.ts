import {Wallet} from "ethers";
import {SigningKey, BigNumber, populateTransaction} from "ethers/utils";
import {IWalletTransactionStorage} from "./@types/wallet"
import {TransactionRequest, TransactionResponse, Provider} from "ethers/providers";
import {estimateGasPrice} from "./utils";

export class ServerWeb3Wallet extends Wallet {
  private gasPriceLimit: number;

  public walletStorage: IWalletTransactionStorage;

  constructor(
    key: SigningKey,
    walletStorage: IWalletTransactionStorage,
    provider?: Provider,
    gasPriceLimit=50000000000
  ) {
    super(key, provider);
    this.walletStorage = walletStorage;
    this.gasPriceLimit = gasPriceLimit;
  };

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
    const transactions = await this.walletStorage.getTransactions();
    if(transactions.length) {
      return new BigNumber(transactions[transactions.length - 1].nonce + 1);
    }

    const transactionCount = await this.getTransactionCount();
    return new BigNumber(transactionCount);
  }

  private async getTransactionResponse(tx: TransactionRequest): Promise<TransactionResponse> {
    const populatedTx = await populateTransaction(tx, this.provider, this.address)
    const signedTx = await this.sign(populatedTx);
    return await this.provider.sendTransaction(signedTx);
  }

}
