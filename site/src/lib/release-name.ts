// Dosya adından film bilgisi: uygulamanın ayrıştırıcısının (desktop/lib/core/release_name_parser.dart,
// Swift ReleaseNameParser) TypeScript hâli. Sitede "Nasıl çalışır" bölümünde canlı çalışır.
// Sürüm grubu alanı uygulamada da gösterilmez; burada hiç tutulmaz.

export type ReleaseInfo = {
  title: string;
  year?: number;
  season?: number;
  episode?: number;
  resolution?: '480p' | '720p' | '1080p' | '2160p';
  source?: 'BluRay' | 'WEB-DL' | 'WEB' | 'WEBRip' | 'HDTV' | 'DVD';
  videoCodec?: 'HEVC' | 'H.264' | 'AV1';
  bitDepth?: number;
  audioCodec?: string;
  audioChannels?: string;
  isRepack: boolean;
  languageTag?: string;
};

const mediaExtensions = new Set(['mkv', 'mp4', 'm4v', 'avi', 'mov', 'wmv', 'ts', 'm2ts', 'webm', 'srt', 'ass', 'ssa', 'vtt', 'sub', 'idx', 'sup']);
const bracket = /\[([^\]]*)\]/g;
const bracketWithDash = /\s*-?\s*\[[^\]]*\]/g;
const titleYear = /^(.+?)\s*\((\d{4})\)(.*)$/;
const episodePatterns = [
  /(?:^|[ ._-])S(\d{1,2})[ ._-]?E(\d{1,3})(?:[ ._-]?E\d{1,3})?(?=$|[ ._-])/i,
  /(?:^|[ ._-])(\d{1,2})x(\d{2,3})(?=$|[ ._-])/i,
];
const audioPattern = /^(aac|ddp|dd|ac3|eac3|truehd|dts-hd|dtshd|dts|flac|opus|atmos)(\d\.\d)?$/;
const channelsPattern = /^\d\.\d$/;
const languagesPattern = /^[A-Z]{3}(-[A-Z]{3})+$/;
const resolutionOrder = ['480p', '720p', '1080p', '2160p'] as const;

const resolutionOf = (t: string): ReleaseInfo['resolution'] =>
  t === '2160p' || t === '4k' || t === 'uhd' ? '2160p' : t === '1080p' ? '1080p' : t === '720p' ? '720p' : t === '480p' || t === '576p' ? '480p' : undefined;

const sourceOf = (t: string): ReleaseInfo['source'] => {
  if (['bluray', 'brrip', 'bdrip', 'bdremux', 'remux'].includes(t)) return 'BluRay';
  if (t === 'web-dl' || t === 'webdl') return 'WEB-DL';
  if (t === 'webrip') return 'WEBRip';
  if (t === 'web') return 'WEB';
  if (t === 'hdtv') return 'HDTV';
  if (t === 'dvdrip' || t === 'dvd') return 'DVD';
  return undefined;
};

const codecOf = (t: string): ReleaseInfo['videoCodec'] =>
  ['x265', 'h265', 'hevc'].includes(t) ? 'HEVC' : ['x264', 'h264', 'avc'].includes(t) ? 'H.264' : t === 'av1' ? 'AV1' : undefined;

const audioName = (t: string) =>
  t === 'ddp' || t === 'eac3' ? 'E-AC-3' : t === 'dd' || t === 'ac3' ? 'AC-3' : t === 'truehd' ? 'TrueHD' : t === 'dts-hd' || t === 'dtshd' ? 'DTS-HD' : t.toUpperCase();

const isTechnical = (token: string) => {
  const t = token.toLowerCase();
  return Boolean(resolutionOf(t) || sourceOf(t) || codecOf(t)) || ['10bit', '8bit', 'repack', 'proper'].includes(t);
};

const strictInt = (s: string) => (/^\d+$/.test(s) ? Number(s) : undefined);
const isYear = (n: number) => n >= 1900 && n <= 2035;

class Tags {
  info: Omit<ReleaseInfo, 'title'> = { isRepack: false };

  absorbBracket(content: string) {
    content
      .trim()
      .split(' ')
      .filter(Boolean)
      .forEach((t) => this.absorb(t));
  }

  absorb(token: string) {
    const t = token.toLowerCase();
    const i = this.info;
    const r = resolutionOf(t);
    if (r) {
      if (!i.resolution || resolutionOrder.indexOf(r) > resolutionOrder.indexOf(i.resolution)) i.resolution = r;
      return;
    }
    const s = sourceOf(t);
    if (s) return void (i.source ??= s);
    const c = codecOf(t);
    if (c) return void (i.videoCodec ??= c);
    if (t === '10bit') return void (i.bitDepth = 10);
    if (t === '8bit') return void (i.bitDepth = 8);
    if (t === 'repack' || t === 'proper') return void (i.isRepack = true);
    const audio = audioPattern.exec(t);
    if (audio) {
      i.audioCodec ??= audioName(audio[1]);
      if (audio[2]) i.audioChannels = audio[2];
      return;
    }
    if (channelsPattern.test(t)) return void (i.audioChannels ??= t);
    if (languagesPattern.test(token)) i.languageTag = token;
  }

