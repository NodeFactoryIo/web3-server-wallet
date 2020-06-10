import axios from "axios";
import {Wallet} from "ethers";
import {SigningKey, BigNumber, populateTransaction} from "ethers/utils";
import {IWalletStorage} from "./@types/wallet"
import {TransactionRequest, TransactionResponse, Provider} from "ethers/providers";

const GAS_PRICE_API = "https://ethgasstation.info/api/ethgasAPI.json"

export class ServerWeb3Wallet extends Wallet {

  public walletStorage: IWalletStorage;

  constructor(key: SigningKey, walletStorage: IWalletStorage, provider?: Provider) {
    super(key, provider);
    this.walletStorage = walletStorage;
  };

  private async getSafeGasPrice(): Promise<BigNumber> {
    const response = await axios.get(GAS_PRICE_API);
    return new BigNumber(response.data.safeLow);
  }

  private async getNonce(): Promise<BigNumber> {
    const transactions = await this.walletStorage.getTransactions();
    const transactionCount = await this.getTransactionCount("pending");

    if(transactions[0].nonce !== transactionCount) {
      return new BigNumber(transactions[0].nonce);
    } 

    return new BigNumber(transactions[0].nonce + 1);
  }

  private async getTransactionResponse(tx: TransactionRequest): Promise<TransactionResponse> {
    const populatedTx = await populateTransaction(tx, this.provider, this.address)
    const signedTx = await this.sign(populatedTx);
    return await this.provider.sendTransaction(signedTx);
  }
    
  public async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    if(tx.gasPrice == null) {
      tx.gasPrice = await this.getSafeGasPrice();
    }
    if(tx.nonce == null){
      tx.nonce = await this.getNonce();
    }

    const txResponse = await this.getTransactionResponse(tx);
    
    if(txResponse.hash) {
      await this.walletStorage.saveTransaction(txResponse);
    }

    return txResponse;
  }
    
}
