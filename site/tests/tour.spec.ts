import { expect, test, type Page } from '@playwright/test';

const tourFrame = (page: Page) => page.frameLocator('#tur iframe');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('perde-curtain', '1'));
});

test('tur yüklenir, bölümler ve sistem seçici pencereyi değiştirir', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto('/tr/');
  await page.locator('#tur').scrollIntoViewIfNeeded();
  const frame = tourFrame(page);
  await expect(frame.locator('#win')).toBeVisible();

  await page.locator('[data-chapter="kutuphane"]').click();
  await expect(frame.locator('#v-grid')).toBeVisible();
  await expect(frame.locator('#v-grid .pc')).toHaveCount(12);
  await expect(page.locator('[data-chapter-name]')).toHaveText('Kütüphane');

  await page.locator('[data-chapter="oynatici"]').click();
  await expect(frame.locator('.player')).toBeVisible();

  await page.locator('[data-chapter="duzen"]').click();
  await expect(frame.locator('.crow2.done').first()).toBeVisible({ timeout: 6000 });

  await page.locator('.os [data-os="windows"]').click();
  await expect(frame.locator('#win')).toHaveAttribute('data-os', 'windows');
  await expect(frame.locator('.caption')).toBeVisible();

  await page.locator('[data-chapter="geribildirim"]').click();
  await expect(frame.locator('.fbtext')).toBeVisible();

  expect(errors).toEqual([]);
});

test('İngilizce turda metinler çevrilir', async ({ page }) => {
  await page.goto('/en/');
  await page.locator('#tur').scrollIntoViewIfNeeded();
  const frame = tourFrame(page);
  await page.locator('[data-chapter="film"]').click();
  await expect(frame.locator('.dinfo .logo img')).toHaveAttribute('alt', 'Dune: Part Two');
});

test('Windows ve Linux: pencere düğmeleri üstte, araç hapı onların altında (plan 31)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Masaüstü penceresi');
  await page.goto('/tr/');
  await page.locator('#tur').scrollIntoViewIfNeeded();
  const frame = tourFrame(page);
  await expect(frame.locator('#win')).toBeVisible();
  const box = async (sel: string) => (await frame.locator(sel).boundingBox())!;

  // Varsayılan sistem ziyaretçinin işletim sisteminden gelir; önce macOS'u seç.
  await page.locator('.os [data-os="macos"]').click();
  await expect(frame.locator('#win')).toHaveAttribute('data-os', 'macos');
  const macPill = await box('.bar .pill');
  const macWin = await box('#win');
  expect(Math.round(macPill.y - macWin.y)).toBe(14);

  for (const os of ['windows', 'linux'] as const) {
    await page.locator(`.os [data-os="${os}"]`).click();
    await expect(frame.locator('#win')).toHaveAttribute('data-os', os);
    const win = await box('#win');
    const caption = await box('.caption');
    const pill = await box('.bar .pill');
    expect(pill.y).toBeGreaterThanOrEqual(caption.y + caption.height);
    expect(Math.round(win.x + win.width - (pill.x + pill.width))).toBe(14);
    expect(Math.round(caption.y - win.y)).toBe(0);
    expect(Math.round(caption.height)).toBe(os === 'windows' ? 32 : 46);
    if (os === 'windows') expect(Math.round(win.x + win.width - (caption.x + caption.width))).toBe(0);
  }
});
