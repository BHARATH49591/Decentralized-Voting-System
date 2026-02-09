require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "5777"
    },
    sepolia: {
      provider: () => new HDWalletProvider({
        privateKeys: [process.env.PRIVATE_KEY],
        providerOrUrl: process.env.SEPOLIA_RPC_URL,
        pollingInterval: 15000
      }),
      network_id: 11155111,
      gas: 4000000,
      gasPrice: 20000000000, // 20 Gwei
      confirmations: 1,
      timeoutBlocks: 500,
      networkCheckTimeout: 1000000,
      skipDryRun: true
    }
  },
  compilers: {
    solc: {
      version: "0.8.0",
    }
  }
}
