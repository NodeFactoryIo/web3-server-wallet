import {expect} from "chai";
import sinon, {SinonStubbedInstance} from "sinon";
import axios from "axios";
import {BigNumber} from "ethers/utils";
import {estimateGasPrice} from "../src/utils";
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
