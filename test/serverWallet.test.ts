import {expect, assert} from "chai";
import sinon, {SinonStubbedInstance} from "sinon";
import {ServerWeb3Wallet} from "../src/serverWallet";
import {IWalletTransactionStorage, SavedTransactionResponse, IWalletSourceStorage} from "../src/@types/wallet";
import {providers, utils, BigNumber} from "ethers";
import * as utilsModule from "../src/utils";

describe("Server wallet sendTransaction", function () {

  let signingKey: utils.SigningKey;
  let web3Wallet: ServerWeb3Wallet;
  let walletStorage: IWalletTransactionStorage;
  let walletSource: IWalletSourceStorage;
  let providerStub: SinonStubbedInstance<providers.Provider>;

  beforeEach(async function () {
    sinon.stub(providers.Provider, "isProvider").returns(true)
    walletStorage = sinon.stub() as IWalletTransactionStorage;
    walletSource = sinon.stub() as IWalletSourceStorage;
    providerStub = sinon.stub() as providers.Provider;
    signingKey = new utils.SigningKey(
      "0xE5B21F1D68386B32407F2B63F49EE74CDAE4A80EE346EB90205B62D8BCDE9920"
    )
    walletSource.assignWallet = async () => {
      return signingKey;
    }
    walletStorage.saveTransaction = async function saveTransaction(txResponse: providers.TransactionResponse){
      return;
    }
    web3Wallet = await ServerWeb3Wallet.create(
      walletSource,
      walletStorage,
      providerStub
    )
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
      web3Wallet as any, "submitTransaction"
    ).resolves(sinon.stub() as providers.TransactionResponse)
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
    sinon.stub(utilsModule, "estimateGasPrice").resolves(BigNumber.from(10.0))
    const transactionResponseStub = sinon.stub(
      web3Wallet as any, "submitTransaction"
    ).resolves(sinon.stub() as providers.TransactionResponse)
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
      web3Wallet as any, "submitTransaction"
    ).resolves(sinon.stub() as providers.TransactionResponse)
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
      web3Wallet as any, "submitTransaction"
    ).resolves(sinon.stub() as providers.TransactionResponse)
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

  it("Uses gap nonce if it exists", async function () {
    walletStorage.getTransactions = async function getTransactions(){
      return [
        {nonce: 2} as unknown as SavedTransactionResponse,
        {nonce: 4} as unknown as SavedTransactionResponse
      ]
    }
    sinon.stub(web3Wallet, "getTransactionCount").resolves(
      2
    );
    const transactionResponseStub = sinon.stub(
      web3Wallet as any, "submitTransaction"
    ).resolves(sinon.stub() as providers.TransactionResponse)
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

  it("Uses gap between first transaction and transaction count if it exists", async function () {
    walletStorage.getTransactions = async function getTransactions(){
      return [
        {nonce: 3} as unknown as SavedTransactionResponse,
      ]
    }
    sinon.stub(web3Wallet, "getTransactionCount").resolves(
      2
    );
    const transactionResponseStub = sinon.stub(
      web3Wallet as any, "submitTransaction"
    ).resolves(sinon.stub() as providers.TransactionResponse)
    const tx = {
      to: "to-address",
      gasLimit: 21000,
      gasPrice: 10.00,
      data: "data",
      value: 121,
      chainId: 1
    }

    const txResponse = await web3Wallet.sendTransaction(tx);

    expect(transactionResponseStub.args[0][0].nonce.toNumber()).to.be.equal(2);
  });

  it("Assigns highest nonce + 1 if transactions exist", async function () {
    walletStorage.getTransactions = async function getTransactions(){
      return [
        {nonce: 2} as unknown as SavedTransactionResponse
      ]
    }
    sinon.stub(web3Wallet, "getTransactionCount").resolves(
      2
    );
    const transactionResponseStub = sinon.stub(
      web3Wallet as any, "submitTransaction"
    ).resolves(sinon.stub() as providers.TransactionResponse)
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
      web3Wallet as any, "submitTransaction"
    ).resolves(sinon.stub() as providers.TransactionResponse)
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

  it("Calculates nonce correctly if 2 transactions sent at the same time", async function () {
    sinon.stub(web3Wallet, "getTransactionCount").resolves(
      4
    );
    const transactions: SavedTransactionResponse[] = [];
    walletStorage.getTransactions = async function getTransactions(){
      return transactions;
    }
    walletStorage.saveTransaction = async function saveTransaction(tx: providers.TransactionResponse){
      transactions.push(tx as unknown as SavedTransactionResponse);
    }
    const transactionResponseStub = sinon.stub(
      web3Wallet as any, "submitTransaction"
    ).resolves({hash: "test-hash", nonce: 4} as providers.TransactionResponse)

    const tx1 = {
      to: "to-address",
      gasLimit: 21000,
      gasPrice: 10.00,
      data: "data",
      value: 121,
      chainId: 1
    }
    const tx2 = {
      to: "to-address-2",
      gasLimit: 21000,
      gasPrice: 10.00,
      data: "data-2",
      value: 122,
      chainId: 1
    }

    await web3Wallet.sendTransaction(tx1);
    await web3Wallet.sendTransaction(tx2);

    expect(transactionResponseStub.args[0][0].nonce.toNumber()).to.be.equal(4);
    expect(transactionResponseStub.args[1][0].nonce.toNumber()).to.be.equal(5);
  });

  it("Transaction response stored into wallet storage if hash exists", async function () {
    const spy = sinon.spy(walletStorage, "saveTransaction");
    const transactionResponseStub = sinon.stub(
      web3Wallet as any, "submitTransaction"
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

  it("Send transaction generator continues after error", async function () {
    const transactionResponseStub = sinon.stub(
      web3Wallet as any, "submitTransaction"
    )
    transactionResponseStub.onFirstCall().callsFake(() => { throw new Error("Invalid params"); });
    transactionResponseStub.onSecondCall().resolves({hash: "hash"} as SavedTransactionResponse);

    const tx = {
      to: "to-address",
      gasLimit: 21000,
      gasPrice: 10.00,
      nonce: 1,
      data: "data",
      value: 121,
      chainId: 1
    }

    try {
      await web3Wallet.sendTransaction(tx);
      assert.fail("Error not thrown");
    } catch (error) {
      expect(error.message).to.be.deep.equal("Invalid params");
    }

    const txResponse2 = await web3Wallet.sendTransaction(tx);

    expect(txResponse2.hash).to.be.deep.equal("hash");
  });



});
