import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 } });

test('C12: favicon.png es la mascota ×2 por vecino más cercano', async ({ page }) => {
  await page.goto('/');
  const r = await page.evaluate(async () => {
    const load = (src: string) => new Promise<HTMLImageElement>((ok, ko) => {
      const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error(src)); i.src = src;
    });
    const data = (i: HTMLImageElement) => {
      const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight;
      const g = c.getContext('2d')!; g.drawImage(i, 0, 0);
      return g.getImageData(0, 0, c.width, c.height);
    };
    const m = data(await load('/sprites/mascot.png'));
    const f = data(await load('/favicon.png'));
    const bad: string[] = [];
    for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) {
      for (let k = 0; k < 4; k++) {
        if (f.data[(y * f.width + x) * 4 + k] !== m.data[((y >> 1) * m.width + (x >> 1)) * 4 + k]) { bad.push(`${x},${y}`); break; }
      }
    }
    return { w: f.width, h: f.height, mw: m.width, bad: bad.slice(0, 10), nbad: bad.length };
  });
  expect(r.w).toBe(32);
  expect(r.h).toBe(32);
  expect(r.mw).toBe(16);
  expect(r.nbad, `píxeles distintos: ${r.bad.join(' ')}`).toBe(0);
});

test('C13: cargar la página no da 404 ni errores de consola', async ({ page }) => {
  const bad: string[] = [];
  const errors: string[] = [];
  page.on('response', (res) => { if (res.status() >= 400) bad.push(`${res.status()} ${res.url()}`); });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const ico = await page.request.get('/favicon.ico');
  expect(ico.status()).toBe(200);
  expect(bad, `respuestas con error: ${bad.join(', ')}`).toEqual([]);
  expect(errors, `errores de consola: ${errors.join(' | ')}`).toEqual([]);
});
