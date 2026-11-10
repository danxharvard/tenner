// tenner.stream: the site/ folder as static files. Tenner's own links say "about.html", which Cloudflare would answer
// with a redirect to /about: an extra trip on every tap, and a redirected copy the installed app can't open offline.
// So only those addresses come through here, and get their page straight away; everything else never runs this.
export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.endsWith('.html')) {
      url.pathname = url.pathname.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
      return env.ASSETS.fetch(new Request(url, request));
    }
    return env.ASSETS.fetch(request);
  },
};
