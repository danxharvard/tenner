// Concept 2 · Broadsheet. The masthead, section nav, article drawer and search are shared; each page draws itself.
import { load, art, esc, icon, svc, SERVICES, typeWord, when, prefs, applyTheme, page, qs, share, buzz } from '../shared/tenner.js';

const P = prefs('broadsheet');
applyTheme(P.get('theme'));
const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');
const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const NAV = [['home', 'index.html', 'Front<span class="hide-s">&nbsp;page</span>'], ['top10', 'top10.html', 'Charts'], ['browse', 'browse.html', 'Browse'], ['settings', 'settings.html', 'Settings']];

document.body.insertAdjacentHTML('afterbegin', `
  <header class="mast"><div class="wrap"><div class="strap"><span>${today}</span><span class="hide-s">The UK's streaming charts · Every hour</span><button data-flip aria-label="Switch day and night">Day / Night</button></div>
    <a class="word" href="index.html" aria-label="Tenner, front page">Tenner<i>.</i></a></div></header>
  <nav class="sect" aria-label="Sections"><div class="wrap">${NAV.map(([p, h, l]) => `<a href="${h}" ${page() === p ? 'aria-current="page"' : ''}>${l}</a>`).join('')}<span class="sp"></span>
    <button data-search aria-label="Search">${icon('search', 18)}<span class="hide-s" style="margin-left:6px">Search</span><kbd>/</kbd></button></div></nav>`);
document.body.insertAdjacentHTML('beforeend', `
  <footer class="wrap"><div class="foot"><span>Tenner · Broadsheet · a design concept</span><span>Charts from TMDB, JustWatch and Watchmode</span></div></footer>
  <dialog class="drawer" id="sheet" aria-label="Title"></dialog>
  <dialog class="find" id="pal" aria-label="Search"><div class="wrap"><div class="strap" style="padding-bottom:12px"><span>Search the paper</span><button class="close" data-close>${icon('x', 16)} Close</button></div>
    <label class="q"><span class="vh">Search</span><input type="search" placeholder="Type a title" autocomplete="off"></label><div class="res"></div></div></dialog>`);

const toast = (t) => { $('.toast')?.remove(); document.body.insertAdjacentHTML('beforeend', `<div class="toast" role="status">${esc(t)}</div>`); setTimeout(() => $('.toast')?.remove(), 2000); };
const meta = (x) => [typeWord(x.type), x.year, x.rating ? (+x.rating).toFixed(1) + '/10' : ''].filter(Boolean).join(' · ');
const mv = (x) => x.mv == null ? '' : x.mv === 'new' ? '<span class="fig" style="color:var(--blue)">NEW</span>' : x.mv > 0 ? `<span class="fig up">▲${x.mv}</span>` : x.mv < 0 ? `<span class="fig down">▼${-x.mv}</span>` : '<span class="fig" style="color:var(--mute)">=</span>';
const sw = (s) => `<span class="sw" style="--c:${s.color}"><i></i>${esc(s.label)}</span>`;
const ALL = { key: 'all', label: 'All of the UK', color: 'var(--ink)' };

load().then((D) => {
  ({ home, browse, top10, settings })[page()]?.(D);
  if (qs('t')) openSheet(D, qs('t'));
  wire(D);
});

