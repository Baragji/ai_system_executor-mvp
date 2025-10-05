import { createHash } from "node:crypto";
import fs from "node:fs/promises";

export async function fileSha256(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const hash = createHash("sha256");
  hash.update(buffer);
  return hash.digest("hex");
}
