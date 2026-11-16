// Concept 3 · Aura. Sidebar / tab bar, sheet and search are shared; the page's light follows the title in focus.
import { load, art, esc, icon, svc, SERVICES, typeWord, when, prefs, applyTheme, page, qs, share, buzz, hue, wide } from '../shared/tenner.js';

const P = prefs('aura');
applyTheme(P.get('theme'));
const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');
const TINTS = [250, 275, 300, 325, 350, 15, 200, 225, 185, 340];
const glow = (x) => x && document.body.style.setProperty('--h', TINTS[hue(x.title) % TINTS.length]);

const NAV = [['home', 'index.html', 'Home', 'home'], ['browse', 'browse.html', 'Browse', 'browse'], ['top10', 'top10.html', 'Top 10', 'chart'], ['settings', 'settings.html', 'Settings', 'gear']];
document.body.insertAdjacentHTML('afterbegin', `
  <nav class="side" aria-label="Tenner"><a class="logo" href="index.html" style="background:none">Tenner <small>Aura</small></a>
    <button class="srch frost" data-search>${icon('search', 16)}Search<kbd>⌘K</kbd></button>
    ${NAV.map(([p, h, l, i]) => `<a href="${h}" ${page() === p ? 'aria-current="page"' : ''}>${icon(i)}${l}</a>`).join('')}
    <h4>My services</h4>${SERVICES.filter((s) => P.get('services').includes(s.key)).slice(0, 5).map((s) => `<a href="top10.html?s=${s.key}"><span class="lg" style="--c:${s.color}"><i style="width:22px;font-size:8px">${esc(s.short)}</i></span>${esc(s.label)}</a>`).join('')}
    <div class="foot"><a href="settings.html">${icon('user')}Sign in</a></div></nav>`);
document.body.insertAdjacentHTML('beforeend', `
  <nav class="tabs frost" aria-label="Tenner">${NAV.map(([p, h, l, i]) => `<a href="${h}" ${page() === p ? 'aria-current="page"' : ''}>${icon(i, 22)}${l}</a>`).join('')}<button data-search>${icon('search', 22)}Search</button></nav>
  <dialog class="sheet frost" id="sheet" aria-label="Title"></dialog>
  <dialog class="find frost" id="pal" aria-label="Search"><label class="field">${icon('search')}<span class="vh">Search</span><input type="search" placeholder="Shows and films" autocomplete="off"></label><div class="res"></div></dialog>`);

const toast = (t, i = 'check') => { $('.toast')?.remove(); document.body.insertAdjacentHTML('beforeend', `<div class="toast frost" role="status">${icon(i, 18)}${esc(t)}</div>`); setTimeout(() => $('.toast')?.remove(), 2200); };
const meta = (x) => [typeWord(x.type), x.year, x.rating ? `★ ${(+x.rating).toFixed(1)}` : ''].filter(Boolean).join(' · ');
const where = (x) => [...(x.on || [])].map((k) => svc(k).label).join(', ');
const mv = (x) => x.mv == null ? '' : x.mv === 'new' ? '<span class="mv new">New</span>' : x.mv > 0 ? `<span class="mv up">▲ ${x.mv}</span>` : x.mv < 0 ? `<span class="mv down">▼ ${-x.mv}</span>` : '';
const row = (x, n) => `<li><button data-k="${x.k}">${n ? `<span class="n">${n}</span>` : '<span></span>'}<span class="pic">${art(x)}</span><span class="ln"><b>${esc(x.title)}</b><small>${esc([meta(x), where(x)].filter(Boolean).join(' · '))}</small></span>${mv(x)}</button></li>`;
const mhead = () => `<div class="mhead"><span>Tenner</span><button class="btn round" data-search aria-label="Search">${icon('search', 18)}</button></div>`;

load().then((D) => {
  ({ home, browse, top10, settings })[page()]?.(D);
  if (qs('t')) openSheet(D, qs('t'));
  wire(D);
});