  result(title: string, year?: number): ReleaseInfo {
    return { title, ...(year ? { year } : {}), ...this.info };
  }
}

/** "5.1", "2.0" ve "H.264" bütün kalır; nokta, alt çizgi ve boşlukta bölünür. */
export function tokenize(text: string): string[] {
  return text
    .replace(/\bH\.26([45])/gi, 'H26$1')
    .replace(/(?<!\d)(\d)\.(\d)(?!\d)/g, '$1§$2')
    .split(/[. _]/)
    .map((t) => t.replaceAll('§', '.'))
    .filter((t) => t && t !== '-');
}

function trimChars(text: string, chars: string) {
  let start = 0;
  let end = text.length;
  while (start < end && chars.includes(text[start])) start++;
  while (end > start && chars.includes(text[end - 1])) end--;
  return text.slice(start, end);
}

const clean = (title: string) => trimChars(title.replaceAll('§', '.'), ' -_.').replace(/\s{2,}/g, ' ');

function stripExtension(name: string) {
  const dot = name.lastIndexOf('.');
  return dot > 0 && mediaExtensions.has(name.slice(dot + 1).toLowerCase()) ? name.slice(0, dot) : name;
}

export function episodeMarker(name: string) {
  for (const pattern of episodePatterns) {
    const m = pattern.exec(name);
    if (!m) continue;
    const season = strictInt(m[1]);
    const episode = strictInt(m[2]);
    if (season === undefined || episode === undefined) continue;
    return { start: m.index, end: m.index + m[0].length, season, episode };
  }
  return undefined;
}

/** "Ad (Yıl) [etiketler]" ya da noktalı "Ad.Yıl.etiketler" biçimindeki bir adı çözer. */
export function parseReleaseName(rawName: string): ReleaseInfo {
  let name = stripExtension(rawName);
  const tags = new Tags();
  for (const m of name.matchAll(bracket)) tags.absorbBracket(m[1]);
  name = name.replace(bracketWithDash, ' ');

  const marker = episodeMarker(name);
  if (marker) {
    tokenize(name.slice(marker.end)).forEach((t) => tags.absorb(t));
    const titleTokens = tokenize(name.slice(0, marker.start).replace(/[()]/g, ' '));
    let year: number | undefined;
    const last = titleTokens.length > 1 ? strictInt(titleTokens.at(-1)!) : undefined;
    if (last !== undefined && isYear(last)) {
      year = last;
      titleTokens.pop();
    }
    return { ...tags.result(clean(titleTokens.join(' ')), year), season: marker.season, episode: marker.episode };
  }

  const m = titleYear.exec(name);
  if (m) {
    tokenize(m[3]).forEach((t) => tags.absorb(t));
    return tags.result(clean(m[1]), Number(m[2]));
  }

  const tokens = tokenize(name);
  if (!tokens.length) return tags.result(clean(rawName));
  const technical = tokens.findIndex(isTechnical);
  const techIndex = technical < 0 ? tokens.length : technical;
  let yearIndex: number | undefined;
  for (let i = techIndex - 1; i > 0; i--) {
    const value = strictInt(tokens[i]);
    if (value !== undefined && isYear(value)) {
      yearIndex = i;
      break;
    }
  }
  const titleEnd = yearIndex ?? techIndex;
  tokens.slice(yearIndex === undefined ? titleEnd : yearIndex + 1).forEach((t) => tags.absorb(t));
  const title = tokens.slice(0, Math.max(1, titleEnd)).join(' ');
  return tags.result(clean(title), yearIndex === undefined ? undefined : Number(tokens[yearIndex]));
}

export type TokenKind = 'title' | 'year' | 'episode' | 'resolution' | 'source' | 'codec' | 'audio' | 'other';

/** Adın parçalarını sitede renklendirmek için sınıflar (ayrıştırmanın kendisi parseReleaseName'de). */
export function classifyTokens(rawName: string): { text: string; kind: TokenKind }[] {
  const info = parseReleaseName(rawName);
  const name = stripExtension(rawName)
    .replace(bracketWithDash, (m) => ` ${m.replace(/[[\]-]/g, ' ')} `)
    .replace(/[()]/g, ' ');
  const titleWords = new Set(info.title.toLowerCase().split(' '));
  let titleDone = false;
  return tokenize(name).map((text) => {
    const t = text.toLowerCase();
    let kind: TokenKind = 'other';
    if (!titleDone && titleWords.has(t)) kind = 'title';
    else if (info.year !== undefined && t === String(info.year)) kind = 'year';
    else if (/^s\d{1,2}e\d{1,3}$/.test(t) || /^\d{1,2}x\d{2,3}$/.test(t)) kind = 'episode';
    else if (resolutionOf(t)) kind = 'resolution';
    else if (sourceOf(t)) kind = 'source';
    else if (codecOf(t)) kind = 'codec';
    else if (audioPattern.test(t) || channelsPattern.test(t)) kind = 'audio';
    if (kind !== 'title') titleDone = true;
    return { text, kind };
  });
}
