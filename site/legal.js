// Tenner's Help Centre (legal.html). Every article is written in the page, grouped into topics, so it reads top to
// bottom without this script. Here it becomes a help centre: a home (topics, popular articles, promises, ways to reach
// us), a topic's list, an article with the topics beside it, and search that runs on this device as you type. The
// address's #part is the route (#privacy, #c-account, #search=…), so old links, Back and bookmarks all work.
// System status and Your device are read live, only from this device, and nothing is sent unless you choose to.
(() => {
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = window.tn?.esc || ((s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const hq = $('.hq'); if (!hq) return;
  const view = $('#hqView'), nav = $('#hqNav'), crumbs = $('#hqCrumbs'), after = $('#hqAfter'), more = $('#hqMore');
  const qi = $('#hqQ'), qx = $('#hqX'), pop = $('#hqPop');
  const still = () => document.documentElement.classList.contains('still');
  const EMAIL = 'support@tenner.stream';

  const ic = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const IC = {
    spark: ic('<path d="M12 3.5l1.9 5 5 1.9-5 1.9-1.9 5-1.9-5-5-1.9 5-1.9z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'),
    person: ic('<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.9-3.7 3.7-5.6 7-5.6s6.1 1.9 7 5.6"/>'),
    bell: ic('<path d="M6.2 16.5v-5a5.8 5.8 0 0 1 11.6 0v5l1.6 2H4.6z"/><path d="M10 20.8a2.2 2.2 0 0 0 4 0"/>'),
    wrench: ic('<path d="M14.8 5.2a4.2 4.2 0 0 0-5.3 5.4L4.4 15.7a1.9 1.9 0 0 0 2.7 2.7l5.1-5.1a4.2 4.2 0 0 0 5.4-5.3l-2.6 2.6-2.3-.5-.5-2.3z"/>'),
    hand: ic('<path d="M12 3.2 5.2 6v5.4c0 4.3 2.9 8 6.8 9.4 3.9-1.4 6.8-5.1 6.8-9.4V6z"/><path d="M9 12l2.2 2.2L15.3 10"/>'),
    doc: ic('<path d="M7 3.5h6.8L18.5 8v12.5H7z"/><path d="M13.5 3.7V8.3h4.8M10 12.5h5.5M10 16h5.5"/>'),
    chip: ic('<rect x="6.5" y="6.5" width="11" height="11" rx="2.2"/><path d="M10 10h4v4h-4zM9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3"/>'),
    chat: ic('<path d="M4.5 6.8A2.3 2.3 0 0 1 6.8 4.5h10.4a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1-2.3 2.3H10l-4 3.3v-3.3h.8a2.3 2.3 0 0 1-2.3-2.3z"/>'),
    mail: ic('<rect x="3.5" y="5.5" width="17" height="13" rx="2.2"/><path d="m4.5 7 7.5 6 7.5-6"/>'),
    bug: ic('<path d="M8.5 9.5h7v5a3.5 3.5 0 0 1-7 0z"/><path d="M9.5 9.5a2.5 2.5 0 0 1 5 0M12 12v5M4.5 12h4M15.5 12h4M5.5 7.5l3 2M18.5 7.5l-3 2M5.5 18l3-2M18.5 18l-3-2"/>'),
    bulb: ic('<path d="M12 3.5a5.8 5.8 0 0 0-3.5 10.4c.7.5 1 1.2 1 2V17h5v-1.1c0-.8.3-1.5 1-2A5.8 5.8 0 0 0 12 3.5z"/><path d="M9.8 20.3h4.4"/>'),
    check: ic('<path d="M6 12.5l4 4 8-9"/>'),
    home: ic('<path d="M4 10.4 12 4l8 6.4V20h-5v-5.6H9V20H4z"/>'),
    search: ic('<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.6 15.6 4.6 4.6"/>'),
  };
  const CHEV = '<span class="hq-chev" aria-hidden="true"></span>';

  // ---------- the library, read from the page
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘']/g, '');
  const cats = $$('.hq-cat').map((el) => ({ id: el.id, el, c: el.dataset.c, ic: IC[el.dataset.ic] || IC.doc,
    title: $('.hq-cat-h h2', el).textContent.trim(), sub: $('.hq-cat-h p', el).textContent.trim(), arts: [] }));
  const arts = [];
  for (const c of cats) {
    for (const el of $$('.hq-art', c.el)) {
      const h = $('h2', el), text = el.textContent.replace(/\s+/g, ' ').trim().slice(h.textContent.trim().length).trim();
      const first = el.dataset.sum || [...el.children].find((n) => n.matches('p:not(.hq-meta), ul, ol'))?.textContent.replace(/\s+/g, ' ').trim() || '';
      const a = { id: el.id, el, cat: c, title: h.textContent.trim(), text, first: first.length > 118 ? `${first.slice(0, 115).replace(/\s+\S*$/, '')}…` : first,
        k: el.dataset.k || '', pop: el.hasAttribute('data-pop'), upd: el.dataset.upd };
      a.nt = norm(a.title); a.nk = norm(a.k); a.nx = norm(text);
      c.arts.push(a); arts.push(a);
    }
  }
  const byId = new Map(arts.map((a) => [a.id, a])), catById = new Map(cats.map((c) => [c.id, c]));

  // long documents: when they were updated, how long they take to read, and their own contents
  for (const a of arts) {
    const h = $('h2', a.el), h3s = $$('h3', a.el);
    if (a.upd) {
      const mins = Math.max(1, Math.round(a.text.split(' ').length / 230));
      h.insertAdjacentHTML('afterend', `<p class="hq-meta">Updated ${esc(a.upd)} · ${mins} min read</p>`);
    }
    if (h3s.length >= 4) {
      h3s.forEach((x, i) => { if (!x.id) x.id = `${a.id}-${i + 1}`; });
      (a.el.querySelector('.hq-meta') || h).insertAdjacentHTML('afterend', `<nav class="hq-toc" aria-label="In this ${a.id === 'terms' ? 'document' : 'policy'}"><p>On this page</p><ol>${h3s.map((x) => `<li><a href="#${x.id}">${esc(x.textContent.replace(/^\d+\.\s*/, ''))}</a></li>`).join('')}</ol></nav>`);
    }
  }
  $$('.hq-year').forEach((y) => { y.textContent = new Date().getFullYear(); });

  // ---------- pieces
  const row = (a, withCat) => `<li><a href="#${a.id}"><span class="gi" style="--c:${a.cat.c}">${a.cat.ic}</span><span class="tx">${withCat ? `<small class="hq-in">${esc(a.cat.title)}</small>` : ''}<b>${esc(a.title)}</b><small>${esc(a.first)}</small></span>${CHEV}</a></li>`;
  const contactRows = () => `<ul class="hq-rows">
      <li><a href="contact.html"><span class="gi" style="--c:#0a84ff">${IC.chat}</span><span class="tx"><b>Send us a message</b><small>A real person reads every one, usually replying within a day</small></span>${CHEV}</a></li>
      <li><a href="contact.html?about=Support" data-details><span class="gi" style="--c:#ff9f0a">${IC.bug}</span><span class="tx"><b>Report a problem</b><small>With your device details added for you</small></span>${CHEV}</a></li>
      <li><a href="contact.html?about=Suggestions"><span class="gi" style="--c:#bf5af2">${IC.bulb}</span><span class="tx"><b>Suggest an idea</b><small>Plenty of Tenner started as someone’s idea</small></span>${CHEV}</a></li>
      <li><a href="mailto:${EMAIL}"><span class="gi" style="--c:#30d158">${IC.mail}</span><span class="tx"><b>Email us</b><small>${EMAIL}</small></span>${CHEV}</a></li>
    </ul>`;

  const home = () => `
    <section class="hq-sec" aria-labelledby="hqTopicsH"><h2 class="hq-h" id="hqTopicsH">Browse help topics</h2>
      <ul class="hq-cats">${cats.map((c) => `<li><a class="hq-card" href="#${c.id}" style="--c:${c.c}"><span class="gi">${c.ic}</span><b>${esc(c.title)}</b><small>${esc(c.sub)}</small><span class="hq-n">${c.arts.length} articles${CHEV}</span></a></li>`).join('')}
        <li><a class="hq-card" href="contact.html" style="--c:#ff375f"><span class="gi">${IC.chat}</span><b>Contact us</b><small>Can’t find what you need? Write to us and a real person will reply.</small><span class="hq-n">Usually within a day${CHEV}</span></a></li></ul>
    </section>
    <section class="hq-sec" aria-labelledby="hqPopH"><h2 class="hq-h" id="hqPopH">Popular articles</h2>
      <ul class="hq-list">${arts.filter((a) => a.pop).map((a) => row(a, true)).join('')}</ul>
    </section>
    <div class="hq-two">
      <section class="hq-sec hq-box" aria-labelledby="hqPromH"><h2 class="hq-h" id="hqPromH">Our privacy promises</h2>
        <ul class="hq-promise">${$$('#privacy-glance .hq-promise li').map((li) => `<li>${li.innerHTML}</li>`).join('')}</ul>
        <p class="hq-links"><a href="#privacy">Privacy Policy</a><a href="#terms">Terms of Service</a><a href="#cookies">Cookies</a><a href="#copyright">Copyright</a><a href="#credits">Credits</a><a href="#accessibility">Accessibility</a></p>
      </section>
      <section class="hq-sec hq-box" aria-labelledby="hqContactH"><h2 class="hq-h" id="hqContactH">Still need help?</h2>${contactRows()}</section>
    </div>`;

  const catPage = (c) => `<header class="hq-cat-top" style="--c:${c.c}"><span class="gi">${c.ic}</span><div><h1>${esc(c.title)}</h1><p>${esc(c.sub)}</p></div></header>
    <ul class="hq-list hq-one">${c.arts.map((a) => row(a)).join('')}</ul>`;

  // ---------- search, on this device
  const score = (a, words) => {
    let s = 0;
    for (const w of words) {
      let t = 0;
      if (a.nt.includes(w)) t += 10 + (new RegExp(`(^|\\s)${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(a.nt) ? 6 : 0);
      if (a.nk.includes(w)) t += 6;
      if (a.cat.title.toLowerCase().includes(w)) t += 2;
      if (a.nx.includes(w)) t += Math.min(3, a.nx.split(w).length - 1);
      if (!t) return 0;
      s += t;
    }
    return s + (a.pop ? 1 : 0);
  };
  const snippet = (a, words) => {
    const lo = a.text.toLowerCase(), hit = words.map((w) => lo.indexOf(w)).filter((i) => i >= 0).sort((x, y) => x - y)[0];
    if (hit == null || hit < 0 || a.title.toLowerCase().includes(words[0]) && hit > 300) return esc(a.first);
    const from = Math.max(0, hit - 50), raw = (from ? '…' : '') + a.text.slice(from, from + 150).replace(/^\S*\s/, from ? '' : '$&') + (from + 150 < a.text.length ? '…' : '');
    const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return raw.split(re).map((p, i) => (i % 2 ? `<mark>${esc(p)}</mark>` : esc(p))).join('');
  };
  const results = (q) => {
    const words = norm(q).split(/\s+/).filter((w) => w.length > 1 || /\d/.test(w));
    if (!words.length) return home();
    const found = arts.map((a) => [a, score(a, words)]).filter(([, s]) => s).sort((x, y) => y[1] - x[1]).slice(0, 12);
    if (!found.length) return `<div class="hq-empty"><span class="gi" style="--c:#8e8e93">${IC.search}</span><h2>No results for “${esc(q)}”</h2>
      <p>Try different words, or browse the topics below. Or just ask us: a real person will reply.</p>
      <p class="hq-links hq-mid"><a href="#">Help Centre home</a><a href="contact.html?about=Support">Ask us</a></p></div>
      <section class="hq-sec"><h2 class="hq-h">Popular articles</h2><ul class="hq-list">${arts.filter((a) => a.pop).map((a) => row(a, true)).join('')}</ul></section>`;
    return `<h2 class="hq-h hq-rh">${found.length === 1 ? '1 result' : `${found.length} results`} for “${esc(q)}”</h2>
      <ul class="hq-list hq-one hq-res">${found.map(([a]) => `<li><a href="#${a.id}"><span class="gi" style="--c:${a.cat.c}">${a.cat.ic}</span><span class="tx"><small class="hq-in">${esc(a.cat.title)}</small><b>${esc(a.title)}</b><small>${snippet(a, words)}</small></span>${CHEV}</a></li>`).join('')}</ul>`;
  };

  // ---------- the topics beside an article (computers)
  nav.innerHTML = `<a class="hq-nav-home" href="#"><span class="gi" style="--c:#8e8e93">${IC.home}</span>Help Centre</a>
    ${cats.map((c) => `<details data-cat="${c.id}"><summary><span class="gi" style="--c:${c.c}">${c.ic}</span><span>${esc(c.title)}</span></summary>
      <ul>${c.arts.map((a) => `<li><a href="#${a.id}" data-art="${a.id}"><span>${esc(a.title)}</span></a></li>`).join('')}</ul></details>`).join('')}`;

  // ---------- routes
  let shown = null;
  const route = (how = {}) => {
    const h = decodeURIComponent(location.hash.slice(1));
    let v = 'home', art = null, cat = null, target = null, q = '';
    if (h.startsWith('search=')) { v = 'search'; q = h.slice(7); }
    else if (catById.has(h)) { v = 'cat'; cat = catById.get(h); }
    else if (byId.has(h)) { v = 'art'; art = byId.get(h); cat = art.cat; }
    else if (h) { const el = document.getElementById(h), a = el?.closest('.hq-art'); if (a && byId.has(a.id)) { v = 'art'; art = byId.get(a.id); cat = art.cat; target = el; } }
    const key = `${v}|${art?.id || cat?.id || q}`;
    const draw = () => {
      hq.dataset.v = v;
      hq.style.setProperty('--tone', cat?.c || '#0a84ff');
      $$('.hq-cat.on, .hq-art.on').forEach((x) => x.classList.remove('on'));
      if (art) { art.el.classList.add('on'); cat.el.classList.add('on'); }
      view.innerHTML = v === 'home' ? home() : v === 'search' ? results(q) : v === 'cat' ? catPage(cat) : '';
      view.hidden = v === 'art';
      pop.hidden = v !== 'home';
      if (document.activeElement !== qi) { qi.value = q; qx.hidden = !q; }
      // where you are
      crumbs.hidden = !(cat);
      crumbs.innerHTML = cat ? `<a href="#">Help Centre</a><span aria-hidden="true">›</span>${art ? `<a href="#${cat.id}">${esc(cat.title)}</a><span aria-hidden="true">›</span><span aria-current="page">${esc(art.title)}</span>` : `<span aria-current="page">${esc(cat.title)}</span>`}` : '';
      $$('details', nav).forEach((d) => { d.open = d.dataset.cat === cat?.id; });
      $$('a[data-art]', nav).forEach((a) => { if (a.dataset.art === art?.id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      // after an article: helpful?, more on the topic, and how to reach us
      after.hidden = !art;
      if (art) {
        $('#hqYnSay').hidden = true; $$('[data-yn]').forEach((b) => { b.disabled = false; b.removeAttribute('aria-pressed'); });
        const rest = cat.arts.filter((a) => a !== art);
        more.innerHTML = `${rest.length ? `<h2 class="hq-h">More in ${esc(cat.title)}</h2><ul class="hq-list hq-one">${rest.slice(0, 6).map((a) => row(a)).join('')}</ul>` : ''}
          <h2 class="hq-h">Still need help?</h2>${contactRows()}`;
        if (art.el.dataset.live === 'status') status();
        if (art.el.dataset.live === 'device') device();
      }
      document.title = art ? `${art.title} · Tenner Help Centre` : cat ? `${cat.title} · Tenner Help Centre` : 'Help Centre · Tenner';
      if (key !== shown || how.force) {
        if (target) target.scrollIntoView({ block: 'start' });
        else if (!how.keep) scrollTo({ top: 0, behavior: 'instant' });
      }
      shown = key;
      dispatchEvent(new Event('tn:route'));
    };
    if (!how.instant && shown && key !== shown && document.startViewTransition && !still()) document.startViewTransition(draw).ready.catch(() => {});
    else draw();
  };
  addEventListener('hashchange', () => route());
  // a link to the place you're already on (say, Privacy from inside the Privacy Policy) still takes you to its top
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]'); if (!a || e.metaKey || e.ctrlKey) return;
    if (a.getAttribute('href') === location.hash || (a.getAttribute('href') === '#' && !location.hash)) { e.preventDefault(); route({ force: true }); }
    else if (a.getAttribute('href') === '#') { e.preventDefault(); history.pushState(null, '', location.pathname + location.search); route(); }
  });

  // ---------- the search box
  const searchFor = (v) => {
    const url = v.trim() ? `#search=${encodeURIComponent(v.trim())}` : location.pathname + location.search;
    if (location.hash.startsWith('#search=') || !v.trim()) history.replaceState(null, '', url); else history.pushState(null, '', url);
    qx.hidden = !v; route({ instant: true, keep: true });
  };
  qi.addEventListener('input', () => searchFor(qi.value));
  $('#hqForm').addEventListener('submit', (e) => { e.preventDefault(); const first = $('.hq-res a', view); if (first) { qi.blur(); first.click(); } });
  qi.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && qi.value) { e.preventDefault(); e.stopPropagation(); qi.value = ''; searchFor(''); }
    if (e.key === 'ArrowDown') { const first = $('.hq-res a, .hq-list a', view); if (first) { e.preventDefault(); first.focus(); } }
  });
  view.addEventListener('keydown', (e) => {   // up and down through the results, back up into the box
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const links = $$('.hq-res a, .hq-list a', view), i = links.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault(); (e.key === 'ArrowDown' ? links[i + 1] : links[i - 1] || qi)?.focus();
  });
  qx.addEventListener('click', () => { qi.value = ''; searchFor(''); qi.focus(); });
  pop.insertAdjacentHTML('beforeend', arts.filter((a) => a.pop).slice(0, 5).map((a) => `<a href="#${a.id}">${esc(a.title)}</a>`).join(''));

  // ---------- was it helpful? (kept to this page: it isn't sent anywhere)
  after.addEventListener('click', (e) => {
    const b = e.target.closest('[data-yn]'); if (!b) return;
    const art = byId.get($('.hq-art.on')?.id), say = $('#hqYnSay');
    $$('[data-yn]').forEach((x) => { x.disabled = true; x.setAttribute('aria-pressed', String(x === b)); });
    say.innerHTML = b.dataset.yn === '1' ? 'Great, glad it helped.' : `Sorry about that. <a href="contact.html?about=Support&amp;re=${encodeURIComponent(art?.title || '')}">Tell us what was missing</a> and we’ll improve it.`;
    say.hidden = false; window.tn?.haptic?.(12);
  });

  // ---------- System status, checked live from this device
  const API = window.tn?.api || 'https://tenner-api.danseacroft.workers.dev';
  const ago = (m) => (m < 1 ? 'just now' : m < 60 ? `${m} minute${m === 1 ? '' : 's'} ago` : m < 1440 ? `${Math.round(m / 60)} hour${Math.round(m / 60) === 1 ? '' : 's'} ago` : `${Math.round(m / 1440)} days ago`);
  const timed = (url, o = {}) => { const c = new AbortController(), t = setTimeout(() => c.abort(), 9000); return fetch(url, { cache: 'no-store', ...o, signal: c.signal }).finally(() => clearTimeout(t)); };
  let checking = null, pillSet = null;
  const status = () => checking || (checking = (async () => {
    const set = (k, st, words) => { const li = $(`#hqStatus [data-s="${k}"]`); if (li) { li.dataset.st = st; $('em', li).textContent = words; } return st; };
    ['site', 'charts', 'api', 'tv'].forEach((k) => set(k, 'wait', 'Checking…'));
    const all = await Promise.all([
      (async () => {
        try {
          const r = await timed(`data/trending.json?v=${Date.now()}`); if (!r.ok) throw 0;
          const d = await r.json(), m = Math.round((Date.now() - Date.parse(d.generatedAt)) / 60000);
          set('site', 'ok', 'Working');
          return Number.isFinite(m) ? set('charts', m <= 90 ? 'ok' : m <= 360 ? 'warn' : 'bad', `Updated ${ago(Math.max(0, m))}`) : set('charts', 'warn', 'Couldn’t tell');
        } catch { const off = navigator.onLine === false; set('site', off ? 'bad' : 'warn', off ? 'You’re offline' : 'Couldn’t reach it'); return set('charts', off ? 'bad' : 'warn', off ? 'You’re offline' : 'Couldn’t check'); }
      })(),
      (async () => { try { const r = await timed(`${API}/help-status`); return set('api', r.status < 500 ? 'ok' : 'bad', r.status < 500 ? 'Working' : 'Having trouble'); } catch { return set('api', navigator.onLine === false ? 'bad' : 'warn', navigator.onLine === false ? 'You’re offline' : 'Couldn’t reach it'); } })(),
      (async () => { try { const r = await timed('https://tenner-tv.danseacroft.workers.dev/api/onair', { method: 'HEAD' }); return set('tv', r.status < 500 ? 'ok' : 'bad', r.status < 500 ? 'Working' : 'Having trouble'); } catch { return set('tv', navigator.onLine === false ? 'bad' : 'warn', navigator.onLine === false ? 'You’re offline' : 'Couldn’t reach it'); } })(),
    ]);
    pillSet?.(all.includes('bad') ? 'bad' : all.includes('warn') ? 'warn' : 'ok');
    setTimeout(() => { checking = null; }, 15000);
    return all;
  })());
  $('#hqRecheck')?.addEventListener('click', () => { checking = null; status(); window.tn?.haptic?.(10); });
  // the hero's little status line, from the same checks
  $('.hq-kick').insertAdjacentHTML('afterend', '<a class="hq-pill" id="hqPill" href="#status" data-st="wait"><i aria-hidden="true"></i><span>Checking Tenner’s services…</span></a>');
  pillSet = (st) => { const p = $('#hqPill'); p.dataset.st = st; $('span', p).textContent = st === 'ok' ? 'All services are running normally' : st === 'warn' ? 'Some checks couldn’t finish' : 'Something isn’t working right now'; };

  // ---------- Your device: what we'd ask for in a support message
  const facts = () => {
    const ua = navigator.userAgent, m = (re) => (ua.match(re) || [])[1];
    const browser = m(/Edg(?:A|iOS)?\/([\d.]+)/) ? `Edge ${m(/Edg(?:A|iOS)?\/(\d+)/)}` : m(/OPR\/(\d+)/) ? `Opera ${m(/OPR\/(\d+)/)}` : m(/Firefox\/(\d+)/) ? `Firefox ${m(/Firefox\/(\d+)/)}`
      : m(/FxiOS\/(\d+)/) ? `Firefox ${m(/FxiOS\/(\d+)/)}` : m(/CriOS\/(\d+)/) ? `Chrome ${m(/CriOS\/(\d+)/)}` : m(/Chrome\/(\d+)/) ? `Chrome ${m(/Chrome\/(\d+)/)}`
      : m(/Version\/([\d.]+).*Safari/) ? `Safari ${m(/Version\/([\d.]+)/)}` : 'Unknown';
    const ipad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    const sys = /iPhone/.test(ua) ? `iOS ${(m(/OS (\d+[_\d]*)/) || '').replace(/_/g, '.')}` : /iPad/.test(ua) || ipad ? `iPadOS ${(m(/OS (\d+[_\d]*)/) || m(/Version\/([\d.]+)/) || '').replace(/_/g, '.')}`
      : /Android/.test(ua) ? `Android ${m(/Android ([\d.]+)/) || ''}` : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown';
    let theme = 'Night'; try { const t = localStorage.getItem('tenner-theme'); theme = t === 'light' ? 'Day' : t === 'auto' ? `Auto (${matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'} now)` : 'Night'; } catch {}
    const ver = ($('script[src*="shell.js?v="]')?.getAttribute('src') || '').split('v=')[1] || '';
    const perm = 'Notification' in window ? { granted: 'Allowed', denied: 'Blocked', default: 'Not asked yet' }[Notification.permission] : 'Not available here';
    const yes = (x) => (x ? 'On' : 'Off');
    return [
      ['Tenner', `${ver}${(matchMedia('(display-mode: standalone)').matches || navigator.standalone) ? ', Home Screen app' : ', in the browser'}`],
      ['Browser', browser.trim()], ['System', sys.trim()],
      ['Screen', `${screen.width} × ${screen.height}, window ${innerWidth} × ${innerHeight}, ${Math.round(devicePixelRatio * 100) / 100}×`],
      ['Connection', navigator.onLine === false ? 'Offline' : 'Online'],
      ['Offline copy', 'serviceWorker' in navigator ? (navigator.serviceWorker.controller ? 'Ready' : 'Not yet') : 'Not available here'],
      ['Notifications', perm], ['Passkeys', window.PublicKeyCredential ? 'Supported' : 'Not supported'],
      ['Account', window.tn?.account?.user?.() ? 'Signed in' : 'Not signed in'],
      ['Theme', theme], ['Animations', yes(!still())],
      ['Reduce Motion', yes(matchMedia('(prefers-reduced-motion: reduce)').matches)], ['Reduce Transparency', yes(matchMedia('(prefers-reduced-transparency: reduce)').matches)],
      ['Language', `${navigator.language || 'Unknown'}, ${Intl.DateTimeFormat().resolvedOptions().timeZone || ''}`.replace(/, $/, '')],
    ];
  };
  let storage = '';
  const details = () => [...facts(), ...(storage ? [['Stored on this device', storage]] : [])];
  const asText = () => details().map(([k, v]) => `${k}: ${v}`).join('\n');
  const device = () => {
    const dl = $('#hqDevice'); if (!dl) return;
    const draw = () => { dl.innerHTML = details().map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join(''); };
    draw();
    navigator.storage?.estimate?.().then((e) => { const mb = (e.usage || 0) / 1048576; storage = mb < 1 ? `${Math.max(1, Math.round(mb * 1024))} KB` : `${mb.toFixed(mb < 10 ? 1 : 0)} MB`; draw(); }).catch(() => {});
  };
  $('#hqCopy')?.addEventListener('click', async (e) => {
    const b = e.currentTarget, s = $('span', b);
    try { await navigator.clipboard.writeText(asText()); s.textContent = 'Copied'; window.tn?.haptic?.(12); } catch { s.textContent = 'Couldn’t copy'; }
    setTimeout(() => { s.textContent = 'Copy details'; }, 1800);
  });
  // "Report a problem" and "Send to support": the Contact page opens on Help with these details added to the message
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-details]'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    try { sessionStorage.setItem('tenner-help-details', asText()); a.href = `${a.getAttribute('href').split('&details')[0]}&details=1`; } catch {}
  });

  route({ instant: true });
  // opened straight on an article: the browser jumps to it as the page loads, so start at its top (or the part asked for) instead
  if (location.hash && !location.hash.startsWith('#search=')) addEventListener('load', () => requestAnimationFrame(() => {
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el && !el.matches('.hq-art, .hq-cat')) el.scrollIntoView({ block: 'start' }); else scrollTo({ top: 0, behavior: 'instant' });
  }), { once: true });
  // a search from elsewhere (?q=) lands straight on its results
  const asked = new URL(location.href).searchParams.get('q');
  if (asked && !location.hash) { qi.value = asked; searchFor(asked); }
  status();
})();