function home(D) {
  const a = D.charts.all.tv[0];
  glow(a);
  const hr = new Date().getHours(), hi = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const mine = new Set(P.get('services'));
  app.innerHTML = `${mhead('Tenner')}<div class="head"><div><h1>${hi}</h1><p>Here's what the UK is watching tonight.</p></div></div>
    <div class="bento">
      <article class="tile spot frost"><div class="bgart">${wide(a) ? `<img class="art" src="${esc(wide(a))}" alt="">` : art(a)}</div>
        <div class="in"><span class="eye">${icon('spark', 16)}No. 1 in the UK</span><h1>${esc(a.title)}</h1><p>${esc(a.overview || '')}</p>
          <div class="row"><button class="btn" data-k="${a.k}">${icon('play', 18)}Where to watch</button><button class="btn btn-2nd" data-wl="${a.k}">${icon('plus', 18)}Watchlist</button></div></div></article>
      <section class="tile t10 frost"><h2>Top 10 <span class="dd"><select id="kind" aria-label="Shows or films"><option value="tv">Shows</option><option value="movie">Films</option></select></span></h2><ol class="cl" id="t10"></ol></section>
      <section class="tile new frost"><h2>New this week <a href="browse.html">See all</a></h2><div class="strip">${[...D.fresh].sort((x, y) => y.date.localeCompare(x.date)).map((x) => `<div><div class="pic">${art(x)}<span class="when">${esc(when(x.date))}</span></div><b>${esc(x.title)}</b><small>${esc(x.svc.label)}</small></div>`).join('')}</div></section>
      <section class="tile climb frost"><h2>Climbing</h2><ul class="cl">${D.climbers.slice(0, 3).map((c) => `<li><button data-k="${c.k}"><span class="mv up">▲${c.by}</span><span class="pic">${art(c.item)}</span><span class="ln"><b>${esc(c.item.title)}</b><small>No. ${c.to} on ${esc(c.svc.label)}</small></span><span></span></button></li>`).join('')}</ul></section>
      <section class="tile mine frost"><h2>My services <a href="settings.html">Edit</a></h2><div class="logos">${SERVICES.map((s) => `<a class="lg" href="top10.html?s=${s.key}" aria-pressed="${mine.has(s.key)}" style="--c:${s.color}"><i>${esc(s.short)}</i>${esc(s.label.replace(' to watch', ''))}</a>`).join('')}</div></section>
      <section class="tile leave frost"><h2>Leaving soon</h2><div class="strip">${D.leaving.map((x) => `<div><div class="pic">${art(x)}<span class="when">${esc(when(x.date))}</span></div><b>${esc(x.title)}</b><small>${esc(x.svc.label)}</small></div>`).join('')}</div></section>
      <section class="tile cine frost"><h2>In cinemas</h2><div class="strip wide">${(D.cinema.now || []).slice(0, 6).map((c) => `<div><div class="pic">${c.backdrop ? `<img class="art" src="${esc(c.backdrop)}" alt="" loading="lazy">` : art(c)}</div><b>${esc(c.title)}</b><small>${esc(c.cert || '')} · ${esc(when(c.date))}</small></div>`).join('')}</div></section>
    </div>`;
  const kind = $('#kind');
  kind.value = P.get('kind');
  const draw = () => { $('#t10').innerHTML = D.charts.all[kind.value].slice(0, 8).map((x) => row(x, x.rank)).join(''); };
  kind.onchange = () => { P.set('kind', kind.value); draw(); };
  draw();
  app.addEventListener('pointerover', (e) => { const k = e.target.closest('[data-k]')?.dataset.k; if (k) glow(D.all.get(k)); });
}

