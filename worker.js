import { mnemonicToSeed, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import bs58 from "bs58";
import { HDKey } from "ed25519-keygen/hdkey";
import { Permutation } from "js-combinatorics";
import { parentPort, workerData } from "worker_threads";

const publicKey = bs58.decode(workerData.publicKey);
const permutations = new Permutation(workerData.words);

function bytesEqual(a, b) {
  if (a.length != b.length) return false;
  for (let i = a.length; -1 < i; --i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

for (let i = workerData.start; i < workerData.end; i++) {
  parentPort.postMessage({ type: "progress", value: i });

  try {
    const permutation = permutations.at(i);
    const mnemonic = permutation.join(" ");

    if (validateMnemonic(mnemonic, wordlist)) {
      (async function () {
        const seed = await mnemonicToSeed(mnemonic);
        const hdkey = HDKey.fromMasterSeed(seed);

        const rootKey = hdkey.derive("m/44'/501'");
        if (bytesEqual(rootKey.publicKeyRaw, publicKey)) {
          parentPort.postMessage({
            type: "found",
            value: { mnemonic, key: "root" },
          });
          return;
        }

        const walletKey = hdkey.derive("m/44'/501'/0'/0'");
        if (bytesEqual(walletKey.publicKeyRaw, publicKey)) {
          parentPort.postMessage({
            type: "found",
            value: { mnemonic, key: "wallet" },
          });
          return;
        }

        const ledgerKey = hdkey.derive("m/44'/501'/0'");
        if (bytesEqual(ledgerKey.publicKeyRaw, publicKey)) {
          parentPort.postMessage({
            type: "found",
            value: { mnemonic, key: "ledger" },
          });
          return;
        }
      })();
    }
  } catch (error) {
    parentPort.postMessage({
      type: "error",
      value: { error: String(error) },
    });
  }
}
