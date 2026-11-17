// m.tenner.stream: Tenner's mobile site in a browser on a computer. Every page address gets the page below, which loads
// the same address of tenner.stream at phone width, full height down the middle of the window (no phone outline). tenner.stream is the same site as m.tenner.stream, so the
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
:root { color-scheme: light dark; --bg: #fff; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #000; } }
:root[data-theme="dark"] { --bg: #000; }
:root[data-theme="light"] { --bg: #fff; }
html, body { margin: 0; height: 100%; background: var(--bg); overflow: hidden; }
/* the phone site itself, full height down the middle of the window, at the width of a large iPhone */
iframe { display: block; width: min(100%, 430px); height: 100dvh; margin: 0 auto; border: 0; background: var(--bg); }
</style>
</head>
<body>
<iframe id="f" title="Tenner"
  allow="publickey-credentials-get *; publickey-credentials-create *; identity-credentials-get *; web-share *; clipboard-write *; fullscreen *; autoplay *"></iframe>
<script>
(function () {
  var f = document.getElementById('f'), site = ${JSON.stringify(SITE)};
  f.src = site + location.pathname + location.search + location.hash;
  addEventListener('message', function (e) {
    if (e.origin !== site || e.source !== f.contentWindow || !e.data || e.data.tenner !== 'm') return;
    var d = e.data;
    if (typeof d.path === 'string' && d.path.charAt(0) === '/' && d.path.charAt(1) !== '/') { try { history.replaceState(null, '', d.path); } catch (_) {} }
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
