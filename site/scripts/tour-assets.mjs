// Tur penceresinin (public/tour/) görselleri ve film verisi. `npm run build` öncesinde kendiliğinden çalışır.
//   p-<id>.webp  afiş, 360 px
//   w-<id>.webp  geniş kadraj (TMDB'nin yazısız geniş sahnesi)
//   l-<id>.webp  film logosu
//   films.js     window.PERDE_FILMS (src/data/films.ts'den)
//   fonts/       film logolarının yazı tipleri (kendi sunucumuzdan; Google Fonts'a istek gitmez)
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { films } from '../src/data/films.ts';

const root = new URL('..', import.meta.url).pathname;
const posterDir = join(root, 'src/assets/films/posters');
const backdropDir = join(root, 'src/assets/films/backdrops');
const logoDir = join(root, 'src/assets/films/logos');
const out = join(root, 'public/tour/img');
await mkdir(out, { recursive: true });

const posterFiles = await readdir(posterDir);
const backdropFiles = await readdir(backdropDir);
const find = (files, id) => files.find((f) => f.replace(/\.\w+$/, '').replace(/^\d+-/, '') === id);

for (const film of films) {
  const poster = join(posterDir, find(posterFiles, film.id));
  await sharp(poster).resize({ width: 360 }).webp({ quality: 74 }).toFile(join(out, `p-${film.id}.webp`));

  await sharp(join(backdropDir, find(backdropFiles, film.id)))
    .resize({ width: 1600, height: 900, fit: 'cover', position: 'attention' })
    .webp({ quality: 74 })
    .toFile(join(out, `w-${film.id}.webp`));
  if (film.logo) await sharp(join(logoDir, `${film.id}.png`)).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 86 }).toFile(join(out, `l-${film.id}.webp`));
}

const data = films.map(({ tmdb, ...f }) => f);
// Önbellek: veri değişince adres değişir (index.html'deki films.js?v=… ve Tour.astro'daki iframe adresi aynı özeti kullanır)
const version = createHash('sha1').update(JSON.stringify(films)).digest('hex').slice(0, 8);
const page = join(root, 'public/tour/index.html');
await writeFile(page, (await readFile(page, 'utf8')).replace(/src="films\.js(\?v=\w+)?"/, `src="films.js?v=${version}"`));
await writeFile(
  join(root, 'public/tour/films.js'),
  `// Üretildi: scripts/tour-assets.mjs (kaynak src/data/films.ts). Elle düzenleme.\nwindow.PERDE_FILMS = ${JSON.stringify(data)};\n`,
);
// Logo yazı tipleri: latin + latin-ext (Türkçe ı, ş, ğ)
const fontDir = join(root, 'public/tour/fonts');
await mkdir(fontDir, { recursive: true });
const ext = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
const latin = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const faces = [
  ['Anton', '@fontsource/anton', 'anton', 400],
  ['Cinzel', '@fontsource/cinzel', 'cinzel', 600],
  ['DM Serif Display', '@fontsource/dm-serif-display', 'dm-serif-display', 400],
  ['Syne', '@fontsource/syne', 'syne', 800],
  ['Italiana', '@fontsource/italiana', 'italiana', 400],
];
let css = '';
for (const [family, pkg, slug, weight] of faces) {
  for (const [subset, range] of [['latin-ext', ext], ['latin', latin]]) {
    const file = `${slug}-${subset}-${weight}-normal.woff2`;
    const src = join(root, 'node_modules', pkg, 'files', file);
    if (!existsSync(src)) continue; // Italiana'nın latin-ext'i yok: Türkçe harfli adlarda kullanılmaz
    await copyFile(src, join(fontDir, file));
    css += `@font-face{font-family:'${family}';font-weight:${weight};font-display:swap;src:url(${file}) format('woff2');unicode-range:${range}}\n`;
  }
}
for (const [subset, range] of [['latin-ext', ext], ['latin', latin]]) {
  const file = `bodoni-moda-${subset}-wght-normal.woff2`;
  await copyFile(join(root, 'node_modules/@fontsource-variable/bodoni-moda/files', file), join(fontDir, file));
  css += `@font-face{font-family:'Bodoni Moda';font-weight:400 900;font-display:swap;src:url(${file}) format('woff2');unicode-range:${range}}\n`;
}
await writeFile(join(fontDir, 'fonts.css'), css);

console.log(`tour-assets: ${films.length} film, ${faces.length + 1} yazı tipi`);
