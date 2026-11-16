// Concept 1 · Marquee. Every page is drawn from the shared data layer; the dock, title sheet and search are shared here.
import { load, art, esc, icon, svc, SERVICES, typeWord, when, prefs, applyTheme, page, qs, share, buzz, wide } from '../shared/tenner.js';

const P = prefs('marquee');
applyTheme(P.get('theme'));
const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');

// chrome: top bar and the dock
const NAV = [['home', 'index.html', 'Home', 'home'], ['browse', 'browse.html', 'Browse', 'browse'], ['top10', 'top10.html', 'Top 10', 'chart'], ['settings', 'settings.html', 'Settings', 'gear']];
document.body.insertAdjacentHTML('afterbegin', `
  <header class="top"><a class="brand" href="index.html">Tenner <b>Marquee</b></a><span class="sp"></span>
    <button class="round" data-search aria-label="Search">${icon('search')}</button>
    <a class="round" href="settings.html" aria-label="Account">${icon('user')}</a></header>`);
document.body.insertAdjacentHTML('beforeend', `
  <nav class="dock" aria-label="Tenner">${NAV.map(([p, h, l, i]) => `<a href="${h}" ${page() === p ? 'aria-current="page"' : ''}>${icon(i)}<span>${l}</span></a>`).join('')}
    <button data-search>${icon('search')}<span>Search</span> <kbd>⌘K</kbd></button></nav>
  <dialog class="sheet" id="sheet" aria-label="Title"></dialog>
  <dialog class="pal" id="pal" aria-label="Search"><label class="field">${icon('search')}<span class="vh">Search</span><input type="search" placeholder="Shows, films, anything" autocomplete="off"></label><div class="res"></div></dialog>`);

const toast = (t) => { document.querySelector('.toast')?.remove(); document.body.insertAdjacentHTML('beforeend', `<div class="toast" role="status">${esc(t)}</div>`); setTimeout(() => document.querySelector('.toast')?.remove(), 2200); };
const meta = (x) => [typeWord(x.type), x.year, x.rating ? `★ ${(+x.rating).toFixed(1)}` : ''].filter(Boolean).join(' · ');
const card = (x, extra = '') => `<button class="card" data-k="${x.k}">${extra}<div class="pic">${art(x)}</div><div class="t">${esc(x.title)}</div><div class="m">${meta(x)}</div></button>`;
const mv = (x) => x.mv == null ? '' : x.mv === 'new' ? '<span class="mv new">New</span>' : x.mv > 0 ? `<span class="mv up">${icon('up', 14)}${x.mv}</span>` : x.mv < 0 ? `<span class="mv down">${icon('down', 14)}${-x.mv}</span>` : '<span class="mv">–</span>';
const where = (x) => [...(x.on || [])].filter((k) => k !== 'all').map(svc);

load().then((D) => {
  window.D = D;
  ({ home, browse, top10, settings })[page()]?.(D);
  if (qs('t')) openSheet(D, qs('t'));
  wire(D);
});