function top10(D) {
  let s = qs('s') || 'all', kind = P.get('kind');
  app.innerHTML = `${mhead('Top 10')}<div class="head"><div><h1>Top 10</h1><p>Swipe through what's most watched right now.</p></div>
    <div class="ctrls"><div class="svcrow" role="group" aria-label="Service">${[{ key: 'all', label: 'All', color: 'linear-gradient(135deg,#0a84ff,#bf5af2)' }, ...SERVICES].map((v) => `<button class="chip" data-s="${v.key}" aria-pressed="${v.key === s}"><i style="background:${v.color}"></i>${esc(v.label)}</button>`).join('')}</div>
      <span class="dd big"><select id="kind" aria-label="Shows or films"><option value="tv">Shows</option><option value="movie">Films</option></select></span></div></div>
    <div class="stage" id="stage"></div><div class="now frost" id="now"></div><ol class="cl two" id="list"></ol>`;
  $('#kind').value = kind;
  const stage = $('#stage');
  const draw = () => {
    const l = D.charts[s]?.[kind] || [];
    stage.innerHTML = l.map((x) => `<button class="cover" data-k="${x.k}" data-r="${x.rank}"><div class="pic">${art(x)}</div><span class="rk">${x.rank}</span></button>`).join('');
    $('#list').innerHTML = l.map((x) => row(x, x.rank)).join('');
    stage.scrollLeft = 0; focus(l[0]);
  };
  const focus = (x) => {
    if (!x) return;
    glow(x);
    $('#now').innerHTML = `<div><h2>${x.rank}. ${esc(x.title)}</h2><p>${esc(meta(x))}</p></div><button class="btn" data-k="${x.k}">${icon('play', 18)}Details</button>`;
  };
  let t;
  stage.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => {
    const mid = stage.getBoundingClientRect().left + stage.clientWidth / 2;
    const best = [...stage.children].sort((a, b) => Math.abs(a.getBoundingClientRect().left + 110 - mid) - Math.abs(b.getBoundingClientRect().left + 110 - mid))[0];
    if (best) { focus(D.charts[s][kind][best.dataset.r - 1]); buzz(); }
  }, 80); });
  stage.addEventListener('click', (e) => {   // tapping a cover off-centre brings it to the middle first
    const c = e.target.closest('.cover'); if (!c) return;
    const off = c.getBoundingClientRect().left + 110 - (stage.getBoundingClientRect().left + stage.clientWidth / 2);
    if (Math.abs(off) > 30) { e.stopPropagation(); stage.scrollBy({ left: off, behavior: 'smooth' }); }
  }, true);
  addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { if (document.querySelector('dialog[open]')) return; stage.scrollBy({ left: e.key === 'ArrowRight' ? 220 : -220, behavior: 'smooth' }); } });
  $('#kind').onchange = (e) => { kind = e.target.value; P.set('kind', kind); draw(); };
  app.addEventListener('click', (e) => {
    const c = e.target.closest('[data-s]'); if (!c) return;
    s = c.dataset.s; app.querySelectorAll('[data-s]').forEach((x) => x.setAttribute('aria-pressed', x === c));
    history.replaceState(null, '', '?s=' + s); buzz();
    document.startViewTransition ? document.startViewTransition(draw) : draw();
  });
  draw();
}

function browse(D) {
  const st = { q: '', kind: '', s: '', g: '', sort: 'pop' };
  glow(D.catalogue[0]);
  app.innerHTML = `${mhead('Browse')}<div class="head"><div><h1>Browse</h1><p>Every show and film on UK streaming, in one place.</p></div></div>
    <div class="sbar frost"><label class="field">${icon('search', 18)}<span class="vh">Search</span><input id="q" type="search" placeholder="Search titles"></label>
      <div class="seg" role="group" aria-label="Shows or films">${[['', 'Both'], ['tv', 'Shows'], ['movie', 'Films']].map(([v, l]) => `<button data-kind="${v}" aria-pressed="${!v}">${l}</button>`).join('')}</div>
      <span class="dd big"><select id="svc" aria-label="Service"><option value="">All services</option>${SERVICES.map((s) => `<option value="${s.key}">${esc(s.label)}</option>`).join('')}</select></span>
      <span class="dd big"><select id="g" aria-label="Genre"><option value="">All genres</option>${D.genres.map((g) => `<option>${esc(g)}</option>`).join('')}</select></span>
      <span class="dd big"><select id="sort" aria-label="Sort"><option value="pop">Popular</option><option value="new">Newest</option><option value="rate">Top rated</option><option value="az">A to Z</option></select></span></div>
    <div class="grid" id="grid"></div>`;
  const draw = () => {
    const l = D.catalogue.filter((x) => (!st.q || x.title.toLowerCase().includes(st.q)) && (!st.kind || x.type === st.kind) && (!st.s || x.on.has(st.s)) && (!st.g || x.genres.includes(st.g)))
      .sort({ pop: (a, b) => b.pop - a.pop, new: (a, b) => (b.date || '').localeCompare(a.date || ''), rate: (a, b) => b.rating - a.rating, az: (a, b) => a.title.localeCompare(b.title) }[st.sort]);
    $('#grid').innerHTML = l.map((x) => `<button data-k="${x.k}"><div class="pic">${art(x)}</div><b>${esc(x.title)}</b><small>${meta(x)}</small></button>`).join('') || '<p class="empty">Nothing matches. Try fewer filters.</p>';
  };
  draw();
  app.addEventListener('input', (e) => { const t = e.target; if (t.id === 'q') st.q = t.value.trim().toLowerCase(); else if (t.id in st) st[t.id] = t.value; else if (t.id === 'svc') st.s = t.value; draw(); });
  app.addEventListener('click', (e) => { const b = e.target.closest('[data-kind]'); if (!b) return; st.kind = b.dataset.kind; app.querySelectorAll('[data-kind]').forEach((x) => x.setAttribute('aria-pressed', x === b)); buzz(); draw(); });
  app.addEventListener('pointerover', (e) => { const k = e.target.closest('[data-k]')?.dataset.k; if (k) glow(D.all.get(k)); });
}