function home(D) {
  const a = D.charts.all.tv[0], f = D.charts.all.movie[0];
  app.innerHTML = `<div class="front">
    <button class="lead" data-k="${a.k}"><div class="pic">${art(a)}</div><div><span class="kick">No. 1 in the UK · Series</span>
      <h1>${esc(a.title)} <em>tops the nation's watchlist</em></h1>
      <p class="stand">${esc(a.overview || '')}</p><p class="by">${[a.year, a.rating ? (+a.rating).toFixed(1) + '/10' : '', [...a.on].map((k) => svc(k).label).join(', ')].filter(Boolean).join(' · ')}</p></div></button>
    <aside class="side">${f ? `<span class="kick">No. 1 film</span><button class="second" data-k="${f.k}"><div class="pic">${art(f)}</div><div><h2>${esc(f.title)}</h2><p style="color:var(--mute);margin-top:8px">${meta(f)}</p></div></button>` : ''}
      <div class="label">Climbing this week</div>
      ${D.climbers.slice(0, 6).map((c) => `<button class="mvrow" data-k="${c.k}"><span class="fig up big" style="font-size:22px">+${c.by}</span><span><b>${esc(c.item.title)}</b><small>No. ${c.to} on ${esc(c.svc.label)}, from ${c.from}</small></span><span class="fig" style="color:var(--mute)">${c.k[0] === 't' ? 'TV' : 'FILM'}</span></button>`).join('')}
    </aside></div>
    <div class="label">The charts · Top 5 series by service <a href="top10.html">All charts →</a></div>
    <div class="cols">${SERVICES.map((s) => `<div class="col"><h3 style="--c:${s.color}"><i></i>${esc(s.label)}</h3><ol>${(D.charts[s.key]?.tv || []).slice(0, 5).map((x) => `<li><button data-k="${x.k}"><span class="n">${String(x.rank).padStart(2, '0')}</span><b>${esc(x.title)}</b>${mv(x)}</button></li>`).join('')}</ol></div>`).join('')}
      <div class="col"><h3 style="--c:var(--red)"><i></i>Films, all services</h3><ol>${D.charts.all.movie.slice(0, 5).map((x) => `<li><button data-k="${x.k}"><span class="n">${String(x.rank).padStart(2, '0')}</span><b>${esc(x.title)}</b>${mv(x)}</button></li>`).join('')}</ol></div></div>
    <div class="label">New this week</div>
    <table><thead><tr><th class="fig">Date</th><th>Title</th><th class="hide-s">What</th><th>Where</th></tr></thead><tbody>
      ${[...D.fresh].sort((x, y) => y.date.localeCompare(x.date)).map((x) => `<tr><td class="fig">${esc(when(x.date))}</td><td><b>${esc(x.title)}</b></td><td class="hide-s">${x.season ? `Season ${x.season}` : typeWord(x.type)}${x.original ? ' · Original' : ''}</td><td>${sw(x.svc)}</td></tr>`).join('')}</tbody></table>
    <div class="label" style="margin-top:36px">Leaving soon</div>
    <table><tbody>${D.leaving.map((x) => `<tr><td class="fig" style="width:1%">${esc(when(x.date))}</td><td><b>${esc(x.title)}</b></td><td>${sw(x.svc)}</td></tr>`).join('')}</tbody></table>
    <div class="label" style="margin-top:36px">At the cinema</div>
    <div class="strip">${(D.cinema.now || []).slice(0, 4).map((c) => `<div><div class="pic">${c.backdrop ? `<img class="art" src="${esc(c.backdrop)}" alt="" loading="lazy">` : art(c)}</div><b>${esc(c.title)}</b><small>${esc(c.cert || '')} · Out ${esc(when(c.date))}</small></div>`).join('')}</div>`;
}

function top10(D) {
  let s = qs('s') || 'all';
  app.innerHTML = `<div class="phead"><h1>Charts</h1><p>The ten most watched series and films in the UK, overall and on each service. Arrows compare with this time last week.</p></div>
    <div class="tabs" role="group" aria-label="Service">${[ALL, ...SERVICES].map((v) => `<button data-s="${v.key}" style="--c:${v.color}" aria-pressed="${v.key === s}">${esc(v.label)}</button>`).join('')}</div>
    <div class="pair" id="pair"></div>`;
  const tbl = (t, l) => `<div><div class="label">${t}<span class="fig" style="color:var(--mute);font-size:12px">${s === 'all' ? 'UK' : esc(svc(s).label)}</span></div><table class="rank"><tbody>${l.map((x) => `<tr data-k="${x.k}">
      <td class="n">${x.rank}</td><td style="width:56px"><div class="pic">${art(x)}</div></td><td><b>${esc(x.title)}</b><small>${meta(x)}</small></td><td class="fig" style="text-align:right">${mv(x)}</td></tr>`).join('')}</tbody></table></div>`;
  const draw = () => { $('#pair').innerHTML = tbl('Series', D.charts[s]?.tv || []) + tbl('Films', D.charts[s]?.movie || []); };
  draw();
  app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    s = b.dataset.s; app.querySelectorAll('[data-s]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    history.replaceState(null, '', '?s=' + s); buzz();
    document.startViewTransition ? document.startViewTransition(draw) : draw();
  });
}

