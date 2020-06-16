import {expect} from "chai";
import sinon, {SinonStubbedInstance} from "sinon";
import axios from "axios";
import {BigNumber} from "ethers/utils";
import {
  estimateGasPrice,
  transactionIsConfirmed,
  transactionIsOld,
  transactionIsDropped,
  recalculateGasPrice
} from "../src/utils";
import {Provider} from "ethers/providers";
import {SavedTransactionResponse} from "../src/@types/wallet";

describe("Estimate gas price", function () {
  let providerStub: SinonStubbedInstance<Provider>;

  beforeEach(function () {
    providerStub = sinon.stub() as Provider;
  });

  afterEach(function () {
    sinon.restore();
  });

  it("Looks for gas price on eth gas station by default", async function() {
    sinon.stub(axios, "get").resolves(
      {data: {safeLow: 10}, status: 200}
    )

    const gasPrice = await estimateGasPrice("safeLow");

    expect(gasPrice.toNumber()).to.be.deep.equal(100000000000);
  });

  it("Returns undefined if gas station fails", async function() {
    sinon.stub(axios, "get").resolves(
      new Error()
    );

    const gasPrice = await estimateGasPrice("safeLow");

    expect(gasPrice).to.be.deep.equal(undefined);
  });

});

describe("Transaction is confirmed", function () {

  it("Returns true if transaction has block number and needed confirmations", function() {
    const transaction = sinon.stub() as SavedTransactionResponse;
    transaction.blockNumber = 12
    transaction.confirmations = 5

    const isConfirmed = transactionIsConfirmed(transaction, 4);

    expect(isConfirmed).to.be.deep.equal(true);
  });

  it("Returns false if transaction has no block number", async function() {
    const transaction = sinon.stub() as SavedTransactionResponse;
    transaction.confirmations = 5

    const isConfirmed = transactionIsConfirmed(transaction, 4);

    expect(isConfirmed).to.be.deep.equal(false);
  });

  it("Returns false if transaction has no less confirmations than needed", async function() {
    const transaction = sinon.stub() as SavedTransactionResponse;
    transaction.confirmations = 5

    const isConfirmed = transactionIsConfirmed(transaction, 4);

    expect(isConfirmed).to.be.deep.equal(false);
  });

});

describe("Transaction is old", function () {

  it("Returns true if transaction submit time is older than oldTransactionTime", function() {
    const transaction = sinon.stub() as SavedTransactionResponse;
    transaction.submitTime = new Date().getTime() - 300;

    const isOld = transactionIsOld(transaction, 180);

    expect(isOld).to.be.deep.equal(true);
  });

  it("Returns false if transaction is newer than oldTransactionTime", async function() {
    const transaction = sinon.stub() as SavedTransactionResponse;
    transaction.submitTime = new Date().getTime() - 100;

    const isOld = transactionIsOld(transaction, 180);

    expect(isOld).to.be.deep.equal(false);
  });

});

describe("Transaction is dropped", function () {
  let providerStub: SinonStubbedInstance<Provider>;

  beforeEach(function () {
    providerStub = sinon.stub() as Provider;
  });

  afterEach(function () {
    sinon.restore();
  });

  it("Returns true if transaction has hash and returns transaction receipt", async function() {
    const transaction = sinon.stub() as SavedTransactionResponse;
    transaction.hash = "test-hash"
    providerStub.getTransactionReceipt = async () => {
      return {};
    }

    const isDropped = await transactionIsDropped(transaction, providerStub);

    expect(isDropped).to.be.deep.equal(true);
  });
  it("Returns false if transaction receipt is null", async function() {
    const transaction = sinon.stub() as SavedTransactionResponse;
    transaction.hash = "test-hash"
    providerStub.getTransactionReceipt = async () => {
      return;
    }

    const isDropped = await transactionIsDropped(transaction, providerStub);

    expect(isDropped).to.be.deep.equal(false);
  });

});

describe("Recalculate gas price", function () {

  afterEach(function () {
    sinon.restore();
  });

  it(
    "Returns new gas price estimation if gas price estimation is higher than original gas price",
    async function()
  {
    const transaction = sinon.stub() as SavedTransactionResponse;
    sinon.stub(axios, "get").resolves(
      {data: {fastest: 24}, status: 200}
    )

    const gasPrice = await recalculateGasPrice(new BigNumber(20000000000), 1.2);

    expect(gasPrice.toNumber()).to.be.deep.equal(240000000000);
  });

  it(
    "Returns original gas price with percentage increase when estimate lower",
    async function()
  {
    const transaction = sinon.stub() as SavedTransactionResponse;
    sinon.stub(axios, "get").resolves(
      {data: {fastest: 18}, status: 200}
    )

    const gasPrice = await recalculateGasPrice(new BigNumber(200000000000), 1.1);

    expect(gasPrice.toNumber()).to.be.deep.equal(220000000000);
  });

});
