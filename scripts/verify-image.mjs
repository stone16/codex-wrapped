#!/usr/bin/env node

import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { generateImage } from "./image/generator.js";
import { layout } from "./image/design-tokens.js";

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".ttf": "font/ttf",
  ".png": "image/png",
};

function createServer(dashboardDir, data) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const requestPath = url.pathname === "/" ? "index.html" : url.pathname;
    const relativePath = path.normalize(requestPath).replace(/^([/\\])+/, "");
    const dashboardRoot = path.resolve(dashboardDir);
    const filePath = path.resolve(dashboardRoot, relativePath);

    if (filePath !== dashboardRoot && !filePath.startsWith(`${dashboardRoot}${path.sep}`)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    // Intercept data.json to serve our test data
    if (url.pathname === "/data.json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
      return;
    }

    try {
      const content = await fs.readFile(filePath);
      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
}

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
  const threshold = Number(process.env.CODEX_WRAPPED_VERIFY_THRESHOLD ?? "0.10");

  const dashboardDir = path.dirname(htmlPath);

  await fs.mkdir(outputDir, { recursive: true });

  const raw = await fs.readFile(dataPath, "utf8");
  const data = JSON.parse(raw);

  const satoriBuffer = await generateImage(data);
  const satoriPath = path.join(outputDir, "wrapped-satori.png");
  await fs.writeFile(satoriPath, satoriBuffer);

  // Start local HTTP server to serve the dashboard
  const server = createServer(dashboardDir, data);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Use htmlViewport for comparison (larger viewport to avoid responsive breakpoints)
  const viewportWidth = layout.htmlViewport?.width || 1200;
  const viewportHeight = layout.htmlViewport?.height || 968;
  const scale = layout.scale || 2;

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: viewportWidth, height: viewportHeight },
    deviceScaleFactor: scale, // Match Satori's scale for comparison
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });

  // Wait for the dashboard to fully render by checking for key elements
  await page.waitForSelector("#year:not(:empty)", { timeout: 10000 });
  await page.waitForSelector("#stat-sessions:not(:empty)", { timeout: 10000 });
  await page.waitForSelector(".heatmap-cell", { timeout: 10000 });

  // Give a small delay for any final rendering
  await page.waitForTimeout(500);

  // Add export mode class and disable animations
  await page.evaluate(() => {
    document.querySelector(".wrap").classList.add("export-mode");
  });
  await page.addStyleTag({ 
    content: "* { animation: none !important; transition: none !important; } [data-reveal] { opacity: 1 !important; transform: none !important; }" 
  });

  // Screenshot just the .wrap element (card only)
  const wrapElement = await page.$(".wrap");
  const htmlPathOut = path.join(outputDir, "wrapped-html.png");
  await wrapElement.screenshot({
    path: htmlPathOut,
  });

  await browser.close();
  server.close();

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