function settings(D) {
  const on = new Set(P.get('services'));
  const wl = P.get('watchlist').map((k) => D.all.get(k)).filter(Boolean);
  app.innerHTML = `${mhead('Settings')}<div class="head"><div><h1>Settings</h1><p>Kept on this device until you sign in.</p></div></div>
    <div class="groups">
      <section class="grp"><div class="card frost"><div class="acct"><span class="av">${icon('user', 26)}</span><span style="flex:1"><b>Sign in to Tenner</b><small style="color:var(--label2)">Your Watchlist and alerts, on every device.</small></span></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;padding-bottom:16px"><button class="btn" data-demo>${icon('key', 18)}Sign in with a passkey</button><button class="btn btn-2nd" data-demo>${icon('plus', 18)}Create account</button></div></div></section>
      <section class="grp"><h3>Appearance</h3><div class="card frost"><div class="r"><span>Theme</span><span class="dd" style="flex:none"><select id="theme" aria-label="Theme"><option value="system">Automatic</option><option value="light">Day</option><option value="dark">Night</option></select></span></div></div></section>
      <section class="grp"><h3>My services</h3><div class="card frost"><div class="r"><span>All services<small>Show everything, whatever you pay for</small></span><input type="checkbox" switch class="sw" id="allsvc" ${on.size === SERVICES.length ? 'checked' : ''} aria-label="All services"></div></div>
        <div class="card frost" style="margin-top:12px">${SERVICES.map((s) => `<label class="r"><span class="lg" style="--c:${s.color}"><i style="width:32px;font-size:10px">${esc(s.short)}</i></span><span>${esc(s.label)}</span><input type="checkbox" switch class="sw" data-svc="${s.key}" ${on.has(s.key) ? 'checked' : ''}></label>`).join('')}</div>
        <p class="foot">Your services lead Home, the Top 10 and Browse.</p></section>
      <section class="grp"><h3>Watchlist</h3><div class="card frost">${wl.length ? `<ul class="cl">${wl.map((x) => row(x)).join('')}</ul>` : '<div class="r"><span style="color:var(--label2)">Nothing yet. Tap Watchlist on any title.</span></div>'}</div></section>
      <section class="grp"><h3>Your data</h3><div class="bgrp"><button class="btn" data-demo>${icon('down', 18)}Import</button><button class="btn" data-demo>${icon('share', 18)}Export</button><button class="btn" data-clear style="color:#ff3b30">${icon('x', 18)}Clear all</button></div></section>
    </div>`;
  const th = $('#theme'); th.value = P.get('theme');
  th.onchange = () => { P.set('theme', th.value); document.startViewTransition ? document.startViewTransition(() => applyTheme(th.value)) : applyTheme(th.value); };
  app.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'allsvc') { SERVICES.forEach((s) => (t.checked ? on.add(s.key) : on.delete(s.key))); app.querySelectorAll('[data-svc]').forEach((x) => (x.checked = t.checked)); }
    if (t.dataset.svc) { t.checked ? on.add(t.dataset.svc) : on.delete(t.dataset.svc); $('#allsvc').checked = on.size === SERVICES.length; }
    P.set('services', [...on]); buzz(); toast('Saved');
  });
  app.addEventListener('click', (e) => { if (e.target.closest('[data-clear]')) { P.set('watchlist', []); settings(D); toast('Cleared'); } });
}

