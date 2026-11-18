const PAGE = `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Tenner Beta</title>
  <style>
    :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #20251e; background: #f6f7f2; }
    * { box-sizing: border-box; }
    body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 24px; }
    main { width: min(100%, 620px); padding: 32px; border: 1px solid #e4e7dd; border-radius: 16px; background: #fff; }
    p { margin: 0; font-size: 16px; line-height: 1.7; }
    a { color: #35543a; font-weight: 600; text-underline-offset: 3px; }
    a:focus-visible { outline: 3px solid #8da768; outline-offset: 3px; border-radius: 2px; }
    @media (max-width: 520px) { main { padding: 24px; } p { font-size: 15px; } }
  </style>
</head>
<body>
  <main><p>You do not have access to this beta version of Tenner, please click <a href="https://tenner.stream/">here</a> to return to Tenner</p></main>
</body>
</html>`;

export default {
  fetch(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    return new Response(request.method === 'HEAD' ? null : PAGE, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'x-robots-tag': 'noindex, nofollow',
      },
    });
  },
};
