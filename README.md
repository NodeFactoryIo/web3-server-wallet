# Web3-server-wallet

This repository contains TypeScript implementation of monitor service for transactions on
the ethereum netowork.

# Usage

Install with `yarn add web3-server-wallet` or `npm i web3-server-wallet`

Example of usage:

```typescript
import {ServerWeb3Wallet, TxMonitorService} from "web3-server-wallet";

const wallet = await ServerWeb3Wallet.create(walletSource, walletStorage);
const monitorService = new TxMonitorService(wallet);
monitorService.start()

wallet.sendTransaction(transactionRequest);
```

Monitor service will automatically check if sent transaction is dropped and resubmit it with
higher gas price and track its progress.

This package requires for [IWalletTransactionStorage](src/@types/wallet.ts) and [IWalletSourceStorage](src/@types/wallets.ts) interface to be implemented to store sent transactions and available wallets.

### Gas Price
This package uses [eth gas station api](https://www.ethgasstation.info/) by default and GAS_STATION_API_KEY should be in process.env for it to work.
It will fallback to provider.estimateGasPrice if gas station estimation does not work.

## License

[MIT](LICENSE)
