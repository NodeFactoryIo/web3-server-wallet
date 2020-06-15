import axios from "axios";
import {BigNumber} from "ethers/utils";

const GAS_PRICE_API = "https://ethgasstation.info/api/ethgasAPI.json"

export async function estimateGasPrice(
  gasPriceOption: string,
): Promise<BigNumber | undefined> {
  try {
    const response = await axios.get(GAS_PRICE_API)
    return new BigNumber(response.data[gasPriceOption] / 10);
  } catch {
    return;
  }
}
