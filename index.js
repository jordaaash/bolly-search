import { Permutation } from "js-combinatorics";
import { Worker } from "worker_threads";

const publicKey = "BihkvV2MM8sKspxjM6RzVunnUHtT1prDVXqRzULo6nVA";
const words = [
  "unhappy",
  "reform",
  "twenty",
  "avocado",
  "glad",
  "play",
  "frequent",
  "shift",
  "exhibit",
  "fossil",
  "become",
  "clever",
];
const permutations = new Permutation(words);

// Adjust to the number of cores, but must divide `permutations.length` (479,001,600)
const numWorkers = 8n;
const chunkSize = permutations.length / numWorkers;

const workers = [];
let completedWorkers = 0;

for (let i = 0n; i < numWorkers; i++) {
  const start = i * chunkSize;
  let end = (i + 1n) * chunkSize;
  if (end >= permutations.length) {
    end = permutations.length - 1n;
  }

  const worker = new Worker("./worker.js", {
    workerData: { start, end, words, publicKey },
  });

  worker.on("message", ({ type, value }) => {
    switch (type) {
      case "progress":
        // Log progress only from first worker.
        if (i === 0n) {
          console.log(value);
        }
        break;
      case "error":
        console.log({ type, value });
        process.exit(1);
        break;
      case "found":
        console.log({ type, value });
        process.exit(0);
        break;
      default:
        break;
    }
  });

  worker.on("exit", () => {
    completedWorkers++;
    if (completedWorkers === numWorkers) {
      console.log("All workers have completed their tasks");
      process.exit(0);
    }
  });

  workers.push(worker);
}
