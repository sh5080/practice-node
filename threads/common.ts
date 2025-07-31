import * as fs from "fs";
import * as path from "path";

/**
 * 파일 내 keyword 검색
 */
export function searchFile(filePath: string, keyword: string): string {
  const content = fs.readFileSync(filePath, "utf8");
  return content
    .split("\n")
    .map((line, idx) =>
      line.includes(keyword) ? `${filePath}:${idx + 1}: ${line}` : null
    )
    .filter(Boolean)
    .join("\n");
}

/**
 * 디렉토리 내 모든 파일 재귀 탐색
 */
export function getAllFiles(dir: string): string[] {
  let results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}