function home(D) {
  const picks = [['all', 'tv'], ['all', 'movie'], ['netflix', 'tv'], ['disney', 'movie'], ['hbomax', 'tv']].map(([s, t]) => ({ x: D.charts[s]?.[t]?.[0], s, t })).filter((p) => p.x);
  const kind = P.get('kind');
  app.innerHTML = `
    <div class="hero-w"><section class="hero" aria-label="Number ones">${picks.map(({ x, s }, i) => {
      const c = s === 'all' ? '#ff375f' : svc(s).color;
      return `<article class="slide" id="s${i}"><div class="bg">${wide(x) ? `<img src="${esc(wide(x))}" alt="" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>` : art(x)}</div>
      <div class="copy"><span class="eyebrow" style="--c:${c}"><span class="dot"></span>No. 1 ${s === 'all' ? 'in the UK' : 'on ' + esc(svc(s).label)} · ${typeWord(x.type)}</span>
        <${i ? 'h2' : 'h1'}>${esc(x.title)}</${i ? 'h2' : 'h1'}><p>${esc(x.overview || '')}</p>
        <div class="acts"><button class="cta" data-k="${x.k}">${icon('play')}Where to watch</button><button class="cta ghost" data-wl="${x.k}">${icon('plus')}Watchlist</button></div></div></article>`;
    }).join('')}</section>
    <div class="dots" role="tablist">${picks.map((_, i) => `<button aria-label="Slide ${i + 1}" data-go="${i}" ${i ? '' : 'aria-current="true"'}></button>`).join('')}</div></div>
    <section class="s"><div class="sh"><h2>Top 10 <em>in the UK</em></h2><div class="seg" role="group" aria-label="Shows or films">
      <button aria-pressed="${kind === 'tv'}" data-kind="tv">Series</button><button aria-pressed="${kind === 'movie'}" data-kind="movie">Films</button></div></div>
      <div class="shelf ranked" id="rk"></div></section>
    <section class="s"><div class="sh"><h2>New <em>this week</em></h2><a href="browse.html?sort=new">All new ${icon('right', 16)}</a></div>
      <div class="days">${days(D.fresh)}</div></section>
    ${SERVICES.slice(0, 4).map((s) => `<section class="s"><div class="sh"><h2>${esc(s.label)}</h2><a href="top10.html?s=${s.key}">Top 10 ${icon('right', 16)}</a></div>
      <div class="shelf">${(D.charts[s.key]?.tv || []).slice(0, 10).map((x) => card(x)).join('')}</div></section>`).join('')}
    <section class="s"><div class="sh"><h2>In <em>cinemas</em></h2></div><div class="shelf">${(D.cinema.now || []).slice(0, 8).map((f) => `<div class="wcard">${f.backdrop ? `<img class="art" src="${esc(f.backdrop)}" alt="" loading="lazy">` : art(f)}<div class="cap"><b>${esc(f.title)}</b><small>${esc(f.cert || '')} · Out ${esc(when(f.date))}</small></div></div>`).join('')}</div></section>
    <section class="s"><div class="sh"><h2>Leaving <em>soon</em></h2></div><div class="shelf">${D.leaving.map((x) => `<div class="card"><div class="pic">${art(x)}</div><div class="t">${esc(x.title)}</div><div class="m">${esc(x.svc.label)} · ${esc(when(x.date))}</div></div>`).join('')}</div></section>`;
  const rk = () => { $('#rk').innerHTML = D.charts.all[P.get('kind')].map((x) => card(x, `<span class="n" aria-hidden="true">${x.rank}</span>`)).join(''); };
  rk();
  app.addEventListener('click', (e) => { const b = e.target.closest('[data-kind]'); if (!b) return; P.set('kind', b.dataset.kind); app.querySelectorAll('[data-kind]').forEach((x) => x.setAttribute('aria-pressed', x === b)); rk(); buzz(); });
  const hero = $('.hero'), dots = [...document.querySelectorAll('.dots button')];
  const obs = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) dots.forEach((d, i) => d.toggleAttribute('aria-current', 's' + i === e.target.id)); }), { root: hero, threshold: .6 });
  document.querySelectorAll('.slide').forEach((s) => obs.observe(s));
  dots.forEach((d) => d.onclick = () => hero.scrollTo({ left: hero.clientWidth * d.dataset.go, behavior: 'smooth' }));
}

function days(items) {
  const by = new Map();
  for (const x of [...items].sort((a, b) => a.date.localeCompare(b.date))) { if (!by.has(x.date)) by.set(x.date, []); by.get(x.date).push(x); }
  return [...by].map(([d, l]) => `<div class="day"><h3><small>${new Date(d + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</small>${esc(when(d))}</h3>
    ${l.map((x) => `<div class="row"><span class="pic">${art(x)}</span><span><b>${esc(x.title)}</b><small>${x.season ? `Season ${x.season}` : typeWord(x.type)} · </small><span class="pill" style="--c:${x.svc.color}"><i></i>${esc(x.svc.label)}</span></span></div>`).join('')}</div>`).join('');
}

