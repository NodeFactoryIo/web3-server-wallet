import axios from "axios";
import {BigNumber, parseUnits} from "ethers/utils";
import {SavedTransactionResponse} from "./@types/wallet";
import {Provider} from "ethers/providers";

const GAS_PRICE_API = "https://ethgasstation.info/api/ethgasAPI.json"

/**
 * @param gasPriceOption options of price from eth gas station (eg. safeLow, fastest)
 *
 * Returns estimated gas price in wei.
 */
export async function estimateGasPrice(
  gasPriceOption: string,
): Promise<BigNumber | undefined> {
  try {
    const response = await axios.get(GAS_PRICE_API)
    const gasPrice = response.data[gasPriceOption];
    return parseUnits((gasPrice * 10).toString(), "gwei");
  } catch(error) {
    return;
  }
}

export function transactionIsConfirmed(transaction: SavedTransactionResponse, neededConfirmations: number): boolean {
  if(transaction.blockNumber && transaction.confirmations > neededConfirmations) {
    return true;
  }

  return false;
}

export function transactionIsOld(transaction: SavedTransactionResponse, oldTransactionTime: number): boolean {
  if(new Date().getTime() - transaction.submitTime > oldTransactionTime) {
    return true;
  }

  return false;
}

export async function transactionIsDropped(transaction: SavedTransactionResponse, provider: Provider): Promise<boolean> {
  if(transaction.hash) {
    const transactionReceipt = await provider.getTransactionReceipt(transaction.hash);
    if(transactionReceipt) {
      return true;
    }
  }

  return false;
}

export async function recalculateGasPrice(gasPrice: BigNumber, gasPriceIncrease: number): Promise<BigNumber> {
  const estimatedGasPrice = await estimateGasPrice("fastest");
  if(estimatedGasPrice && gasPrice < estimatedGasPrice) {
    return estimatedGasPrice;
  }

  return new BigNumber(Math.round(gasPrice.toNumber() * gasPriceIncrease));
}
