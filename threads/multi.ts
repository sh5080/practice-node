import * as fs from "fs";
import * as path from "path";
import { Worker } from "worker_threads";
import { getAllFiles } from "./common";

const [, , keyword, targetPath] = process.argv;

if (!keyword || !targetPath) {
  console.error("Usage: dgrep {keyword} {relative path}");
  process.exit(1);
}

function dgrepParallel(keyword: string, targetPath: string) {
  const absPath = path.resolve(process.cwd(), targetPath);
  const stat = fs.statSync(absPath);

  const files = stat.isFile() ? [absPath] : getAllFiles(absPath);
  let completed = 0;

  for (const filePath of files) {
    const worker = new Worker("./worker.js", {
      workerData: { filePath, keyword },
    });

    worker.on("message", (result) => {
      if (result) console.log(result + "\n");
    });

    worker.on("error", (err) => {
      console.error(`Worker error on ${filePath}: ${err}`);
    });

    worker.on("exit", () => {
      completed++;
      if (completed === files.length) {
        // All work done
      }
    });
  }
}

dgrepParallel(keyword, targetPath);