function top10(D) {
  let s = qs('s') || 'all', kind = P.get('kind');
  app.innerHTML = `<div class="ph-head"><h1>The Top 10</h1><p>What the UK is watching right now, service by service. Updated every hour.</p></div>
    <div class="bar"><div class="chips" role="group" aria-label="Service">${[{ key: 'all', label: 'Everywhere', color: '#ff375f' }, ...SERVICES].map((v) => `<button class="chip" data-s="${v.key}" style="--c:${v.color}" aria-pressed="${v.key === s}"><i></i>${esc(v.label)}</button>`).join('')}</div>
    <div class="seg" role="group" aria-label="Shows or films"><button data-kind="tv" aria-pressed="${kind === 'tv'}">Series</button><button data-kind="movie" aria-pressed="${kind === 'movie'}">Films</button></div></div>
    <div class="t10" id="t10"></div>`;
  const draw = () => {
    const l = D.charts[s]?.[kind] || [], [a, ...rest] = l;
    if (!a) { $('#t10').innerHTML = '<p class="empty">Nothing charting here yet.</p>'; return; }
    $('#t10').innerHTML = `<button class="lead" data-k="${a.k}">${wide(a) ? `<img class="art" src="${esc(wide(a))}" alt="">` : art(a)}<div class="in"><div class="big">1</div><h2>${esc(a.title)}</h2><p>${meta(a)}</p></div></button>
      <ol class="list">${rest.map((x) => `<li><button data-k="${x.k}"><span class="n">${x.rank}</span><span class="pic">${art(x)}</span><span><b>${esc(x.title)}</b><small>${meta(x)}</small></span>${mv(x)}</button></li>`).join('')}</ol>`;
  };
  draw();
  app.addEventListener('click', (e) => {
    const c = e.target.closest('[data-s]'), k = e.target.closest('[data-kind]');
    if (c) { s = c.dataset.s; app.querySelectorAll('[data-s]').forEach((x) => x.setAttribute('aria-pressed', x === c)); history.replaceState(null, '', '?s=' + s); }
    if (k) { kind = k.dataset.kind; P.set('kind', kind); app.querySelectorAll('[data-kind]').forEach((x) => x.setAttribute('aria-pressed', x === k)); }
    if (c || k) { buzz(); document.startViewTransition ? document.startViewTransition(draw) : draw(); }
  });
}

function browse(D) {
  const st = { q: '', g: '', s: '', sort: qs('sort') || 'pop' };
  app.innerHTML = `<div class="ph-head"><h1>Browse</h1><p>Everything streaming in the UK, on the services you choose.</p></div>
    <div class="bar"><label class="field">${icon('search')}<span class="vh">Filter</span><input id="q" type="search" placeholder="Filter by title"></label>
      <select class="sel" id="svc" aria-label="Service"><option value="">All services</option>${SERVICES.map((s) => `<option value="${s.key}">${esc(s.label)}</option>`).join('')}</select>
      <select class="sel" id="sort" aria-label="Sort"><option value="pop">Most popular</option><option value="new">Newest</option><option value="rate">Highest rated</option><option value="az">A to Z</option></select>
      <div class="chips" role="group" aria-label="Genre"><button class="chip" data-g="" aria-pressed="true">All</button>${D.genres.map((g) => `<button class="chip" data-g="${esc(g)}">${esc(g)}</button>`).join('')}</div></div>
    <div class="grid" id="grid"></div>`;
  $('#sort').value = st.sort;
  const draw = () => {
    let l = D.catalogue.filter((x) => (!st.q || x.title.toLowerCase().includes(st.q)) && (!st.g || x.genres.includes(st.g)) && (!st.s || x.on.has(st.s)));
    const f = { pop: (a, b) => b.pop - a.pop, new: (a, b) => (b.date || '').localeCompare(a.date || ''), rate: (a, b) => b.rating - a.rating, az: (a, b) => a.title.localeCompare(b.title) }[st.sort];
    l = l.sort(f);
    $('#grid').innerHTML = l.length ? l.map((x) => card(x)).join('') : '<p class="empty">Nothing matches. Try another genre or service.</p>';
  };
  draw();
  $('#q').oninput = (e) => { st.q = e.target.value.trim().toLowerCase(); draw(); };
  $('#svc').onchange = (e) => { st.s = e.target.value; draw(); };
  $('#sort').onchange = (e) => { st.sort = e.target.value; draw(); };
  app.addEventListener('click', (e) => { const g = e.target.closest('[data-g]'); if (!g) return; st.g = g.dataset.g; app.querySelectorAll('[data-g]').forEach((x) => x.setAttribute('aria-pressed', x === g)); buzz(); draw(); });
}

