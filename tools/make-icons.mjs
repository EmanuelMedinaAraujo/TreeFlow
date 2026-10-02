// Regenerates icons/*.svg|png. Run from the repo root: node tools/make-icons.mjs
// Needs Playwright (npm i -g playwright) for the PNG rendering.
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const colors = ['#ff6b6b', '#ffa94d', '#ffd43b', '#8ce99a', '#38d9a9', '#4dabf7', '#91a7ff', '#da77f2'];

function wheelSvg({ rounded, scale }) {
  const cx = 256;
  const cy = 268;
  const r = 168 * scale;
  const rim = 16 * scale;
  const n = colors.length;
  let slices = '';
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + (i / n) * Math.PI * 2 - Math.PI / n;
    const a1 = a0 + (Math.PI * 2) / n;
    const p = (a) => `${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`;
    slices += `<path d="M${cx} ${cy}L${p(a0)}A${r} ${r} 0 0 1 ${p(a1)}Z" fill="${colors[i]}"/>`;
  }
  let bulbs = '';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    bulbs += `<circle cx="${(cx + Math.cos(a) * (r + rim / 2)).toFixed(2)}" cy="${(cy + Math.sin(a) * (r + rim / 2)).toFixed(2)}" r="${(rim * 0.22).toFixed(2)}" fill="#fff4c2"/>`;
  }
  const pw = 30 * scale;
  const top = cy - r - rim - 14 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" ${rounded ? 'rx="112"' : ''} fill="#2b2340"/>
<circle cx="${cx}" cy="${cy}" r="${r + rim}" fill="#16111f"/>
${slices}
${bulbs}
<circle cx="${cx}" cy="${cy}" r="${36 * scale}" fill="#fff" stroke="#16111f" stroke-width="${8 * scale}"/>
<path d="M${cx - pw} ${top}H${cx + pw}L${cx} ${top + 62 * scale}Z" fill="#ff4f6d" stroke="#fff" stroke-width="${6 * scale}" stroke-linejoin="round"/>
</svg>
`;
}

const regular = wheelSvg({ rounded: true, scale: 1 });
const fullBleed = wheelSvg({ rounded: false, scale: 1 });
const maskable = wheelSvg({ rounded: false, scale: 0.78 });
writeFileSync('icons/icon.svg', regular);

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright'));
}
const browser = await chromium.launch();
const page = await browser.newPage();
async function png(svg, size, file, transparentCorners) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: file, omitBackground: transparentCorners });
}
await png(regular, 192, 'icons/icon-192.png', true);
await png(regular, 512, 'icons/icon-512.png', true);
await png(maskable, 512, 'icons/icon-maskable-512.png', false);
await png(fullBleed, 180, 'icons/apple-touch-icon.png', false);
await browser.close();
console.log('icons written');
