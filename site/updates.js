// The Update centre: every release from updates.json (one a day, added by the 19:30 release, .github/release-notes.mjs), newest first.
// Laid out like Apple's release notes: the build you're on at the top, then each month's builds in one frosted card.
// The owner's rule: every release lists bug fixes, stability, and speed and reliability improvements; only major new
// features are spelled out, above them. The full wording stays in updates.json.
(async () => {
  const log = document.getElementById('uLog'), sub = document.getElementById('uSub'), cur = document.getElementById('uNow');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const when = (d) => new Date(`${d}T12:00:00Z`);
  const day = (d) => { const t = when(d); return isNaN(t) ? esc(d) : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const month = (d) => { const t = when(d); return isNaN(t) ? '' : t.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); };
  // every release lists these (the owner's rule); new features, when there are any, come first
  const STANDARD = ['Bug fixes and improvements', 'Stability improvements', 'Speed and reliability improvements'];
  const kind = (u) => (/\.0\.0$/.test(u.version) ? 'major' : u.changes?.length ? 'feature' : 'fix');
  const KIND = { major: 'Major update', feature: 'New features', fix: 'Improvements' };
  let list;
  try { const r = await fetch(`updates.json?v=${Date.now()}`); if (!r.ok) throw 0; list = await r.json(); }
  catch { log.removeAttribute('aria-busy'); cur.hidden = true; log.innerHTML = '<p class="u-empty">The list of updates couldn’t load. Check your connection and try again.</p>'; return; }
  const now = document.querySelector('.side-ver')?.textContent.replace(/^Tenner\s*/, '') || list[0]?.version || '';
  const at = list.find((u) => u.version === now) || list[0] || { version: now };
  sub.textContent = list.length > 1 ? `${list.length} updates, newest first.` : 'What’s new in Tenner.';
  cur.innerHTML = `<img class="u-icon" src="apple-touch-icon.png" alt="" width="64" height="64">
    <div class="u-now-t"><h2>Tenner ${esc(at.version)}</h2>
    <p class="u-ok"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9"/><path d="m6 10.3 2.7 2.7L14.2 7.4"/></svg>Tenner is up to date</p>
    ${at.date ? `<p class="u-when">Released ${day(at.date)}</p>` : ''}</div>`;
  cur.removeAttribute('aria-busy');
  if (!list.length) { log.removeAttribute('aria-busy'); log.innerHTML = '<div class="u-card"><p class="u-empty">Updates will be listed here each evening at 7:30pm.</p></div>'; return; }
  const row = (u) => {
    const k = kind(u), v = esc(u.version), feats = k === 'fix' ? [] : u.changes || [];
    const body = `${feats.length ? `<h3>${esc(u.title)}</h3>` : ''}<ul>${[...feats, ...STANDARD].map((c) => `<li>${esc(c)}</li>`).join('')}</ul>${u.notes ? `<p class="u-notes">${esc(u.notes)}</p>` : ''}`;
    return `<article class="u-row u-${k}" id="v${v}" aria-labelledby="h${v}">
      <header class="u-head"><a class="u-ver" id="h${v}" href="#v${v}">Tenner ${v}</a><span class="u-kind"><i aria-hidden="true"></i>${KIND[k]}</span><time class="u-date" datetime="${esc(u.date)}">${day(u.date)}</time></header>
      ${body}</article>`;
  };
  const groups = [];
  for (const u of list) { const m = month(u.date); if (groups.at(-1)?.m !== m) groups.push({ m, items: [] }); groups.at(-1).items.push(u); }
  log.innerHTML = groups.map((g) => `<section class="u-month"><h2 class="u-mh">${esc(g.m || 'Earlier')}</h2><div class="u-card">${g.items.map(row).join('')}</div></section>`).join('');
  log.removeAttribute('aria-busy');
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
})();
