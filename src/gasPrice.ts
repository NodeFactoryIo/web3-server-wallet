
import axios from "axios";
import {Provider} from "ethers/providers";
import {BigNumber} from "ethers/utils";

const GAS_PRICE_API = "https://ethgasstation.info/api/ethgasAPI.json"

export async function estimateGasPrice(
  provider: Provider,
  gasPriceOption: string,
  limit?: number,
  apiKey?: string
): Promise<BigNumber> {
  let gasPrice: BigNumber;
  try {
    const response = await axios.get(GAS_PRICE_API, {
      params: {
        "api-key": apiKey
      }
    })
    gasPrice = new BigNumber(response.data[gasPriceOption]);
  } catch {
    gasPrice = await provider.getGasPrice();
  }

  if(limit && limit < gasPrice.toNumber()) {
    gasPrice = new BigNumber(limit);
  }

  return gasPrice
}
