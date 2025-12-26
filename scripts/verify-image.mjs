#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { generateImage } from "./image/generator.js";
import { layout } from "./image/design-tokens.js";

async function main() {
  const dataPath = process.env.CODEX_WRAPPED_DATA
    ? path.resolve(process.env.CODEX_WRAPPED_DATA)
    : path.resolve("dashboard", "data.json");
  const htmlPath = process.env.CODEX_WRAPPED_HTML
    ? path.resolve(process.env.CODEX_WRAPPED_HTML)
    : path.resolve("dashboard", "index.html");
  const outputDir = process.env.CODEX_WRAPPED_VERIFY_OUTPUT
    ? path.resolve(process.env.CODEX_WRAPPED_VERIFY_OUTPUT)
    : path.resolve("test-output", "image-verify");
  const threshold = Number(process.env.CODEX_WRAPPED_VERIFY_THRESHOLD ?? "0.01");

  await fs.mkdir(outputDir, { recursive: true });

  const raw = await fs.readFile(dataPath, "utf8");
  const data = JSON.parse(raw);

  const satoriBuffer = await generateImage(data);
  const satoriPath = path.join(outputDir, "wrapped-satori.png");
  await fs.writeFile(satoriPath, satoriBuffer);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: layout.canvas.width, height: layout.canvas.height },
    deviceScaleFactor: 1,
  });

  await page.route("**/data.json", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });

  await page.goto(pathToFileURL(htmlPath).toString(), { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "* { animation: none !important; transition: none !important; }" });

  const htmlPathOut = path.join(outputDir, "wrapped-html.png");
  await page.screenshot({
    path: htmlPathOut,
    clip: { x: 0, y: 0, width: layout.canvas.width, height: layout.canvas.height },
  });

  await browser.close();

  const htmlPng = PNG.sync.read(await fs.readFile(htmlPathOut));
  const satoriPng = PNG.sync.read(satoriBuffer);

  if (htmlPng.width !== satoriPng.width || htmlPng.height !== satoriPng.height) {
    throw new Error(
      `Image size mismatch: html ${htmlPng.width}x${htmlPng.height}, satori ${satoriPng.width}x${satoriPng.height}`
    );
  }

  const diff = new PNG({ width: htmlPng.width, height: htmlPng.height });
  const diffPixels = pixelmatch(htmlPng.data, satoriPng.data, diff.data, htmlPng.width, htmlPng.height, {
    threshold: 0.1,
  });
  const diffRatio = diffPixels / (htmlPng.width * htmlPng.height);
  const diffPath = path.join(outputDir, "wrapped-diff.png");
  await fs.writeFile(diffPath, PNG.sync.write(diff));

  console.log(`HTML screenshot: ${htmlPathOut}`);
  console.log(`Satori image: ${satoriPath}`);
  console.log(`Diff image: ${diffPath}`);
  console.log(`Diff ratio: ${(diffRatio * 100).toFixed(2)}% (threshold ${(threshold * 100).toFixed(2)}%)`);

  if (diffRatio > threshold) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Image verification failed:", error);
  process.exit(1);
});
