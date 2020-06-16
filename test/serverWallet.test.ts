import {expect} from "chai";
import axios from "axios";
import sinon, {SinonStubbedInstance} from "sinon";
import {SigningKey, BigNumber, Transaction} from "ethers/utils";
import {ServerWeb3Wallet} from "../src/serverWallet";
import {IWalletTransactionStorage, SavedTransactionResponse, IWalletSourceStorage} from "../src/@types/wallet";
import {Provider, TransactionResponse} from "ethers/providers";
import * as utils from "../src/utils";

describe("Server wallet sendTransaction", function () {

  let signingKey: SigningKey;
  let web3Wallet: ServerWeb3Wallet;
  let walletStorage: IWalletTransactionStorage;
  let walletSource: IWalletSourceStorage;
  let providerStub: SinonStubbedInstance<Provider>;

  beforeEach(async function () {
    sinon.stub(Provider, "isProvider").returns(true)
    walletStorage = sinon.stub() as IWalletTransactionStorage;
    walletSource = sinon.stub() as IWalletSourceStorage;
    providerStub = sinon.stub() as Provider;
    signingKey = new SigningKey(
      "E5B21F1D68386B32407F2B63F49EE74CDAE4A80EE346EB90205B62D8BCDE9920"
    )
    walletSource.assignWallet = async () => {
      return signingKey;
    }
    web3Wallet = await ServerWeb3Wallet.create(
      walletSource,
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

  it("Create returns undefined if no wallets available", async function () {
    walletSource.assignWallet = async () => {
      return undefined;
    }

    web3Wallet = await ServerWeb3Wallet.create(
      walletSource,
      walletStorage,
      providerStub
    )

    expect(web3Wallet).to.be.deep.equal(undefined);
  });

  it("Create creates wallet if available", async function () {
    walletSource.assignWallet = async () => {
      return signingKey;
    }

    web3Wallet = await ServerWeb3Wallet.create(
      walletSource,
      walletStorage,
      providerStub
    )

    expect(web3Wallet.walletStorage).to.be.deep.equal(walletStorage);
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
    }

    const txResponse = await web3Wallet.sendTransaction(tx);

    expect(transactionResponseStub.args[0][0].gasPrice).to.be.equal(20.00);
  });

  it("Assigns calculated gas price estimation", async function () {
    sinon.stub(utils, "estimateGasPrice").resolves(new BigNumber(10.0))
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

    expect(transactionResponseStub.args[0][0].gasPrice.toNumber()).to.be.equal(10.0);
  });

  it("Uses limit gas price if gas price higher", async function () {
    const transactionResponseStub = sinon.stub(
      web3Wallet as any, "getTransactionResponse"
    ).resolves(sinon.stub() as TransactionResponse)
    const tx = {
      to: "to-address",
      nonce: 0,
      gasLimit: 21000,
      data: "data",
      value: 121,
      chainId: 1,
      gasPrice: 51000000000
    }

    const txResponse = await web3Wallet.sendTransaction(tx);

    expect(transactionResponseStub.args[0][0].gasPrice.toNumber()).to.be.equal(50000000000);
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

  it("Assigns highest nonce + 1 if transactions exist", async function () {
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

  it("Uses get transaction count if no transactions in storage", async function () {
    sinon.stub(web3Wallet, "getTransactionCount").resolves(
      4
    );
    walletStorage.getTransactions = async function getTransactions(){
      return [] as SavedTransactionResponse[]
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

    expect(transactionResponseStub.args[0][0].nonce.toNumber()).to.be.equal(4);
  });

  it("Transaction response stored into wallet storage if hash exists", async function () {
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
