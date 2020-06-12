import {expect} from "chai";
import axios from "axios";
import sinon, {SinonStubbedInstance} from "sinon";
import {SigningKey, BigNumber, Transaction} from "ethers/utils";
import {ServerWeb3Wallet} from "../src/serverWallet";
import {IWalletStorage, SavedTransactionResponse} from "../src/@types/wallet";
import {Provider, TransactionResponse} from "ethers/providers";

describe("Server wallet sendTransaction", function () {

  let signingKey: SigningKey;
  let web3Wallet: ServerWeb3Wallet;
  let walletStorage: IWalletStorage;
  let providerStub: SinonStubbedInstance<Provider>;

  beforeEach(function () {
    signingKey = new SigningKey(
      "E5B21F1D68386B32407F2B63F49EE74CDAE4A80EE346EB90205B62D8BCDE9920"
    )
    sinon.stub(Provider, "isProvider").returns(true)
    walletStorage = sinon.stub() as IWalletStorage;
    providerStub = sinon.stub() as Provider;
    web3Wallet = new ServerWeb3Wallet(
      signingKey,
      walletStorage,
      providerStub
    )
    walletStorage.saveTransaction = async function saveTransaction(txResponse: TransactionResponse){
      return;
    }
  });

  afterEach(function () {
    sinon.restore();
  });

  it("Uses provided gas price if sent", async function () {
    const transactionResponseStub = sinon.stub(
      web3Wallet as any, "getTransactionResponse"
    ).resolves(sinon.stub() as TransactionResponse)
    const tx = {
      to: "to-address",
      nonce: 0,
      gasLimit: 21000,
      gasPrice: 20.00,
      data: "data",
      value: 121,
      chainId: 1
    }

    const txResponse = await web3Wallet.sendTransaction(tx);

    expect(transactionResponseStub.args[0][0].gasPrice).to.be.equal(20.00);
  });

  it("Assigns safe low gas price from eth gas station if price not sent", async function () {
    sinon.stub(axios, "get").resolves(
        {data: {safeLow: 10.0}, status: 200}
    );
    const transactionResponseStub = sinon.stub(
      web3Wallet as any, "getTransactionResponse"
    ).resolves(sinon.stub() as TransactionResponse)
    const tx = {
      to: "to-address",
      nonce: 0,
      gasLimit: 21000,
      data: "data",
      value: 121,
      chainId: 1
    }

    const txResponse = await web3Wallet.sendTransaction(tx);

    expect(transactionResponseStub.args[0][0].gasPrice.toNumber()).to.be.equal(1.0);
  });

  it("Uses default nonce if sent", async function () {
    const transactionResponseStub = sinon.stub(
      web3Wallet as any, "getTransactionResponse"
    ).resolves(sinon.stub() as TransactionResponse)
    const tx = {
      to: "to-address",
      gasLimit: 21000,
      gasPrice: 10.00,
      data: "data",
      value: 121,
      chainId: 1,
      nonce: 6
    }

    const txResponse = await web3Wallet.sendTransaction(tx);

    expect(transactionResponseStub.args[0][0].nonce).to.be.equal(6);
  });

  it("Assigns highest nonce + 1 if transactions nonce and transaction count match", async function () {
    sinon.stub(web3Wallet, "getTransactionCount").resolves(
      3
    );
    walletStorage.getTransactions = async function getTransactions(){
      return [
        {nonce: 2} as unknown as SavedTransactionResponse
      ]
    }
    const transactionResponseStub = sinon.stub(
      web3Wallet as any, "getTransactionResponse"
    ).resolves(sinon.stub() as TransactionResponse)
    const tx = {
      to: "to-address",
      gasLimit: 21000,
      gasPrice: 10.00,
      data: "data",
      value: 121,
      chainId: 1
    }

    const txResponse = await web3Wallet.sendTransaction(tx);

    expect(transactionResponseStub.args[0][0].nonce.toNumber()).to.be.equal(3);
  });

  it("Uses gap nonce if transactions nonce and transaction count do not match", async function () {
    sinon.stub(web3Wallet, "getTransactionCount").resolves(
      4
    );
    walletStorage.getTransactions = async function getTransactions(){
      return [
        {nonce: 2}
      ] as SavedTransactionResponse[]
    }
    const transactionResponseStub = sinon.stub(
      web3Wallet as any, "getTransactionResponse"
    ).resolves(sinon.stub() as TransactionResponse)
    const tx = {
      to: "to-address",
      gasLimit: 21000,
      gasPrice: 10.00,
      data: "data",
      value: 121,
      chainId: 1
    }

    const txResponse = await web3Wallet.sendTransaction(tx);

    expect(transactionResponseStub.args[0][0].nonce.toNumber()).to.be.equal(3);
  });

  it("Transaction response stored into wallet storage", async function () {
    const spy = sinon.spy(walletStorage, "saveTransaction");
    const transactionResponseStub = sinon.stub(
      web3Wallet as any, "getTransactionResponse"
    ).resolves({hash: "hash"} as SavedTransactionResponse)
    const tx = {
      to: "to-address",
      gasLimit: 21000,
      gasPrice: 10.00,
      nonce: 1,
      data: "data",
      value: 121,
      chainId: 1
    }

    const txResponse = await web3Wallet.sendTransaction(tx);

    expect(spy.calledOnce).to.be.deep.equal(true);
  });

});
