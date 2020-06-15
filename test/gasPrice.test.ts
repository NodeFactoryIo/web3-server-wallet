import {expect} from "chai";
import sinon, {SinonStubbedInstance} from "sinon";
import axios from "axios";
import {BigNumber} from "ethers/utils";
import {estimateGasPrice} from "../src/gasPrice";
import {Provider} from "ethers/providers";

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
      {data: {safeLow: 10.0}, status: 200}
    )

    const gasPrice = await estimateGasPrice(providerStub, "safeLow");

    expect(gasPrice.toNumber()).to.be.deep.equal(10.0);
  });

  it("Uses provider getGasPrice if eth gas station fails", async function() {
    sinon.stub(axios, "get").resolves(
      new Error()
    );
    providerStub.getGasPrice = async () => {return new BigNumber(20.0)};

    const gasPrice = await estimateGasPrice(providerStub, "safeLow");

    expect(gasPrice.toNumber()).to.be.deep.equal(20.0);
  });

  it("Uses limit if gas price higher than limit", async function() {
    sinon.stub(axios, "get").resolves(
      {data: {safeLow: 5.0}, status: 200}
    );

    const gasPrice = await estimateGasPrice(providerStub, "safeLow", 3.0);

    expect(gasPrice.toNumber()).to.be.deep.equal(3.0);
  });

});
