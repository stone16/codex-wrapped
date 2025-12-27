import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { buildWrappedTemplate } from "./template.js";
import { loadFonts, getFontPaths } from "./fonts.js";
import { layout } from "./design-tokens.js";

export async function generateImage(data) {
  const fonts = await loadFonts();
  const scale = layout.scale || 2;
  
  const svg = await satori(buildWrappedTemplate(data), {
    width: layout.canvas.width,
    height: layout.canvas.height,
    fonts,
  });

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: layout.canvas.width * scale,
    },
    font: {
      fontFiles: getFontPaths(),
      loadSystemFonts: false,
    },
  });

  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}
