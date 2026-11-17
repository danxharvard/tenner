// m.tenner.stream: Tenner's phone view in a browser on a computer. Every page address gets the frame below, which loads
// the same address of tenner.stream at phone width inside it. tenner.stream is the same site as m.tenner.stream, so the
// framed page keeps its own sign-in, Watchlist and settings, as if opened directly. The framed page tells this one where
// it is (shell.js), so the address bar, the tab's title and the theme follow it. Files (icons and so on) go to tenner.stream.
const SITE = 'https://tenner.stream';

const page = () => `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<title>Tenner</title>
<link rel="canonical" href="${SITE}/">
<link rel="icon" href="${SITE}/favicon.ico" sizes="48x48">
<link rel="icon" href="${SITE}/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${SITE}/apple-touch-icon.png">
<script>
/* a phone (or any narrow window) gets tenner.stream itself, which is already the phone view */
if (matchMedia('(max-width: 520px)').matches) location.replace(${JSON.stringify(SITE)} + location.pathname + location.search + location.hash);
</script>
<style>
:root { color-scheme: light dark; --bg: #f2f2f7; --label: #000; --label2: rgba(60,60,67,.6); --bt2: rgba(120,120,128,.16); --rim: rgba(0,0,0,.14); --r: 9px;
  --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #000; --label: #fff; --label2: rgba(235,235,245,.6); --bt2: rgba(120,120,128,.32); --rim: rgba(255,255,255,.16); } }
:root[data-theme="dark"] { --bg: #000; --label: #fff; --label2: rgba(235,235,245,.6); --bt2: rgba(120,120,128,.32); --rim: rgba(255,255,255,.16); }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body { background: var(--bg); color: var(--label); font: 500 15px/1.3 var(--font); -webkit-font-smoothing: antialiased;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 16px; overflow: hidden; transition: background-color .4s ease; }
.ph { position: relative; width: 413px; height: min(872px, calc(100dvh - 92px)); flex: none; border-radius: 48px; padding: 10px;
  background: #0b0b0d; box-shadow: 0 0 0 1px var(--rim), 0 30px 80px rgba(0,0,0,.28); }
.ph iframe { display: block; width: 100%; height: 100%; border: 0; border-radius: 38px; background: var(--bg); }
.bar { display: flex; justify-content: center; }
.btn-2nd { display: inline-flex; align-items: center; gap: 7px; min-height: 44px; padding: 0 16px; border-radius: var(--r);
  background: var(--bt2); color: var(--label); font: 500 15px var(--font); text-decoration: none; -webkit-backdrop-filter: blur(40px); backdrop-filter: blur(40px); }
.btn-2nd:hover { filter: brightness(1.08); }
.btn-2nd:focus-visible { outline: 2px solid #0a84ff; outline-offset: 2px; }
.btn-2nd svg { width: 18px; height: 18px; }
@media (max-height: 560px) { .bar { display: none; } .ph { height: calc(100dvh - 32px); } }
</style>
</head>
<body>
<div class="ph"><iframe id="f" title="Tenner on a phone"
  allow="publickey-credentials-get *; publickey-credentials-create *; identity-credentials-get *; web-share *; clipboard-write *; fullscreen *; autoplay *"></iframe></div>
<nav class="bar" aria-label="Phone view"><a class="btn-2nd" id="full" href="${SITE}/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>Open the full site</a></nav>
<script>
(function () {
  var f = document.getElementById('f'), full = document.getElementById('full'), site = ${JSON.stringify(SITE)};
  f.src = site + location.pathname + location.search + location.hash;
  full.href = f.src;
  addEventListener('message', function (e) {
    if (e.origin !== site || e.source !== f.contentWindow || !e.data || e.data.tenner !== 'm') return;
    var d = e.data;
    if (typeof d.path === 'string' && d.path.charAt(0) === '/' && d.path.charAt(1) !== '/') {
      try { history.replaceState(null, '', d.path); } catch (_) {}
      full.href = site + d.path;
    }
    if (typeof d.title === 'string') document.title = d.title;
    if (d.theme === 'dark' || d.theme === 'light') document.documentElement.dataset.theme = d.theme;
  });
})();
</script>
</body>
</html>`;

export default {
  fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname + url.search;
    // files (icons, the manifest, robots.txt…) come from tenner.stream itself; only pages get the frame
    if (/\.[a-z0-9]+$/i.test(url.pathname) && !/\.html$/i.test(url.pathname)) return Response.redirect(SITE + path, 302);
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405, headers: { allow: 'GET, HEAD' } });
    return new Response(page(), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' } });
  },
};
