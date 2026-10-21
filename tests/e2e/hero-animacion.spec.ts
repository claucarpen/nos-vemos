import { test, expect } from '@playwright/test';

// Elementos del header con animación declarada (CSS), por nombre.
// Pares de sprites del camino (mascota, cofre, poción, amigos visibles) cuyas cajas se superponen.
const overlapsFn = () => {
  const boxes = Array.from(document.querySelectorAll<HTMLElement>('.world img'))
    .filter((el) => /(mascot|chest|potion|friend-p\d)\.png$/.test(el.getAttribute('src') ?? '') && el.getClientRects().length > 0)
    .map((el) => ({ n: el.getAttribute('src')!.split('/').pop()!, r: el.getBoundingClientRect() }));
  const out: string[] = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i].r, b = boxes[j].r;
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (w > 0.5 && h > 0.5) out.push(`${boxes[i].n} x ${boxes[j].n}`);
  }
  return out;
};

const animated = () => Array.from(document.querySelectorAll<HTMLElement>('.hero, .hero *')).filter((el) => getComputedStyle(el).animationName !== 'none');

test('C1: el header tiene animación, 3 amigos nuevos y el cartel LEVEL CLEAR oculto a lectores', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const n = await page.evaluate(`(${animated.toString()})().length`);
  expect(n).toBeGreaterThanOrEqual(8);
  for (const f of ['friend-p2', 'friend-p3', 'friend-p4']) {
    await expect(page.locator(`.world img[src="/sprites/${f}.png"]`)).toHaveCount(1);
  }
  await expect(page.locator('.fr:visible')).toHaveCount(3);
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(page.locator('.fr:visible')).toHaveCount(2);
  await expect(page.locator('.fr3')).toBeHidden();
  await page.setViewportSize({ width: 699, height: 800 });
  await expect(page.locator('.fr:visible')).toHaveCount(2);
  await page.setViewportSize({ width: 700, height: 800 });
  await expect(page.locator('.fr:visible')).toHaveCount(3);
  const clear = page.locator('.world .clear');
  await expect(clear).toHaveCount(1);
  await expect(clear).toHaveText('LEVEL CLEAR');
  await expect(clear).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.world')).toHaveAttribute('aria-hidden', 'true');
});

test('C2: con reducir movimiento no hay animación; los amigos se ven (2 bajo 700 px, 3 desde 700) y el cartel no', async ({ browser }) => {
  for (const [w, n] of [[320, 2], [375, 2], [699, 2], [700, 3], [1280, 3]] as const) {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: w, height: 800 } });
    const page = await ctx.newPage();
    await page.goto('/');
    const active = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('.hero, .hero *'))
      .filter((el) => { const cs = getComputedStyle(el); return cs.animationName !== 'none' && parseFloat(cs.animationDuration) > 0; })
      .map((el) => el.className));
    expect(active, `ancho ${w}`).toEqual([]);
    await expect(page.locator('.fr:visible'), `ancho ${w}`).toHaveCount(n);
    expect(await page.locator('.fr:visible').evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity)), `ancho ${w}`).toEqual(Array(n).fill('1'));
    expect(await page.locator('.world .clear').evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
    expect(await page.locator('.world .pn').evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity))).toEqual(['0', '0', '0']);
    const overlaps = await page.evaluate(overlapsFn);
    expect(overlaps, `ancho ${w}: superposiciones en la escena final`).toEqual([]);
    await ctx.close();
  }
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

test('C6b: en el instante de LEVEL CLEAR nadie pisa a nadie, y cada amigo camina al menos 1,5 tiles', async ({ page }) => {
  await page.goto('/');
  for (const w of [320, 375, 640, 699, 700, 880, 1280, 1920]) {
    await page.setViewportSize({ width: w, height: 800 });
    const res = await page.evaluate(([overlaps]) => {
      const fn = new Function(`return (${overlaps})()`);
      const at = (t: number) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t * 1000; });
      const u = parseFloat(getComputedStyle(document.querySelector('.world')!).getPropertyValue('--u') || getComputedStyle(document.querySelector('.hero')!).getPropertyValue('--u'));
      const frs = Array.from(document.querySelectorAll<HTMLElement>('.fr')).filter((el) => el.getClientRects().length > 0);
      const times = frs.length === 3 ? [0, 2, 4] : [0, 3];
      const left = () => frs.map((el) => el.querySelector('img')!.getBoundingClientRect().left);
      at(9); const finalLeft = left();
      const walks = frs.map((_, i) => { at(times[i] + 0.101); return Math.abs(left()[i] - finalLeft[i]) / u; });
      at(6.2);
      const clear = parseFloat(getComputedStyle(document.querySelector('.clear')!).opacity);
      return { overlaps: fn() as string[], walks, clear, n: frs.length };
    }, [overlapsFn.toString()] as const);
    expect(res.n, `ancho ${w}`).toBe(w >= 700 ? 3 : 2);
    expect(res.clear, `ancho ${w}: LEVEL CLEAR visible`).toBe(1);
    expect(res.overlaps, `ancho ${w}`).toEqual([]);
    res.walks.forEach((d, i) => expect(d, `ancho ${w}: amigo ${i + 1} camina ${d.toFixed(2)} tiles`).toBeGreaterThanOrEqual(1.5));
  }
});
