// Sürüm bilgisi derleme anında GitHub'dan okunur; erişilemezse son bilinen değer kalır.
export const repo = 'kutluhangil/Perde-Releases';
export const releasesPage = `https://github.com/${repo}/releases`;
export const issuesPage = `https://github.com/${repo}/issues`;
export const downloadUrl = (file: string) => `https://github.com/${repo}/releases/latest/download/${file}`;

export type Release = { version: string; date: string; assets: Record<string, number> };

const fallback: Release = { version: '0.1.0', date: '2026-11-25T23:47:00Z', assets: {} };

export async function latestRelease(): Promise<Release> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as {
      tag_name: string;
      published_at: string;
      assets: { name: string; size: number }[];
    };
    return {
      version: json.tag_name.replace(/^v/, ''),
      date: json.published_at,
      assets: Object.fromEntries(json.assets.map((a) => [a.name, a.size])),
    };
  } catch {
    return fallback;
  }
}
