#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { generateImage } from "./image/generator.js";

async function main() {
  const dataPath = process.env.CODEX_WRAPPED_DATA
    ? path.resolve(process.env.CODEX_WRAPPED_DATA)
    : path.resolve("dashboard", "data.json");
  const outputPath = process.env.CODEX_WRAPPED_IMAGE_OUTPUT
    ? path.resolve(process.env.CODEX_WRAPPED_IMAGE_OUTPUT)
    : path.resolve("codex-wrapped.png");

  const raw = await fs.readFile(dataPath, "utf8");
  const data = JSON.parse(raw);

  const pngBuffer = await generateImage(data);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, pngBuffer);

  console.log(`Wrote wrapped image to ${outputPath}`);
}

main().catch((error) => {
  console.error("Failed to render wrapped image:", error);
  process.exit(1);
});
