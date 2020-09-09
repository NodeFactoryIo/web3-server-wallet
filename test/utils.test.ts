import {expect} from "chai";
import sinon, {SinonStubbedInstance} from "sinon";
import axios from "axios";
import {BigNumber, providers} from "ethers";
import {
  estimateGasPrice,
  transactionIsConfirmed,
  transactionIsOld,
  recalculateGasPrice,
  transactionNotInBlock
} from "../src/utils";
import {SavedTransactionResponse} from "../src/@types/wallet";

describe("Estimate gas price", function () {
  let providerStub: SinonStubbedInstance<providers.Provider>;

  beforeEach(function () {
    providerStub = sinon.stub() as providers.Provider;
    process.env.GAS_STATION_API_KEY = "api-key"
  });

  afterEach(function () {
    sinon.restore();
  });

  it("Looks for gas price on eth gas station by default", async function() {
    sinon.stub(axios, "get").resolves(
      {data: {safeLow: 1370}, status: 200}
    )

    const gasPrice = await estimateGasPrice("safeLow");

    expect(gasPrice.toNumber()).to.be.deep.equal(137000000000);
  });

  it("Returns undefined if gas station api key missing", async function() {
    process.env.GAS_STATION_API_KEY = undefined;
    sinon.stub(axios, "get").resolves(
      new Error()
    );

    const gasPrice = await estimateGasPrice("safeLow");

    expect(gasPrice).to.be.deep.equal(undefined);
  });

  it("Returns undefined if gas station returns error", async function() {
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

describe("Transaction not in block", function () {

  it("Returns false if transaction has block number", async function() {
    const transaction = sinon.stub() as providers.TransactionResponse;
    transaction.blockNumber = 1;

    const isInBlock = transactionNotInBlock(transaction);

    expect(isInBlock).to.be.deep.equal(false);
  });

  it("Returns true if transaction not in block", function() {
    const transaction = sinon.stub() as providers.TransactionResponse;

    const isInBlock = transactionNotInBlock(transaction);

    expect(isInBlock).to.be.deep.equal(true);
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
      {data: {fastest: 1760}, status: 200}
    )

    const gasPrice = await recalculateGasPrice(BigNumber.from(20000000), 1.2);

    expect(gasPrice.toNumber()).to.be.deep.equal(176000000000);
  });

  it(
    "Returns original gas price with percentage increase when estimate lower",
    async function()
  {
    const transaction = sinon.stub() as SavedTransactionResponse;
    sinon.stub(axios, "get").resolves(
      {data: {fastest: 18}, status: 200}
    )

    const gasPrice = await recalculateGasPrice(BigNumber.from(200000000000), 1.1);

    expect(gasPrice.toNumber()).to.be.deep.equal(220000000000);
  });

});
