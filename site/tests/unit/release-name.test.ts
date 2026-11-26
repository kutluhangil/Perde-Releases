// Uygulamanın altın vakaları (Packages/PerdeKit/Tests/PerdeCoreTests/Fixtures/golden-core.json) ile aynı sonuç.
// Perde-Releases kopyasında fixture yoksa test atlanır.
import { existsSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseReleaseName } from '../../src/lib/release-name.ts';
import { films } from '../../src/data/films.ts';

const fixture = new URL('../../../Packages/PerdeKit/Tests/PerdeCoreTests/Fixtures/golden-core.json', import.meta.url);

test('golden-core.json adları', { skip: !existsSync(fixture) }, () => {
  const golden = JSON.parse(readFileSync(fixture, 'utf8')) as { names: Record<string, Record<string, unknown>> };
  for (const [name, expected] of Object.entries(golden.names)) {
    const { releaseGroup: _group, ...want } = expected;
    assert.deepEqual(parseReleaseName(name), want, name);
  }
});

test('turdaki 12 filmin dosya adı kendi adına ve yılına çözülür', () => {
  for (const f of films) {
    const info = parseReleaseName(f.file);
    assert.equal(info.year, f.year, f.file);
    assert.equal(info.resolution, f.uhd ? '2160p' : f.file.includes('720p') ? '720p' : '1080p', f.file);
  }
});

test('dizi bölümü', () => {
  const info = parseReleaseName('Gece.Nobeti.2024.S01E03.1080p.WEB-DL.DDP5.1.H264.mkv');
  assert.equal(info.title, 'Gece Nobeti');
  assert.equal(info.season, 1);
  assert.equal(info.episode, 3);
});