function settings(D) {
  const on = new Set(P.get('services'));
  app.innerHTML = `<div class="ph-head"><h1>Settings</h1><p>Make Tenner yours. Saved on this device.</p></div>
    <div class="set">
      <div class="panel"><div class="acct"><span class="avatar">${icon('user', 28)}</span><div><h2>Your account</h2><p style="color:var(--mute)">Sign in to sync your Watchlist and alerts.</p></div></div>
        <div class="acts" style="margin:0"><button class="cta" data-demo>${icon('key')}Sign in with a passkey</button><button class="cta ghost" data-demo>Create account</button></div></div>
      <div class="panel"><h2>Appearance</h2><p>Marquee is made for the dark, but there's a matinee too.</p>
        <div class="seg" role="group" aria-label="Theme">${['system', 'light', 'dark'].map((t) => `<button data-theme="${t}" aria-pressed="${P.get('theme') === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>
      <div class="panel" style="grid-column:1/-1"><h2>My services</h2><p>Pick what you pay for and Tenner leads with them.</p>
        <div class="svcs">${SERVICES.map((s) => `<button class="chip" data-svc="${s.key}" style="--c:${s.color}" aria-pressed="${on.has(s.key)}"><i></i>${esc(s.label)}</button>`).join('')}</div></div>
      <div class="panel" style="grid-column:1/-1"><h2>Watchlist</h2><p>${P.get('watchlist').length ? '' : 'Nothing saved yet. Tap Watchlist on any title.'}</p><div class="shelf" style="padding:0;mask:none">${P.get('watchlist').map((k) => D.all.get(k)).filter(Boolean).map((x) => card(x)).join('')}</div></div>
    </div>`;
  app.addEventListener('click', (e) => {
    const t = e.target.closest('[data-theme]'), s = e.target.closest('[data-svc]');
    if (t) { P.set('theme', t.dataset.theme); applyTheme(t.dataset.theme); app.querySelectorAll('[data-theme]').forEach((x) => x.setAttribute('aria-pressed', x === t)); }
    if (s) { on.has(s.dataset.svc) ? on.delete(s.dataset.svc) : on.add(s.dataset.svc); s.setAttribute('aria-pressed', on.has(s.dataset.svc)); P.set('services', [...on]); }
    if (e.target.closest('[data-demo]')) toast('Accounts are switched off in this concept');
    if (t || s) buzz();
  });
}

function openSheet(D, k) {
  const x = D.detail(k), d = $('#sheet');
  if (!x) return;
  const inWl = P.get('watchlist').includes(k);
  const svcs = x.on.length ? x.on.map(svc) : x.stream.map((n) => ({ label: n, color: '#636366', short: n[0] }));
  d.innerHTML = `<div class="sh-hero">${wide(x) ? `<img class="art" src="${esc(wide(x))}" alt="">` : art(x)}<button class="round sh-x" data-close aria-label="Close">${icon('x')}</button><h2 tabindex="-1" autofocus>${esc(x.title)}</h2></div>
    <div class="sh-body"><div><div class="meta">${[typeWord(x.type), x.year, x.cert, x.runtime ? x.runtime + ' min' : '', x.seasons ? x.seasons + ' seasons' : ''].filter(Boolean).map((m) => `<span>${esc(m)}</span>`).join('<span>·</span>')}
      ${x.rating ? `<span class="pill">★ ${(+x.rating).toFixed(1)}</span>` : ''}</div>
      ${x.tagline ? `<p class="tag">${esc(x.tagline)}</p>` : ''}<p>${esc(x.overview || '')}</p>
      <div class="acts"><button class="cta" data-wl="${k}">${icon(inWl ? 'check' : 'plus')}${inWl ? 'On your Watchlist' : 'Watchlist'}</button><button class="cta ghost" data-share>${icon('share')}Share</button></div></div>
      <div class="where">${svcs.length ? `<h3>Stream it on</h3><ul>${svcs.map((s) => `<li><span class="lg" style="--c:${s.color}">${esc(s.short)}</span>${esc(s.label)}</li>`).join('')}</ul>` : ''}
        ${x.rent.length ? `<h3>Rent or buy</h3><ul>${x.rent.map((n) => `<li><span class="lg" style="--c:#48484a">${icon('ticket', 16)}</span>${esc(n)}</li>`).join('')}</ul>` : ''}
        ${x.rankIn.length ? `<h3>In the charts</h3><ul>${x.rankIn.slice(0, 3).map((r) => `<li><span class="lg" style="--c:${r.svc.color || '#ff375f'}">${r.rank}</span>No. ${r.rank} ${r.svc.key === 'all' ? 'in' : 'on'} ${esc(r.svc.label)}</li>`).join('')}</ul>` : ''}</div></div>`;
  d.onclick = (e) => {
    if (e.target === d || e.target.closest('[data-close]')) d.close();
    if (e.target.closest('[data-share]')) { share(x); toast('Link ready to share'); }
  };
  d.onclose = () => setT(null);
  d.open || d.showModal();
  d.scrollTop = 0;
}

function wire(D) {
  const pal = $('#pal'), inp = $('input', pal), res = $('.res', pal);
  const draw = () => {
    const l = D.search(inp.value);
    res.innerHTML = !inp.value.trim() ? `<p class="hint">Try "${esc(D.charts.all.tv[0]?.title || 'Brass Monkeys')}". Press / or ⌘K from anywhere.</p>`
      : l.length ? l.map((x) => `<button class="row" data-k="${x.k}"><span class="pic">${art(x)}</span><span><b>${esc(x.title)}</b><small>${meta(x)}</small></span></button>`).join('') : '<p class="hint">No matches.</p>';
  };
  const openPal = () => { pal.showModal(); inp.select(); draw(); };
  inp.oninput = draw;
  pal.onclick = (e) => { if (e.target === pal) pal.close(); };
  addEventListener('keydown', (e) => {
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))) { e.preventDefault(); openPal(); }
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-search]')) return openPal();
    const w = e.target.closest('[data-wl]');
    if (w) {
      const k = w.dataset.wl, l = P.get('watchlist'), i = l.indexOf(k);
      i < 0 ? l.push(k) : l.splice(i, 1); P.set('watchlist', l); buzz();
      toast(i < 0 ? 'Added to your Watchlist' : 'Removed from your Watchlist');
      if ($('#sheet').open) openSheet(D, k);
      return;
    }
    const c = e.target.closest('[data-k]');
    if (c) { if (pal.open) pal.close(); openSheet(D, c.dataset.k); setT(c.dataset.k); }
  });
}

function setT(k) {
  const u = new URL(location.href);
  k ? u.searchParams.set('t', k) : u.searchParams.delete('t');
  history.replaceState(null, '', u);
}
