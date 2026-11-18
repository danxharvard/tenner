// beta.tenner.stream uses the real Tenner app, served from the same built site assets.
// Only the beta host's root is rewritten; every other page and static file behaves normally.
export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'beta.tenner.stream' && (url.pathname === '/' || url.pathname === '/index.html')) {
      url.pathname = '/beta-home.html';
      return env.ASSETS.fetch(new Request(url, request));
    }
    return env.ASSETS.fetch(request);
  },
};
