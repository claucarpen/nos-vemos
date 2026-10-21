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
  expect(all).toHaveLength(31);
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

// C6 (spec 008): en 6 instantes del loop, ningún elemento visible (opacity > 0) del escenario queda parcialmente fuera.
test('C6: nada cortado en ningún instante del loop, de 320 a 1920 px', async ({ page }) => {
  await page.goto('/');
  const instants = [0.5, 2.2, 4.2, 6.2, 8, 10.5];
  const widths6 = [320, 375, 640, 880, 1280, 1920];
  const clipped: string[] = [];
  for (const w of widths6) {
    await page.setViewportSize({ width: w, height: 800 });
    for (const t of instants) {
      const bad = await page.evaluate(([t, w]) => {
        document.getAnimations().forEach((a) => { a.pause(); a.currentTime = (t as number) * 1000; });
        const out: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>('.world img, .world .pn, .world .clear, .world .flash, .world .firefly')) {
          let op = 1;
          for (let n: HTMLElement | null = el; n && !n.classList.contains('world'); n = n.parentElement) op *= parseFloat(getComputedStyle(n).opacity);
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || op <= 0) continue;
          const r = el.getBoundingClientRect();
          if (r.left < 0 || r.right > (w as number)) out.push(`${el.getAttribute('src') ?? el.className} (left ${r.left.toFixed(1)}, right ${r.right.toFixed(1)})`);
        }
        return out;
      }, [t, w] as const);
      for (const b of bad) clipped.push(`ancho ${w}, t=${t}s: ${b}`);
    }
  }
  expect(clipped, `elementos cortados:\n${clipped.join('\n')}`).toEqual([]);
});
