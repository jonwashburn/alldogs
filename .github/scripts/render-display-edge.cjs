'use strict';
// Offline presentation mask, made with the same frozen brush as scene.js.
// Run on the render host with Playwright available through NODE_PATH.
// BROWSER_PATH may name an existing Chromium executable. No artwork is read.
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '../..');

(async () => {
  const browser = await chromium.launch({
    ...(process.env.BROWSER_PATH ? {executablePath: process.env.BROWSER_PATH} : {}),
    headless: true, args: ['--no-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.addScriptTag({path: path.join(root, 'painting/paintkit.js')});
    const png = await page.evaluate(() => {
      const width = 1600, height = 800;
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d', {willReadFrequently: true});
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height);
      PK.reset();
      const rng = PK.makeRng(202609207);
      const layer = PK.paintBegin(ctx, rng, {tooth: .025, grain: 0});
      // Broad overlapping passes: quiet long sides, individual brush endings.
      // Their pressure, body and tooth follow the painted page's material.
      const strokes = [
        [[[40,66],[420,63],[920,69]], 90],
        [[[810,64],[1190,58],[1545,66]], 80],
        [[[1550,729],[1060,735],[580,730]], 87],
        [[[710,738],[335,731],[44,739]], 81],
        [[[67,57],[63,358],[71,746]], 83],
        [[[1538,50],[1545,420],[1534,752]], 83]
      ];
      for (const [points, w] of strokes) {
        PK.paint.brushStroke(layer, rng, points, {
          color: '#ffffff', w, alpha: 1, body: .92, thick: .43,
          press: .74, wetness: .08, wet: false, scumble: .1,
          close: .88, load: 3.5, jitter: 0, bow: .06, wob: .012,
          taperEnd: .03
        });
      }
      const mask = ctx.createImageData(width, height);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const i = y * width + x, j = i * 4;
        const interior = Math.min(x - 68, 1530 - x, y - 82, 718 - y);
        const core = Math.max(0, Math.min(1, interior / 16));
        // Saturate the brush body so only the outer contact marks let paper
        // through. The interior stays opaque; there is no translucent frame.
        const coverage = Math.max(Math.min(1, layer.col[i * 3] * 6), core);
        mask.data[j] = mask.data[j + 1] = mask.data[j + 2] = 255;
        mask.data[j + 3] = Math.round(coverage * 255);
      }
      ctx.putImageData(mask, 0, 0);
      PK.reset();
      return canvas.toDataURL('image/png');
    });
    // Keep one static, self-contained SVG resource: no visitor-side rendering.
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 800" preserveAspectRatio="none">\n' +
      '  <image width="1600" height="800" href="' + png + '"/>\n</svg>\n';
    fs.writeFileSync(path.join(root, 'painting/display-edge.svg'), svg);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
