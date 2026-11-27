// Başlığı HTML'e çevirir: `part` Instrument Serif italik yazılır, `\n` ayrı satır olur. Metin kaçışlanır.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function accent(text: string, part = ''): string {
  const lines = text.split('\n');
  return lines
    .map((line) => {
      const i = part ? line.indexOf(part) : -1;
      const html = i < 0 ? esc(line) : `${esc(line.slice(0, i))}<span class="accent">${esc(part)}</span>${esc(line.slice(i + part.length))}`;
      return lines.length > 1 ? `<span class="line">${html}</span>` : html;
    })
    .join('');
}
