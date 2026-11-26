// Sitedeki 12 gerçek filmin verisini ve görsellerini TMDB ile OMDb'den çeker (Perde anahtar sunucusu üzerinden;
// anahtar gerekmez). Elle çalıştırılır, çıktılar repoya girer: `node scripts/fetch-films.mjs`
//   src/data/films.json                 ad, özet, tür (TR/EN), yönetmen, oyuncular, puanlar, renk
//   src/assets/films/posters/<id>.jpg   afiş (w780)
//   src/assets/films/backdrops/<id>.jpg yazısız geniş sahne (2560 px)
//   src/assets/films/logos/<id>.png     film logosu (tur penceresi)
// Görseller TMDB'den gelir ve ilgili stüdyolarına aittir; sitenin altında TMDB teşekkürü bulunur.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const KEYS = 'https://perde-keys.kutluhangil.dev';
const IMG = 'https://image.tmdb.org/t/p';
const root = new URL('..', import.meta.url).pathname;

// mood: hero'da hangi temada döner · uhd/subtitles: turdaki örnek dosyanın özellikleri
const list = [
  { tmdb: 693134, mood: 'dark', uhd: true, subtitles: true, audio: 'DDP5.1.Atmos', source: 'WEB-DL' },
  { tmdb: 335984, mood: 'dark', uhd: true, subtitles: true, audio: 'TrueHD.7.1', source: 'BluRay' },
  { tmdb: 313369, mood: 'dark', uhd: true, subtitles: true, audio: 'DTS-HD.MA.7.1', source: 'BluRay' },
  { tmdb: 157336, mood: 'dark', uhd: true, subtitles: false, audio: 'DTS-HD.MA.5.1', source: 'BluRay' },
  { tmdb: 76341, mood: 'light', uhd: true, subtitles: true, audio: 'TrueHD.7.1', source: 'BluRay' },
  { tmdb: 120467, mood: 'light', uhd: false, subtitles: false, audio: 'DTS-HD.MA.5.1', source: 'BluRay' },
  { tmdb: 329865, mood: 'light', uhd: true, subtitles: true, audio: 'DDP5.1', source: 'WEB-DL' },
  { tmdb: 194, mood: 'light', uhd: false, subtitles: true, audio: 'DTS.5.1', source: 'BluRay' },
  { tmdb: 496243, mood: 'dark', uhd: false, subtitles: true, audio: 'DDP5.1', source: 'WEB-DL' },
  { tmdb: 129, mood: 'light', uhd: false, subtitles: true, audio: 'AAC2.0', source: 'BluRay' },
  { tmdb: 331482, mood: 'light', uhd: true, subtitles: false, audio: 'DDP5.1', source: 'WEB-DL' },
  { tmdb: 872585, mood: 'dark', uhd: true, subtitles: true, audio: 'DTS-HD.MA.5.1', source: 'BluRay' },
];

const get = async (url) => {
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url);
    if (res.ok) return res;
    if (res.status !== 429) throw new Error(`${res.status} ${url}`);
    await new Promise((r) => setTimeout(r, 15000));
  }
  throw new Error(`429 ${url}`);
};
const json = async (url) => (await get(url)).json();
const buffer = async (url) => Buffer.from(await (await get(url)).arrayBuffer());
const slug = (s) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const dotted = (s) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[:'’,]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');
const best = (items, lang) =>
  items.filter((i) => i.iso_639_1 === lang).sort((a, b) => b.vote_average - a.vote_average || b.width - a.width)[0];

/** Filmin ortam ışığı: geniş sahnenin en canlı piksellerinin ortalaması, pencere ışığı için parlatılmış. */
async function accent(image) {
  const { data } = await sharp(image).resize(48, 27, { fit: 'cover' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = [];
  for (let i = 0; i < data.length; i += 3) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    px.push({ r, g, b, score: (max - min) * (max / 255) });
  }
  px.sort((a, b) => b.score - a.score);
  const top = px.slice(0, Math.max(8, Math.round(px.length * 0.12)));
  const avg = ['r', 'g', 'b'].map((k) => top.reduce((s, p) => s + p[k], 0) / top.length);
  const k = 210 / Math.max(...avg, 1);
  return `#${avg.map((v) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, '0')).join('')}`;
}

for (const dir of ['posters', 'backdrops', 'logos']) await mkdir(join(root, 'src/assets/films', dir), { recursive: true });

const films = [];
for (const item of list) {
  const en = await json(`${KEYS}/tmdb/movie/${item.tmdb}?language=en-US&append_to_response=credits,images&include_image_language=en,null`);
  const tr = await json(`${KEYS}/tmdb/movie/${item.tmdb}?language=tr-TR`);
  const omdb = en.imdb_id ? await json(`${KEYS}/omdb/?i=${en.imdb_id}`) : {};
  const id = slug(en.title);
  const year = Number(en.release_date.slice(0, 4));

  const backdrop = best(en.images.backdrops, null)?.file_path ?? en.backdrop_path;
  const logo = best(en.images.logos, 'en')?.file_path;
  const poster = best(en.images.posters, 'en')?.file_path ?? en.poster_path;

  await sharp(await buffer(`${IMG}/w780${poster}`)).jpeg({ quality: 86, mozjpeg: true }).toFile(join(root, `src/assets/films/posters/${id}.jpg`));
  const wide = await buffer(`${IMG}/original${backdrop}`);
  await sharp(wide).resize({ width: 2560, withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toFile(join(root, `src/assets/films/backdrops/${id}.jpg`));
  if (logo) await sharp(await buffer(`${IMG}/w500${logo}`)).png().toFile(join(root, `src/assets/films/logos/${id}.png`));

  const tint = await accent(wide);
  const rating = (source) => omdb.Ratings?.find((r) => r.Source === source)?.Value;

  films.push({
    id,
    tmdb: item.tmdb,
    title: { tr: tr.title || en.title, en: en.title },
    year,
    minutes: en.runtime,
    genres: en.genres.slice(0, 2).map((g, i) => ({ tr: tr.genres[i]?.name ?? g.name, en: g.name })),
    summary: { tr: tr.overview || en.overview, en: en.overview },
    director: en.credits.crew.find((c) => c.job === 'Director')?.name ?? '',
    cast: en.credits.cast.slice(0, 3).map((c) => c.name),
    scores: {
      tmdb: Math.round(en.vote_average * 10) / 10,
      imdb: Number(omdb.imdbRating) || 0,
      rt: parseInt(rating('Rotten Tomatoes') ?? '0', 10),
      meta: parseInt(rating('Metacritic') ?? '0', 10),
    },
    file: `${dotted(en.title)}.${year}.${item.uhd ? '2160p' : '1080p'}.${item.source}.${item.audio}.${item.uhd ? 'H265' : 'H264'}.mkv`,
    uhd: item.uhd,
    hdr: item.uhd,
    subtitles: item.subtitles,
    tint,
    mood: item.mood,
    logo: Boolean(logo),
  });
  console.log(`${id}: ${films.at(-1).title.tr} (${year})`);
}

await writeFile(join(root, 'src/data/films.json'), JSON.stringify(films, null, 2) + '\n');
console.log(`films.json: ${films.length} film`);
