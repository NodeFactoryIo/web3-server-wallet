# Web3-server-wallet

This repository contains TypeScript implementation of monitor service for transactions on
the ethereum netowork.

# Usage

Install with `yarn add web3-server-wallet` or `npm i web3-server-wallet`

Example of usage:

```typescript
import {ServerWeb3Wallet, TxMonitorService} from "web3-server-wallet";

const wallet = new ServerWeb3Wallet(signingKey, walletStorage, provider);
const monitorService = new TxMonitorService(wallet);
monitorService.start()

wallet.sendTransaction(transactionRequest);
```

Monitor service will automatically check if sent transaction is dropped and resubmit it with
higher gas price and track its progress.

This package requires for [IWalletTransactionStorage](src/@types/wallet.ts) interface to be implemented to store sent transactions.

## License

[MIT](LICENSE)
