import {expect} from "chai";
import sinon, {SinonStubbedInstance} from "sinon";
import {ServerWeb3Wallet} from "../src/serverWallet";
import {TxMonitorService} from "../src/monitorService";
import {IWalletTransactionStorage, SavedTransactionResponse} from "../src/@types/wallet";
import {BigNumber} from "ethers/utils";
import * as utils from "../src/utils";
import { Provider } from "ethers/providers";

describe("Transaction monitor service", function () {

  let web3WalletStub: SinonStubbedInstance<ServerWeb3Wallet>;
  let txMonitorService: TxMonitorService;
  let walletStorage: IWalletTransactionStorage;
  let providerStub: Provider;

  beforeEach(function () {
    web3WalletStub = sinon.createStubInstance(ServerWeb3Wallet);
    walletStorage = sinon.stub() as IWalletTransactionStorage;
    walletStorage.deleteTransaction = async function deleteTransaction(hash: string) {
      return;
    }
    providerStub = sinon.stub() as Provider;
    web3WalletStub.provider = providerStub;
    web3WalletStub.walletStorage = walletStorage;
    txMonitorService = new TxMonitorService(web3WalletStub);
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
      return transaction;
    }
    sinon.stub(utils, "recalculateGasPrice").resolves(new BigNumber(12.0))
    const spy = sinon.spy(utils, "transactionIsOld");

    txMonitorService.start(20);

    setTimeout(() => {
      expect(spy.callCount).to.be.deep.equal(0);
      done();
    }, 30)

  });

  it("Check transaction ignores other transactions after resending", function (done) {
    walletStorage.getTransactions = async function getTransactions() {
      return [
        {nonce: 1, gasPrice: new BigNumber(12), submitTime: new Date().getTime() - 300000} as SavedTransactionResponse,
        {nonce: 2, gasPrice: new BigNumber(12), submitTime: new Date().getTime() - 300000} as SavedTransactionResponse,
      ];
    }
    web3WalletStub.provider.getTransaction = async () => {
      return {};
    }
    sinon.stub(utils, "recalculateGasPrice").resolves(new BigNumber(12.0))
    const stub = web3WalletStub.sendTransaction.resolves()

    txMonitorService.start(20);

    setTimeout(() => {
      expect(stub.callCount).to.be.deep.equal(1);
      done();
    }, 30)

  });

  it("Check transaction resends transaction that is older than 3 minutes", function (done) {
    walletStorage.getTransactions = async function getTransactions() {
      return [
        {nonce: 1, gasPrice: new BigNumber(12), submitTime: new Date().getTime()} as SavedTransactionResponse,
        {nonce: 2, gasPrice: new BigNumber(12), submitTime: new Date().getTime() - 300000} as SavedTransactionResponse,
      ];
    }
    web3WalletStub.provider.getTransaction = async () => {
      return {};
    }
    sinon.stub(utils, "recalculateGasPrice").resolves(new BigNumber(12.0))
    const sendTransactionStub = web3WalletStub.sendTransaction.resolves()

    txMonitorService.start(20);

    setTimeout(() => {
      expect(sendTransactionStub.callCount).to.be.deep.equal(1);
      done();
    }, 30)

  });

});