function browse(D) {
  const st = { q: '', svcs: new Set(), g: new Set(), sort: 'pop', kind: '' };
  app.innerHTML = `<div class="phead"><h1>Browse</h1><p>The whole catalogue, in one place. Tick what you have; everything else falls away.</p></div>
    <div class="bro"><details class="fx" ${innerWidth > 760 ? 'open' : ''}><summary>Filters <span>+</span></summary><div class="filters">
      <label class="q">${icon('search', 18)}<span class="vh">Filter by title</span><input id="q" type="search" placeholder="Title"></label>
      <fieldset><legend>Showing</legend>${[['', 'Everything'], ['tv', 'Series'], ['movie', 'Films']].map(([v, l]) => `<label class="opt"><input type="radio" name="kind" value="${v}" ${v ? '' : 'checked'}>${l}</label>`).join('')}</fieldset>
      <fieldset><legend>Services</legend>${SERVICES.map((v) => `<label class="opt"><input type="checkbox" name="svc" value="${v.key}">${sw(v)}</label>`).join('')}</fieldset>
      <fieldset><legend>Genres</legend>${D.genres.map((g) => `<label class="opt"><input type="checkbox" name="g" value="${esc(g)}">${esc(g)}</label>`).join('')}</fieldset></div></details>
    <div><div class="count"><span id="n"></span><label><span class="vh">Sort</span><select id="sort"><option value="pop">Most popular</option><option value="new">Newest</option><option value="rate">Best rated</option><option value="az">A–Z</option></select></label></div>
      <div class="posters" id="grid"></div></div></div>`;
  const draw = () => {
    const l = D.catalogue.filter((x) => (!st.q || x.title.toLowerCase().includes(st.q)) && (!st.kind || x.type === st.kind) && (!st.svcs.size || [...st.svcs].some((k) => x.on.has(k))) && (!st.g.size || x.genres.some((g) => st.g.has(g))))
      .sort({ pop: (a, b) => b.pop - a.pop, new: (a, b) => (b.date || '').localeCompare(a.date || ''), rate: (a, b) => b.rating - a.rating, az: (a, b) => a.title.localeCompare(b.title) }[st.sort]);
    $('#n').textContent = `${l.length} title${l.length === 1 ? '' : 's'}`;
    $('#grid').innerHTML = l.map((x) => `<button data-k="${x.k}"><div class="pic">${art(x)}</div><b>${esc(x.title)}</b><small>${meta(x)}</small></button>`).join('') || '<p style="color:var(--mute)">Nothing matches those filters.</p>';
  };
  draw();
  app.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'q') st.q = t.value.trim().toLowerCase();
    else if (t.id === 'sort') st.sort = t.value;
    else if (t.name === 'kind') st.kind = t.value;
    else if (t.name === 'svc') t.checked ? st.svcs.add(t.value) : st.svcs.delete(t.value);
    else if (t.name === 'g') t.checked ? st.g.add(t.value) : st.g.delete(t.value);
    draw();
  });
}

function settings(D) {
  const on = new Set(P.get('services'));
  app.innerHTML = `<div class="phead"><h1>Settings</h1><p>Your paper, your way. Kept on this device.</p></div>
    <div class="form">
      <section><div class="label">Account</div><h2>Sign in</h2><p>Keep your Watchlist and alerts on every device.</p>
        <div class="acts"><button class="btn" data-demo>${icon('key', 18)}Use a passkey</button><button class="btn line" data-demo>Create an account</button></div></section>
      <section><div class="label">Edition</div><h2>Day or night</h2><p>Follow the device, or pick one.</p>
        ${['system', 'light', 'dark'].map((t) => `<label class="opt"><input type="radio" name="theme" value="${t}" ${P.get('theme') === t ? 'checked' : ''}>${{ system: 'Same as the device', light: 'Day (paper)', dark: 'Night (newsprint)' }[t]}</label>`).join('')}</section>
      <section><div class="label">My services</div><h2>What you pay for</h2><p>These lead the charts and Browse.</p>
        ${SERVICES.map((s) => `<label class="opt"><input type="checkbox" name="svc" value="${s.key}" ${on.has(s.key) ? 'checked' : ''}>${sw(s)}</label>`).join('')}</section>
      <section><div class="label">Watchlist</div><h2>Saved for later</h2>
        ${P.get('watchlist').length ? `<table><tbody>${P.get('watchlist').map((k) => D.all.get(k)).filter(Boolean).map((x) => `<tr data-k="${x.k}"><td><b>${esc(x.title)}</b></td><td class="fig" style="color:var(--mute)">${meta(x)}</td></tr>`).join('')}</tbody></table>` : '<p>Nothing saved yet. Open any title and choose Save.</p>'}</section>
    </div>`;
  app.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'theme') { P.set('theme', t.value); applyTheme(t.value); }
    if (t.name === 'svc') { t.checked ? on.add(t.value) : on.delete(t.value); P.set('services', [...on]); }
    buzz();
  });
}

