import axios from "axios";
import {BigNumber, parseUnits} from "ethers/utils";
import {SavedTransactionResponse} from "./@types/wallet";
import {TransactionResponse} from "ethers/providers";
import {logger} from "./logger";

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
    if(process.env.GAS_STATION_API_KEY) {
      const response = await axios.get(
        GAS_PRICE_API,
        {
          params: {
            "api-key": process.env.GAS_STATION_API_KEY
          }
        }
      )
      const gasPrice = response.data[gasPriceOption];
      return parseUnits((gasPrice * 10).toString(), "gwei");
    }
  } catch(error) {
    logger("Gas station api not available.");
    return;
  }
}

export function transactionIsConfirmed(transaction: TransactionResponse, neededConfirmations: number): boolean {
  if(
    transaction &&
    transaction.blockNumber &&
    transaction.confirmations > neededConfirmations
  ) {
    return true;
  }

  return false;
}

export function transactionIsOld(
  transaction: SavedTransactionResponse,
  transactionTimeout: number
): boolean {
  if(new Date().getTime() - transaction.submitTime > transactionTimeout) {
    return true;
  }

  return false;
}

export function transactionNotInBlock(transaction: TransactionResponse): boolean {
  if(transaction && transaction.blockNumber) {
    return false;
  }

  return true;
}

export async function recalculateGasPrice(
  gasPrice: BigNumber,
  gasPriceIncrease: number,
): Promise<BigNumber> {
  const estimatedGasPrice = await estimateGasPrice("fastest");
  if(estimatedGasPrice && gasPrice < estimatedGasPrice) {
    return estimatedGasPrice;
  }

  return new BigNumber(Math.round(gasPrice.toNumber() * gasPriceIncrease));
}
