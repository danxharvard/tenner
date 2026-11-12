// Draws every Tenner app icon from one source, sharp at its real size: run `node scripts/icons.mjs` after changing the mark.
// Uses the Playwright Chromium that's on the build machines (not part of the hourly build; the PNGs are kept in git).
//   apple-touch-icon.png  180, square and solid (iOS rounds the corners itself)
//   icon-96/192/512.png   rounded tiles for browsers, Android and computers
//   icon-maskable-512.png square and solid, the mark inside Android's safe circle
//   badge-96.png          the mark in white on clear, for the small badge on Android's notifications
//   favicon.ico           16, 32 and 48, the glow left off at 16 so it stays crisp in a tab
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = new URL('../site/', import.meta.url);

const RAINBOW = `<linearGradient id="r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff375f"/><stop offset=".22" stop-color="#ff9f0a"/>
  <stop offset=".42" stop-color="#ffd60a"/><stop offset=".6" stop-color="#30d158"/><stop offset=".8" stop-color="#0a84ff"/><stop offset="1" stop-color="#bf5af2"/></linearGradient>`;
// the mark on a 64 grid, centred: the "1" and a rainbow ring with a play button inside
const mark = ({ glow = true, mono = false } = {}) => `
  <path d="M13 22.5 19.5 18v28" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="39" cy="32" r="12" fill="none" stroke="${mono ? '#fff' : 'url(#r)'}" stroke-width="5.5"${glow && !mono ? ' filter="url(#g)"' : ''}/>
  <path d="M36.1 27.4 43.5 32l-7.4 4.6z" fill="#fff" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>`;
const svg = (px, { tile = 'round', scale = 1, glow = true, mono = false } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 64 64">
  <defs>${RAINBOW}<filter id="g" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <radialGradient id="sh" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#1c1c1e"/><stop offset=".75" stop-color="#000"/></radialGradient></defs>
  ${tile === 'round' ? '<rect width="64" height="64" rx="14.4" fill="url(#sh)"/>' : tile === 'square' ? '<rect width="64" height="64" fill="url(#sh)"/>' : ''}
  <g transform="translate(32 32) scale(${scale}) translate(-32 -32)">${mark({ glow, mono })}</g></svg>`;

const b = await chromium.launch();
const page = await b.newPage({ deviceScaleFactor: 1 });
const shot = async (px, opts) => {
  await page.setViewportSize({ width: px, height: px });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg(px, opts)}`);
  return page.screenshot({ omitBackground: true, type: 'png' });
};
const files = {
  'apple-touch-icon.png': await shot(180, { tile: 'square', scale: .92 }),
  'icon-96.png': await shot(96, {}),
  'icon-192.png': await shot(192, {}),
  'icon-512.png': await shot(512, {}),
  'icon-maskable-512.png': await shot(512, { tile: 'square', scale: .78 }),
  'badge-96.png': await shot(96, { tile: 'none', mono: true, scale: 1.25 }),
};
for (const [f, buf] of Object.entries(files)) writeFileSync(new URL(f, out), buf);

// favicon.ico: the three sizes as PNGs in one file
const ico = [[16, await shot(16, { glow: false })], [32, await shot(32, {})], [48, await shot(48, {})]];
const head = Buffer.alloc(6 + 16 * ico.length);
head.writeUInt16LE(1, 2); head.writeUInt16LE(ico.length, 4);
let at = head.length;
ico.forEach(([px, buf], i) => {
  const o = 6 + 16 * i;
  head.writeUInt8(px, o); head.writeUInt8(px, o + 1); head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6);
  head.writeUInt32LE(buf.length, o + 8); head.writeUInt32LE(at, o + 12); at += buf.length;
});
writeFileSync(new URL('favicon.ico', out), Buffer.concat([head, ...ico.map(([, buf]) => buf)]));
await b.close();
console.log('Drew', Object.keys(files).length + 1, 'icons');