function openSheet(D, k) {
  const x = D.detail(k), d = $('#sheet');
  if (!x) return;
  const saved = P.get('watchlist').includes(k);
  const streams = x.on.length ? x.on.map(svc) : x.stream.map((n) => ({ label: n, color: 'var(--mute)' }));
  d.innerHTML = `<div class="dr-top"><span>${x.rankIn[0] ? `No. ${x.rankIn[0].rank} ${x.rankIn[0].svc.key === 'all' ? 'in' : 'on'} ${esc(x.rankIn[0].svc.label)}` : typeWord(x.type)}</span><button data-close>Close ${icon('x', 16)}</button></div>
    <article class="dr-body"><span class="kick">${typeWord(x.type)}${x.genres[0] ? ' · ' + esc(x.genres[0]) : ''}</span><h2 tabindex="-1" autofocus style="outline:none">${esc(x.title)}</h2>
      ${x.tagline ? `<p class="stand">${esc(x.tagline)}</p>` : ''}
      <div class="dr-pic"><div class="pic">${art(x)}</div><dl class="facts">
        ${[['Year', x.year], ['Rating', x.rating ? (+x.rating).toFixed(1) + ' / 10' : ''], ['Certificate', x.cert], ['Length', x.runtime ? x.runtime + ' min' : x.seasons ? x.seasons + ' seasons' : ''], ['Genres', x.genres.join(', ')]].filter((r) => r[1]).map(([a, b]) => `<dt>${a}</dt><dd>${esc(b)}</dd>`).join('')}</dl></div>
      <p>${esc(x.overview || '')}</p>
      <div class="acts"><button class="btn" data-wl="${k}">${icon(saved ? 'check' : 'plus', 18)}${saved ? 'Saved' : 'Save'}</button><button class="btn line" data-share>${icon('share', 18)}Share</button></div>
      <div class="label">Where to watch</div><table><tbody>
        ${streams.map((s) => `<tr><td>${sw(s)}</td><td class="fig" style="text-align:right;color:var(--mute)">INCLUDED</td></tr>`).join('')}
        ${x.rent.map((n) => `<tr><td><b>${esc(n)}</b></td><td class="fig" style="text-align:right;color:var(--mute)">RENT</td></tr>`).join('')}
        ${x.buy.map((n) => `<tr><td><b>${esc(n)}</b></td><td class="fig" style="text-align:right;color:var(--mute)">BUY</td></tr>`).join('')}</tbody></table>
      ${x.rankIn.length ? `<div class="label" style="margin-top:28px">In the charts</div><table><tbody>${x.rankIn.map((r) => `<tr><td class="fig big" style="width:1%;padding-right:16px">${r.rank}</td><td><b>${esc(r.svc.label)}</b></td></tr>`).join('')}</tbody></table>` : ''}
    </article>`;
  d.onclick = (e) => {
    if (e.target === d || e.target.closest('[data-close]')) d.close();
    if (e.target.closest('[data-share]')) { share(x); toast('Link copied'); }
  };
  d.onclose = () => setT(null);
  d.open || d.showModal();
}

function wire(D) {
  const pal = $('#pal'), inp = $('input', pal), res = $('.res', pal);
  const draw = () => {
    const l = D.search(inp.value);
    res.innerHTML = !inp.value.trim() ? '' : l.length ? `<table class="rank"><tbody>${l.map((x) => `<tr data-k="${x.k}"><td style="width:56px"><div class="pic">${art(x)}</div></td><td><b>${esc(x.title)}</b><small>${meta(x)}</small></td></tr>`).join('')}</tbody></table>` : '<p style="color:var(--mute)">No titles found.</p>';
  };
  const openPal = () => { pal.showModal(); inp.select(); draw(); };
  inp.oninput = draw;
  pal.onclick = (e) => { if (e.target.closest('[data-close]')) pal.close(); };
  addEventListener('keydown', (e) => { if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))) { e.preventDefault(); openPal(); } });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-search]')) return openPal();
    if (e.target.closest('[data-flip]')) {
      const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      const t = dark ? 'light' : 'dark'; P.set('theme', t);
      document.startViewTransition ? document.startViewTransition(() => applyTheme(t)) : applyTheme(t);
      return;
    }
    if (e.target.closest('[data-demo]')) return toast('Accounts are off in this concept');
    const w = e.target.closest('[data-wl]');
    if (w) { const l = P.get('watchlist'), i = l.indexOf(w.dataset.wl); i < 0 ? l.push(w.dataset.wl) : l.splice(i, 1); P.set('watchlist', l); toast(i < 0 ? 'Saved to your Watchlist' : 'Removed'); buzz(); return openSheet(D, w.dataset.wl); }
    const c = e.target.closest('[data-k]');
    if (c && !c.closest('#sheet')) { if (pal.open) pal.close(); openSheet(D, c.dataset.k); setT(c.dataset.k); }
  });
}
function setT(k) { const u = new URL(location.href); k ? u.searchParams.set('t', k) : u.searchParams.delete('t'); history.replaceState(null, '', u); }
