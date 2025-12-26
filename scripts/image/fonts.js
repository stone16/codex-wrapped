import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..", "..");
const fontsDir = path.join(packageRoot, "dashboard", "assets", "fonts");

const FONT_FILES = [
  { file: "IBMPlexMono-Regular.ttf", weight: 400 },
  { file: "IBMPlexMono-Medium.ttf", weight: 500 },
  { file: "IBMPlexMono-Bold.ttf", weight: 700 },
];

export async function loadFonts() {
  return Promise.all(
    FONT_FILES.map(async ({ file, weight }) => ({
      name: "IBM Plex Mono",
      data: await fs.readFile(path.join(fontsDir, file)),
      weight,
      style: "normal",
    }))
  );
}

export function getFontPaths() {
  return FONT_FILES.map(({ file }) => path.join(fontsDir, file));
}
