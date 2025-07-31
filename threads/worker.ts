import { parentPort, workerData } from "worker_threads";
import { searchFile } from "./common";

export function worker() {
  const { keyword, filePath } = workerData;
  const result = searchFile(filePath, keyword);
  parentPort?.postMessage(result);
}
