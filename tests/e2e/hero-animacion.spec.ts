import { test, expect } from '@playwright/test';

// Elementos del header con animación declarada (CSS), por nombre.
const animated = () => Array.from(document.querySelectorAll<HTMLElement>('.hero, .hero *')).filter((el) => getComputedStyle(el).animationName !== 'none');

test('C1: el header tiene animación, 3 amigos nuevos y el cartel LEVEL CLEAR oculto a lectores', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const n = await page.evaluate(`(${animated.toString()})().length`);
  expect(n).toBeGreaterThanOrEqual(8);
  for (const f of ['friend-p2', 'friend-p3', 'friend-p4']) {
    await expect(page.locator(`.world img[src="/sprites/${f}.png"]`)).toHaveCount(1);
  }
  const clear = page.locator('.world .clear');
  await expect(clear).toHaveCount(1);
  await expect(clear).toHaveText('LEVEL CLEAR');
  await expect(clear).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.world')).toHaveAttribute('aria-hidden', 'true');
});

test('C2: con reducir movimiento no hay animación; los 3 amigos se ven y el cartel no', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto('/');
  const active = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('.hero, .hero *'))
    .filter((el) => { const cs = getComputedStyle(el); return cs.animationName !== 'none' && parseFloat(cs.animationDuration) > 0; })
    .map((el) => el.className));
  expect(active).toEqual([]);
  for (const f of ['friend-p2', 'friend-p3', 'friend-p4']) {
    const fr = page.locator(`.fr:has(img[src="/sprites/${f}.png"])`);
    await expect(fr).toBeVisible();
    expect(await fr.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  }
  expect(await page.locator('.world .clear').evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
  expect(await page.locator('.world .pn').evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity))).toEqual(['0', '0', '0']);
  await ctx.close();
});

test('C3: las animaciones corren a la vista y se pausan al salir del header', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const states = () => page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('.hero *'))
    .filter((el) => getComputedStyle(el).animationName !== 'none')
    .flatMap((el) => getComputedStyle(el).animationPlayState.split(', ')));
  const visible = await states();
  expect(visible.length).toBeGreaterThan(8);
  expect(new Set(visible)).toEqual(new Set(['running']));
  await page.evaluate(() => document.querySelector('#form-leads')!.scrollIntoView());
  await expect.poll(async () => [...new Set(await states())]).toEqual(['paused']);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(async () => [...new Set(await states())]).toEqual(['running']);
});

test('C4: durante un loop completo no se mueve el layout (CLS <= 0.01)', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => {
    (window as any).__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as any[]) if (!e.hadRecentInput) (window as any).__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/');
  await page.waitForTimeout(13_000);
  expect(await page.evaluate(() => (window as any).__cls)).toBeLessThanOrEqual(0.01);
});
