// Sitedeki 12 gerçek film: veri ve görseller TMDB/OMDb'den, scripts/fetch-films.mjs ile (films.json).
// Saf veri: Astro sayfaları ve scripts/tour-assets.mjs (Node) birlikte okur.
import data from './films.json' with { type: 'json' };

type Text = { tr: string; en: string };

export type Film = {
  id: string;
  tmdb: number;
  title: Text;
  year: number;
  minutes: number;
  genres: Text[];
  summary: Text;
  director: string;
  cast: string[];
  /** OMDb Rotten Tomatoes vermeyince rt 0: sitede gösterilmez. */
  scores: { tmdb: number; imdb: number; rt: number; meta: number };
  file: string;
  uhd: boolean;
  hdr: boolean;
  subtitles: boolean;
  /** Filmin ortam ışığı: pencerenin ve vitrinin rengi. */
  tint: string;
  /** Hero'da hangi temada döner. */
  mood: 'dark' | 'light';
  logo: boolean;
};

export const films = data as Film[];
export const film = (id: string) => films.find((f) => f.id === id)!;
