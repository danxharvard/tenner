// The Update centre: every release from updates.json (kept up to date by scripts/updates.mjs on each build), newest first.
// Deliberately plain: a log of build numbers, dates and changes.
(async () => {
  const log = document.getElementById('uLog'), sub = document.getElementById('uSub');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const day = (d) => { const t = new Date(`${d}T12:00:00Z`); return isNaN(t) ? esc(d) : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const kind = (v) => (/\.0\.0$/.test(v) ? 'Major' : /\.0$/.test(v) ? 'Feature' : 'Fix');
  let list;
  try { const r = await fetch(`updates.json?v=${Date.now()}`); if (!r.ok) throw 0; list = await r.json(); }
  catch { log.removeAttribute('aria-busy'); log.innerHTML = '<p class="u-empty">The list of updates couldn’t load. Check your connection and try again.</p>'; return; }
  const now = document.querySelector('.side-ver')?.textContent.replace(/^Tenner\s*/, '') || list[0]?.version;
  sub.textContent = `You’re on build ${now}. ${list.length} updates since October 2026.`;
  log.innerHTML = list.map((u) => `<article class="u-row" id="v${esc(u.version)}">
    <div class="u-meta"><a class="u-ver" href="#v${esc(u.version)}">${esc(u.version)}</a><span class="u-date">${day(u.date)}</span><span class="u-kind">${kind(u.version)}${u.version === now ? ' · current' : ''}</span></div>
    <div class="u-body"><h2>${esc(u.title)}</h2>${u.changes?.length ? `<ul>${u.changes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}${u.notes ? `<p class="u-notes"><b>Notes:</b> ${esc(u.notes)}</p>` : ''}</div>
  </article>`).join('');
  log.removeAttribute('aria-busy');
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
})();
