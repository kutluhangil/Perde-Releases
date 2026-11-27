// Hero heykeli: turdaki afişlerden saydam zeminli bir yelpaze. `npm run build` öncesinde kendiliğinden çalışır.
//   public/hero/fan-wide.webp  geniş ekran, yedi afiş (2.4:1)
//   public/hero/fan-tall.webp  telefon, üç afiş
// Parçacık motoru (src/scripts/liquid-engine.ts) saydam görselin her dolu pikselinden bir parçacık üretir.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const root = new URL('..', import.meta.url).pathname;
const posters = join(root, 'src/assets/films/posters');
const out = join(root, 'public/hero');
await mkdir(out, { recursive: true });

async function card(id, h, angle) {
  const w = Math.round((h * 2) / 3);
  const r = Math.round(h * 0.022);
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}"/></svg>`);
  const rounded = await sharp(join(posters, `${id}.jpg`))
    .resize(w, h, { fit: 'cover' })
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  const { data, info } = await sharp(rounded)
    .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

async function fan(file, W, H, ids, { height, spread, tilt, drop, shrink }) {
  const mid = (ids.length - 1) / 2;
  const order = ids.map((id, i) => ({ id, k: i - mid })).sort((a, b) => Math.abs(b.k) - Math.abs(a.k));
  const layers = [];
  for (const { id, k } of order) {
    const c = await card(id, Math.round(height * (1 - shrink * Math.abs(k))), tilt * k);
    const cx = W / 2 + k * spread * (1 - 0.03 * Math.abs(k));
    const cy = H / 2 + drop * k * k;
    layers.push({ input: c.data, left: Math.round(cx - c.w / 2), top: Math.round(cy - c.h / 2) });
  }
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers)
    .webp({ quality: 84, alphaQuality: 90 })
    .toFile(join(out, file));
}

await fan('fan-wide.webp', 2640, 1100, ['amelie', 'la-la-land', 'blade-runner-2049', 'dune-part-two', 'interstellar', 'parasite', 'spirited-away'], {
  height: 820,
  spread: 340,
  tilt: 6.5,
  drop: 16,
  shrink: 0.08,
});
await fan('fan-tall.webp', 1160, 1100, ['blade-runner-2049', 'dune-part-two', 'interstellar'], {
  height: 760,
  spread: 250,
  tilt: 9,
  drop: 40,
  shrink: 0.1,
});
console.log('hero-art: 2 görsel');
