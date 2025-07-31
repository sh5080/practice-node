import * as fs from "fs";
import * as path from "path";
import { getAllFiles, searchFile } from "./common";

const [, , keyword, targetPath] = process.argv;

if (!keyword || !targetPath) {
  console.error("Usage: dgrep {keyword} {relative path}");
  process.exit(1);
}

function dgrep(keyword: string, targetPath: string) {
  const absPath = path.resolve(process.cwd(), targetPath);
  const stat = fs.statSync(absPath);

  let files: string[] = stat.isFile() ? [absPath] : getAllFiles(absPath);

  for (const file of files) {
    const result = searchFile(file, keyword);
    if (result) console.log(result);
  }
}

dgrep(keyword, targetPath);
