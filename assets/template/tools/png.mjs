// Tiny PNG helpers (pure JS): read, write, resize (bilinear), compare.
import fs from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

export const readPng = (p) => PNG.sync.read(fs.readFileSync(p));
export const writePng = (p, png) => fs.writeFileSync(p, PNG.sync.write(png));

export function resize(src, w, h) {
  if (src.width === w && src.height === h) return src;
  const out = new PNG({ width: w, height: h });
  const sx = src.width / w, sy = src.height / h;
  for (let y = 0; y < h; y++) {
    const fy = Math.min(src.height - 1, (y + 0.5) * sy - 0.5), y0 = Math.max(0, Math.floor(fy)), y1 = Math.min(src.height - 1, y0 + 1), ty = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(src.width - 1, (x + 0.5) * sx - 0.5), x0 = Math.max(0, Math.floor(fx)), x1 = Math.min(src.width - 1, x0 + 1), tx = fx - x0;
      for (let c = 0; c < 4; c++) {
        const a = src.data[(y0 * src.width + x0) * 4 + c], b = src.data[(y0 * src.width + x1) * 4 + c];
        const d = src.data[(y1 * src.width + x0) * 4 + c], e = src.data[(y1 * src.width + x1) * 4 + c];
        out.data[(y * w + x) * 4 + c] = Math.round((a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty);
      }
    }
  }
  return out;
}

/** Compare two PNGs (b is resized to a). Returns mismatch ratio and writes a diff image. */
export function compare(a, b, diffPath, { threshold = 0.12, ignoreCorners = 0 } = {}) {
  const bb = resize(b, a.width, a.height);
  const diff = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, bb.data, diff.data, a.width, a.height, { threshold, includeAA: false });
  let ignored = 0;
  if (ignoreCorners) {
    // don't count rounded-corner pixels (video frames are clipped, screenshots aren't)
    const r = ignoreCorners;
    for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
      const cx = x < r ? r : x >= a.width - r ? a.width - r : x, cy = y < r ? r : y >= a.height - r ? a.height - r : y;
      if ((x - cx) ** 2 + (y - cy) ** 2 > (r - 2) ** 2) {
        const i = (y * a.width + x) * 4;
        if (diff.data[i] === 255 && diff.data[i + 1] === 0) ignored++;
      }
    }
  }
  if (diffPath) writePng(diffPath, diff);
  return { ratio: Math.max(0, n - ignored) / (a.width * a.height), pixels: n - ignored };
}

/** Luma statistics, used to spot blank frames. */
export function lumaStats(png) {
  let sum = 0, sq = 0, n = 0;
  for (let i = 0; i < png.data.length; i += 16) {
    const l = 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2];
    sum += l; sq += l * l; n++;
  }
  const mean = sum / n;
  return { mean, std: Math.sqrt(Math.max(0, sq / n - mean * mean)) };
}

export function crop(src, x, y, w, h) {
  const out = new PNG({ width: w, height: h });
  for (let row = 0; row < h; row++) src.data.copy(out.data, row * w * 4, ((y + row) * src.width + x) * 4, ((y + row) * src.width + x + w) * 4);
  return out;
}
