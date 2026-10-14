import { test, expect } from '@playwright/test';

const named = [320, 375, 639, 640, 768, 880, 1024, 1280, 1440, 1920];
const widths = [...new Set([...named, ...Array.from({ length: (1920 - 320) / 16 + 1 }, (_, i) => 320 + i * 16)])].sort((a, b) => a - b);

type Info = { src: string; x: string; left: number; right: number; visible: boolean };

async function sprites(page: import('@playwright/test').Page): Promise<Info[]> {
  return page.$$eval('.world img', (imgs) => imgs.map((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      src: el.getAttribute('src') ?? '',
      x: (el as HTMLElement).style.getPropertyValue('--x'),
      left: r.left, right: r.right,
      visible: cs.display !== 'none' && cs.visibility !== 'hidden',
    };
  }));
}

test('C14: ningún sprite del header queda cortado por el borde (320 a 1920 px)', async ({ page }) => {
  await page.goto('/');
  const clipped: string[] = [];
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 800 });
    for (const s of (await sprites(page)).filter((i) => i.visible)) {
      const inside = s.left >= 0 && s.right <= w;
      const outside = s.right <= 0 || s.left >= w;
      if (!inside && !outside) clipped.push(`ancho ${w}: ${s.src} --x:${s.x} (left ${s.left}, right ${s.right})`);
    }
  }
  expect(clipped, `sprites cortados:\n${clipped.join('\n')}`).toEqual([]);
});

test('C15: el header no pierde escenario donde sobra lugar', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 1920, height: 800 });
  const all = await sprites(page);
  expect(all).toHaveLength(28);
  const hidden = all.filter((s) => !s.visible || s.left < 0 || s.right > 1920);
  expect(hidden.map((s) => `${s.src} --x:${s.x}`), 'a 1920 px todos deben verse').toEqual([]);

  const seen: Record<number, string> = {};
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 800 });
    const list = await sprites(page);
    for (const name of ['mascot', 'chest', 'potion']) {
      const s = list.find((i) => i.src.endsWith(`/${name}.png`))!;
      if (!s.visible || s.left < 0 || s.right > w) seen[w] = `${seen[w] ?? ''} ${name}`;
    }
  }
  expect(seen, 'mascota, cofre y poción siempre visibles y enteros').toEqual({});
});
