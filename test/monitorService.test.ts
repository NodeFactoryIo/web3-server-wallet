import {expect} from "chai";
import sinon, {SinonSpy, SinonStubbedInstance} from "sinon";
import {ServerWeb3Wallet} from "../src/serverWallet";
import {TxMonitorService} from "../src/monitorService";
import {IWalletTransactionStorage, SavedTransactionResponse} from "../src/@types/wallet";
import * as utils from "../src/utils";
import {providers, BigNumber} from "ethers";

describe("Transaction monitor service", function () {

  let web3WalletStub: SinonStubbedInstance<ServerWeb3Wallet>;
  let txMonitorService: TxMonitorService;
  let walletStorage: IWalletTransactionStorage;
  let providerStub: providers.Provider;
  let deleteTransactionSpy: SinonSpy;

  beforeEach(function () {
    web3WalletStub = sinon.createStubInstance(ServerWeb3Wallet);
    walletStorage = sinon.stub() as unknown as IWalletTransactionStorage;
    walletStorage.deleteTransaction = async function deleteTransaction(hash: string) {
      return;
    }
    deleteTransactionSpy = sinon.spy(walletStorage, "deleteTransaction");
    providerStub = sinon.stub() as unknown as providers.Provider;
    // @ts-ignore
    web3WalletStub.provider = providerStub;
    web3WalletStub.walletStorage = walletStorage;
    txMonitorService = new TxMonitorService(web3WalletStub as unknown as ServerWeb3Wallet);
  });

  afterEach(function () {
    txMonitorService.stop();
    sinon.restore();
  });

  it("Start doesn't set interval if interval already exists", function (done) {
    const stub = sinon.stub(txMonitorService as any, "checkTransactions").resolves()

    txMonitorService.start(20);
    txMonitorService.start(20);

    setTimeout(() => {
      expect(stub.callCount).to.be.deep.equal(1);
      done();
    }, 30)
  });

  it("Start checks transactions every given interval", function (done) {
    walletStorage.getTransactions = async function getTransactions() {
      return [] as SavedTransactionResponse[];
    }
    const spy = sinon.spy(txMonitorService as any, "checkTransactions");

    txMonitorService.start(20);

    setTimeout(() => {
      expect(spy.callCount).to.be.deep.equal(2);
      done();
    }, 50)

  });

  it("Stop checks if interval exists", function () {
    const spy = sinon.spy(clearInterval)

    txMonitorService.stop();

    expect(spy.callCount).to.be.deep.equal(0)
  });

  it("Check transaction ignores transactions that are confirmed", function (done) {
    const transaction = {blockNumber: 13, confirmations: 6}
    walletStorage.getTransactions = async function getTransactions() {
      return [transaction] as SavedTransactionResponse[];
    }
    web3WalletStub.provider.getTransaction = async () => {
      return transaction as providers.TransactionResponse;
    }
    sinon.stub(utils, "recalculateGasPrice").resolves(BigNumber.from(12.0))
    const spy = sinon.spy(utils, "transactionIsOld");

    txMonitorService.start(20);

    setTimeout(() => {
      expect(deleteTransactionSpy.callCount).to.be.deep.equal(1);
      expect(spy.callCount).to.be.deep.equal(0);
      done();
    }, 30)

  });

  it("Check transaction ignores other transactions after resending", function (done) {
    walletStorage.getTransactions = async function getTransactions() {
      return [
        {nonce: 1, gasPrice: BigNumber.from(12), submitTime: new Date().getTime() - 300000} as SavedTransactionResponse,
        {nonce: 2, gasPrice: BigNumber.from(12), submitTime: new Date().getTime() - 300000} as SavedTransactionResponse,
      ];
    }
    web3WalletStub.provider.getTransaction = async () => {
      return {} as providers.TransactionResponse;
    }
    sinon.stub(utils, "recalculateGasPrice").resolves(BigNumber.from(12.0))
    const stub = web3WalletStub.sendTransaction.resolves()

    txMonitorService.start(20);

    setTimeout(() => {
      expect(stub.callCount).to.be.deep.equal(1);
      done();
    }, 30)

  });

  it("Check transaction does not delete transaction if resubmiting fails", function (done) {
    walletStorage.getTransactions = async function getTransactions() {
      return [
        {nonce: 1, gasPrice: BigNumber.from(12), submitTime: new Date().getTime() - 300000} as SavedTransactionResponse,
      ];
    }
    web3WalletStub.provider.getTransaction = async () => {
      return {} as providers.TransactionResponse;
    }
    sinon.stub(utils, "recalculateGasPrice").resolves(BigNumber.from(12.0))
    const stub = web3WalletStub.sendTransaction.callsFake(() => {
      throw new Error("Error");
    })

    txMonitorService.start(20);

    setTimeout(() => {
      expect(stub.callCount).to.be.deep.equal(1);
      expect(deleteTransactionSpy.callCount).to.be.deep.equal(0);
      done();
    }, 30)

  });

  it("Check transaction resends transaction that is older than 3 minutes", function (done) {
    walletStorage.getTransactions = async function getTransactions() {
      return [
        {nonce: 1, gasPrice: BigNumber.from(12), submitTime: new Date().getTime()} as SavedTransactionResponse,
        {nonce: 2, gasPrice: BigNumber.from(12), submitTime: new Date().getTime() - 300000} as SavedTransactionResponse,
      ];
    }
    web3WalletStub.provider.getTransaction = async () => {
      return {} as providers.TransactionResponse;
    }
    sinon.stub(utils, "recalculateGasPrice").resolves(BigNumber.from(12.0))
    const sendTransactionStub = web3WalletStub.sendTransaction.resolves()

    txMonitorService.start(20);

    setTimeout(() => {
      expect(sendTransactionStub.callCount).to.be.deep.equal(1);
      done();
    }, 30)

  });

});
