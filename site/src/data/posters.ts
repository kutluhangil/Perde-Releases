// Afiş ve geniş sahne görselleri film kimliğine göre: src/assets/films/{posters,backdrops}/<id>.jpg (fetch-films.mjs).
import type { ImageMetadata } from 'astro';

type Glob = Record<string, { default: ImageMetadata }>;
const byId = (glob: Glob) =>
  Object.fromEntries(
    Object.entries(glob).map(([path, mod]) => [
      path.split('/').pop()!.replace(/\.\w+$/, '').replace(/^\d+-/, ''),
      mod.default,
    ]),
  );

export const posters = byId(import.meta.glob<{ default: ImageMetadata }>('../assets/films/posters/*.{jpg,png}', { eager: true }));
export const backdrops = byId(
  import.meta.glob<{ default: ImageMetadata }>('../assets/films/backdrops/*.{png,jpg,jpeg,webp}', { eager: true }),
);
