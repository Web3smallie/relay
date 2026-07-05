import { bip39 } from "@okxweb3/crypto-lib";
import { EthWallet } from "@okxweb3/coin-ethereum";

export async function createWallet() {
  const wallet = new EthWallet();

  // Generate a new mnemonic (the wallet's recovery phrase)
  const mnemonic = await bip39.generateMnemonic();

  // Derive the wallet's private key from the mnemonic
  const hdPath = await wallet.getDerivedPath({ index: 0 });
  const privateKey = await wallet.getDerivedPrivateKey({ mnemonic, hdPath });

  // Get the public wallet address from the private key
  const newAddress = await wallet.getNewAddress({ privateKey });

  return {
    address: newAddress.address,
    privateKey,
    mnemonic,
  };
}