function openSheet(D, k) {
  const x = D.detail(k), d = $('#sheet');
  if (!x) return;
  glow(x);
  const saved = P.get('watchlist').includes(k);
  const streams = x.on.length ? x.on.map(svc) : x.stream.map((n) => ({ label: n, color: '#636366', short: n[0] }));
  d.innerHTML = `<div class="sh-top"><div class="pic">${art(x)}</div><div>
      <h2 tabindex="-1" autofocus style="outline:none">${esc(x.title)}</h2><div class="meta">${esc([typeWord(x.type), x.year, x.cert, x.runtime ? x.runtime + ' min' : x.seasons ? x.seasons + ' seasons' : '', x.genres.slice(0, 2).join(', ')].filter(Boolean).join(' · '))}</div>
      ${x.tagline ? `<p class="tag">${esc(x.tagline)}</p>` : ''}<p>${esc(x.overview || '')}</p>
      <div class="row"><button class="btn" data-wl="${k}">${icon(saved ? 'check' : 'plus', 18)}${saved ? 'On your Watchlist' : 'Watchlist'}</button><button class="btn btn-2nd" data-share>${icon('share', 18)}Share</button></div></div>
      <button class="btn round sh-x" data-close aria-label="Close">${icon('x', 18)}</button></div>
    <div class="sh-sec">${streams.length ? `<h3>Stream</h3><div class="box">${streams.map((s) => `<div class="r"><i style="--c:${s.color}">${esc(s.short)}</i><span>${esc(s.label)}</span><small>Included</small></div>`).join('')}</div>` : ''}
      ${x.rent.length || x.buy.length ? `<h3>Rent or buy</h3><div class="box">${[...new Set([...x.rent, ...x.buy])].map((n) => `<div class="r"><i style="--c:#48484a">${icon('ticket', 16)}</i><span>${esc(n)}</span><small>${x.rent.includes(n) ? 'Rent' : ''}${x.rent.includes(n) && x.buy.includes(n) ? ' or buy' : x.buy.includes(n) ? 'Buy' : ''}</small></div>`).join('')}</div>` : ''}
      ${x.rankIn.length ? `<h3>Charts</h3><div class="box">${x.rankIn.slice(0, 4).map((r) => `<div class="r"><i style="--c:${r.svc.color || '#0a84ff'}">${r.rank}</i><span>No. ${r.rank} ${r.svc.key === 'all' ? 'in' : 'on'} ${esc(r.svc.label)}</span></div>`).join('')}</div>` : ''}</div>`;
  d.onclick = (e) => {
    if (e.target === d || e.target.closest('[data-close]')) d.close();
    if (e.target.closest('[data-share]')) { share(x); toast('Link copied', 'share'); }
  };
  d.onclose = () => setT(null);
  d.open || d.showModal();
}

function wire(D) {
  const pal = $('#pal'), inp = $('input', pal), res = $('.res', pal);
  const draw = () => {
    const l = D.search(inp.value);
    res.innerHTML = !inp.value.trim() ? '<p class="hint">Search every chart and the whole catalogue. Press / or ⌘K anywhere.</p>' : l.length ? `<ul class="cl">${l.map((x) => row(x)).join('')}</ul>` : '<p class="hint">No results.</p>';
  };
  const openPal = () => { pal.showModal(); inp.select(); draw(); };
  inp.oninput = draw;
  pal.onclick = (e) => { if (e.target === pal) pal.close(); };
  addEventListener('keydown', (e) => { if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))) { e.preventDefault(); openPal(); } });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-search]')) return openPal();
    if (e.target.closest('[data-demo]')) return toast('Accounts are off in this concept', 'user');
    const w = e.target.closest('[data-wl]');
    if (w) { const l = P.get('watchlist'), i = l.indexOf(w.dataset.wl); i < 0 ? l.push(w.dataset.wl) : l.splice(i, 1); P.set('watchlist', l); buzz(); toast(i < 0 ? 'Added to your Watchlist' : 'Removed from your Watchlist'); if ($('#sheet').open) openSheet(D, w.dataset.wl); return; }
    const c = e.target.closest('[data-k]');
    if (c && !c.closest('#sheet')) { if (pal.open) pal.close(); openSheet(D, c.dataset.k); setT(c.dataset.k); }
  });
}
function setT(k) { const u = new URL(location.href); k ? u.searchParams.set('t', k) : u.searchParams.delete('t'); history.replaceState(null, '', u); }
