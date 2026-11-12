// Tenner's shell, shared by every page: the tabs (a sidebar on computers, a floating bar on phones), the Theme menu,
// keyboard shortcuts, the fade behind the bar once the page scrolls, the hourly freshness check, and a few helpers the
// pages share (window.tn), so each exists once.
(() => {
  const $ = (s) => document.querySelector(s);
  // which page this is, whether the address ends in browse.html or just /browse (both reach the same page)
  const onPage = (name) => new RegExp(`/${name}(\\.html)?$`).test(location.pathname);
  const root = document.documentElement;
  // ---------- when each thing last changed on this device, so an account can merge devices fairly (newest wins) ----------
  // { removed: { k: when } (titles taken off the Watchlist), pat: { k: when } (progress), sat (services), pfat (settings) }
  const SYNC = 'tenner-sync';
  const meta = {
    get() { try { return { removed: {}, pat: {}, sat: 0, pfat: 0, ...JSON.parse(localStorage.getItem(SYNC) || '{}') }; } catch { return { removed: {}, pat: {}, sat: 0, pfat: 0 }; } },
    edit(fn) { const m = meta.get(); fn(m); try { localStorage.setItem(SYNC, JSON.stringify(m)); } catch {} },
  };
  // ---------- settings (settings.html), on this device (and in your account, if you sign in) ----------
  const PREFS = 'tenner-settings', DEF = { start: 'auto', anim: false, moves: true, ratings: true, trailers: 'here', autoplay: true, no18: false, digest: false,
    // signed in only: Spoiler shield, watched titles leave the Watchlist, hide Not interested titles, notes on the Watchlist,
    // Your Tenner on the account page, which alerts to send and when to stay quiet (the Worker reads these from the account)
    spoil: false, seenoff: true, hideni: true, notewl: true, stats: true, alarr: true, alep: true, alleave: true, altv: true, alprice: true, quiet: 'off' };
  const prefs = {
    get() { try { const { still, ...p } = JSON.parse(localStorage.getItem(PREFS) || '{}'); return { ...DEF, ...p }; } catch { return { ...DEF }; } },   // still: the old Reduce motion setting, gone
    set(k, v) { const p = prefs.get(); p[k] = v; try { localStorage.setItem(PREFS, JSON.stringify(p)); } catch {} meta.edit((m) => { m.pfat = Date.now(); }); apply(); dispatchEvent(new Event('tn:prefs')); },
  };
  // ---------- one-time feature tips you've seen: { id: when }, on this device (and in your account, if you sign in) ----------
  const TIPS = 'tenner-tips';
  const tips = {
    all() { try { const o = JSON.parse(localStorage.getItem(TIPS) || '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; } },
    seen: (id) => !!tips.all()[id],
    mark(id) { const o = tips.all(); if (o[id]) return; o[id] = Date.now(); try { localStorage.setItem(TIPS, JSON.stringify(o)); } catch {} dispatchEvent(new Event('tn:tips')); },
  };
  // no animations unless you switch them on in Settings (and never when the device asks for reduced motion)
  const osStill = matchMedia('(prefers-reduced-motion: reduce)');
  const apply = () => { const p = prefs.get(); root.classList.toggle('still', !p.anim || osStill.matches); root.classList.toggle('no-moves', !p.moves); root.classList.toggle('no-ratings', !p.ratings); };
  apply(); osStill.addEventListener?.('change', apply);   // the device's Reduce Motion, switched while Tenner is open
  const reduce = () => root.classList.contains('still');   // read live: Settings, another tab or a sync can switch Animations on or off at any moment
  // every tap answers (styles.css, "polish and motion"): a ring of light from a button, the new choice gliding into a
  // pop-up button, and a small buzz from a switch where the device has one. Restarting a class replays its animation.
  const replay = (el, c) => { el.classList.remove(c); void el.offsetWidth; el.classList.add(c); };
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('.btn, .dd, .hc-r, .cal-add, .set-pill, .pv-ok, .ft-ok, .tn-opt');
    if (b && !root.classList.contains('still')) replay(b, 'tap-ring');
  }, true);
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches?.('input[role="switch"]')) navigator.vibrate?.(6);
    if (t.tagName === 'SELECT' && !root.classList.contains('still')) requestAnimationFrame(() => replay(t.closest('.dd')?.querySelector('.dd-l') || t, 'dd-swap'));
  });
  document.addEventListener('animationend', (e) => { if (e.animationName === 'tapRing' || e.animationName === 'ddSwap' || e.animationName === 'ddFlash') e.target.classList.remove('tap-ring', 'dd-swap'); });

  // ---------- shared helpers ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hue = (t) => { let h = 0; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  // The pill under a chosen item (tabs, services, collections): it glides across, stretching a little on the way and
  // settling with a small spring. `from` remembers where each pill was.
  const from = new WeakMap();
  function glide(ind, b, animate, stretch = 1.14) {
    if (!ind || !b || !b.offsetWidth) return;
    const x = b.offsetLeft, w = b.offsetWidth, was = from.get(ind);
    from.set(ind, x);
    if (was === undefined || !animate || reduce() || !ind.animate) { ind.style.width = w + 'px'; ind.style.transform = `translateX(${x}px)`; return; }
    const t0 = ind.style.transform, w0 = ind.style.width, mw = Math.max(parseFloat(w0), w) * stretch, mid = (was + x) / 2 - (mw - w) / 2;
    ind.style.width = w + 'px'; ind.style.transform = `translateX(${x}px)`;
    ind.animate([{ transform: t0, width: w0 }, { transform: `translateX(${mid}px)`, width: mw + 'px', offset: 0.45 }, { transform: `translateX(${x}px)`, width: w + 'px' }],
      { duration: 520, easing: 'cubic-bezier(.3,1.15,.4,1)' });
  }
  // Arrow keys move through a group of radio-like buttons (segmented controls, menus), as on Apple platforms.
  function arrows(group, items, pick) {
    group.addEventListener('keydown', (e) => {
      const list = items().filter((b) => b.offsetWidth && !b.hidden), i = list.indexOf(document.activeElement);
      const k = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 }[e.key];
      if (k === undefined || i < 0) return;
      e.preventDefault(); const n = list[(k + list.length) % list.length]; n.focus(); pick?.(n);
    });
  }
  // A segmented control that behaves like an iOS switch: its thumb glides to the chosen option with a little spring
  // (when animations are on), and you can grab it and slide (or flick) it between options; it swells slightly while held, then snaps to the nearest.
  // The thumb follows aria-checked, so pages only mark the choice; `pick` is called when a drag lands on a new option.
  function segment(group, pick) {
    if (!group) return;
    const thumb = group.querySelector('.seg-thumb'), btns = () => [...group.querySelectorAll('button')].filter((b) => b.offsetWidth);
    const place = (animate) => glide(thumb, group.querySelector('button[aria-checked="true"]'), animate, 1.1);
    new MutationObserver(() => place(true)).observe(group, { attributes: true, subtree: true, attributeFilter: ['aria-checked'] });
    addEventListener('resize', () => place(false)); document.fonts?.ready.then(() => place(false)); place(false);
    let drag = null, moved = false;
    group.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('button');
      if (!b || b.getAttribute('aria-checked') !== 'true' || e.button) return;   // grab the thumb itself
      const x = b.offsetLeft, max = Math.max(...btns().map((n) => n.offsetLeft + n.offsetWidth)) - b.offsetWidth;
      drag = { id: e.pointerId, x0: e.clientX, x, min: btns()[0].offsetLeft, max }; moved = false;
      group.setPointerCapture(e.pointerId); thumb.classList.add('held');
    });
    group.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0; if (Math.abs(dx) > 3) moved = true;
      thumb.getAnimations?.().forEach((a) => a.cancel());
      thumb.style.transform = `translateX(${Math.min(drag.max, Math.max(drag.min, drag.x + dx))}px)`;
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null; thumb.classList.remove('held');
      if (!moved) return;
      // snap to whichever option the thumb's centre is over
      const r = thumb.getBoundingClientRect(), mid = r.left + r.width / 2;
      const to = btns().reduce((best, n) => { const nr = n.getBoundingClientRect(), d = Math.abs(nr.left + nr.width / 2 - mid); return d < best.d ? { n, d } : best; }, { n: null, d: Infinity }).n;
      if (to && to.getAttribute('aria-checked') !== 'true') pick(to); else place(true);
    };
    group.addEventListener('pointerup', end); group.addEventListener('pointercancel', end);
    // a drag isn't a tap: swallow the click that follows it
    group.addEventListener('click', (e) => { if (moved) { e.stopImmediatePropagation(); e.preventDefault(); moved = false; } }, true);
  }
  // ---------- the version: change it here with every update and it shows everywhere (the sidebar, the end of About) ----------
  const version = '2.84.5';
  document.querySelectorAll('.side-ver, .side-ver-text').forEach((el) => { el.textContent = `Tenner ${version}`; });
  // the build number opens the Update centre (every release, its changes and notes)
  if (onPage('updates')) document.querySelectorAll('a.side-ver').forEach((a) => a.setAttribute('aria-current', 'page'));

  // ---------- the contact address: change it here and it updates everywhere (Contact, Privacy Policy, Terms) ----------
  const contact = 'support@tenner.stream';
  document.querySelectorAll('a.contact-email').forEach((a) => { a.href = `mailto:${contact}`; a.textContent = contact; });

  // ---------- the watchlist: kept on this device (local storage), and in your account if you sign in; only its keys go to the alerts service, if they're on ----------
  // Each entry: { k, type, title, year, poster, at }. Pages hear "tn:saved" whenever it changes, here or in another tab.
  const WL = 'tenner-watchlist';
  const saved = {
    all() { try { const l = JSON.parse(localStorage.getItem(WL) || '[]'); return Array.isArray(l) ? l.filter((x) => typeof x?.k === 'string' && x.k) : []; } catch { return []; } },
    has(k) { return !!k && saved.all().some((x) => x.k === k); },
    set(l) {
      const keep = new Set(l.map((x) => x.k)), gone = saved.all().filter((x) => !keep.has(x.k));
      if (gone.length) meta.edit((m) => { for (const x of gone) m.removed[x.k] = Date.now(); });   // so other devices take them off too
      try { localStorage.setItem(WL, JSON.stringify(l)); } catch {} dispatchEvent(new Event('tn:saved'));
    },
    toggle(info) {
      if (!info?.k) return false;
      const l = saved.all(), on = l.some((x) => x.k === info.k);
      saved.set(on ? l.filter((x) => x.k !== info.k)
        : [{ k: info.k, type: info.type, title: info.title, year: info.year || null, poster: info.poster || null, at: Date.now() }, ...l].slice(0, 500));
      return !on;
    },
    remove(k) { saved.set(saved.all().filter((x) => x.k !== k)); },
  };
  // stars: titles you've starred in a title's sheet (phones), so recommendations lean towards what you like. Nothing
  // else uses them. { k: [1 or 0, when] }: a 0 is an unstar, so your other devices hear of it when your account syncs.
  const ST = 'tenner-stars';
  const stars = {
    map() { try { const m = JSON.parse(localStorage.getItem(ST) || '{}'); return m && typeof m === 'object' ? m : {}; } catch { return {}; } },
    all() { return Object.entries(stars.map()).filter(([, v]) => v?.[0]).sort((a, b) => b[1][1] - a[1][1]).map(([k]) => k); },
    has(k) { return !!stars.map()[k]?.[0]; },
    toggle(k) {
      if (!k) return false;
      const m = stars.map(), on = !m[k]?.[0]; m[k] = [on ? 1 : 0, Date.now()];
      // kept from growing for ever: an unstar is let go after 120 days (other devices have heard by then), and only the newest 2,000 stay
      const cut = Date.now() - 120 * 864e5; for (const [x, v] of Object.entries(m)) if (!v?.[0] && v?.[1] < cut) delete m[x];
      const ks = Object.keys(m); if (ks.length > 2000) ks.sort((a, b) => (m[a]?.[1] || 0) - (m[b]?.[1] || 0)).slice(0, ks.length - 2000).forEach((x) => delete m[x]);
      try { localStorage.setItem(ST, JSON.stringify(m)); } catch {} dispatchEvent(new Event('tn:saved')); return on;
    },
  };
  // Discover's swipes: { k: [1 (right, saved) or 0 (left, skipped), when] }, the newest 1,500, kept with your account so
  // For You learns from them on every device. (Discover's own deck still uses the skip list on this device.)
  const SW = 'tenner-swipes';
  const swipes = {
    map() { try { const m = JSON.parse(localStorage.getItem(SW) || '{}'); return m && typeof m === 'object' ? m : {}; } catch { return {}; } },
    liked() { return Object.entries(swipes.map()).filter(([, v]) => v?.[0]).sort((a, b) => b[1][1] - a[1][1]).map(([k]) => k); },
    set(k, yes) {
      if (!k) return; const m = swipes.map(); if (yes == null) delete m[k]; else m[k] = [yes ? 1 : 0, Date.now()];
      const ks = Object.keys(m); if (ks.length > 1500) ks.sort((a, b) => m[a][1] - m[b][1]).slice(0, ks.length - 1500).forEach((x) => delete m[x]);
      try { localStorage.setItem(SW, JSON.stringify(m)); } catch {} dispatchEvent(new Event('tn:swiped'));
    },
  };
  // ---------- signed in only: what you've watched, what you're not interested in, and your own notes ----------
  // Each is { k: [on (1 or 0; a note's text or 0), when, title, year, poster] }. A 0 is a removal, kept a while so your
  // other devices hear of it when your account syncs (the newest change wins, title by title). Pages hear "tn:marks".
  const member = () => { try { return !!localStorage.getItem('tenner-session'); } catch { return false; } };
  const MARKS = { seen: 'tenner-seen', hidden: 'tenner-hidden', notes: 'tenner-notes' };
  const marks = (key) => {
    const m = {
      map() { try { const o = JSON.parse(localStorage.getItem(key) || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch { return {}; } },
      get(k) { const v = m.map()[k]; return v?.[0] ? v : null; },
      has(k) { return !!k && !!m.get(k); },
      list() { return Object.entries(m.map()).filter(([, v]) => v?.[0]).sort((a, b) => b[1][1] - a[1][1])
        .map(([k, v]) => ({ k, v: v[0], at: v[1], title: v[2] || '', year: v[3] || null, poster: v[4] || null, type: k[0] === 'm' ? 'movie' : 'tv' })); },
      set(info, v) {
        if (!info?.k) return; const o = m.map(), cut = Date.now() - 120 * 864e5;
        o[info.k] = [v || 0, Date.now(), String(info.title || '').slice(0, 200), info.year ? String(info.year).slice(0, 4) : null, info.poster || null];
        for (const [k, x] of Object.entries(o)) if (!x?.[0] && x?.[1] < cut) delete o[k];
        const ks = Object.keys(o); if (ks.length > 1000) ks.sort((a, b) => o[a][1] - o[b][1]).slice(0, ks.length - 1000).forEach((x) => delete o[x]);
        try { localStorage.setItem(key, JSON.stringify(o)); } catch {} dispatchEvent(new Event('tn:marks'));
      },
    };
    return m;
  };
  const seen = marks(MARKS.seen), hidden = marks(MARKS.hidden), notes = marks(MARKS.notes);
  // the titles to leave out of Home, Browse, Discover and For You (only while signed in, and Settings says so)
  hidden.keys = () => (member() && prefs.get().hideni !== false ? new Set(hidden.list().map((x) => x.k)) : new Set());
  // For You: titles from the catalogue (data/browse.json's items) you'd probably like, from what you swiped right on in
  // Discover (most), loved (stars) and saved; left swipes count a little against their genres. TMDB's own "more like this"
  // for your latest right swipes (like: { k: [keys] }) lifts those titles well up. Nothing you've swiped, saved or loved
  // comes back. ok(x) keeps to the page's filters. Gives { picks, because, how ('liked' in Discover, 'loved' or 'saved') } or null.
  function forYou(items, ok = () => true, like = {}, n = 14) {
    const byK = new Map(items.map((x) => [`${x.t[0]}${x.i}`, x]));
    const sw = swipes.map(), yes = swipes.liked(), starred = stars.all(), have = saved.all().map((s) => s.k);
    if (!yes.length && !starred.length && !have.length) return null;
    const w = new Map(), add = (k, v) => { const x = byK.get(k); if (x) for (const g of new Set(x.g)) w.set(g, (w.get(g) || 0) + v); };
    yes.slice(0, 200).forEach((k) => add(k, 3)); starred.forEach((k) => add(k, 2)); have.forEach((k) => add(k, 1));
    Object.entries(sw).filter(([, v]) => !v[0]).sort((a, b) => b[1][1] - a[1][1]).slice(0, 300).forEach(([k]) => add(k, -0.6));
    const hits = new Map(); for (const [src, l] of Object.entries(like)) for (const k of l || []) if (!hits.has(k)) hits.set(k, src);
    const top = Math.max(1, ...w.values()), skip = new Set([...Object.keys(sw), ...starred, ...have, ...hidden.keys()]);
    const picks = items.filter((x) => x.img && x.s?.length && ok(x) && !skip.has(`${x.t[0]}${x.i}`) && ((x.r >= 6.3 && x.v >= 40) || hits.has(`${x.t[0]}${x.i}`)))
      .map((x) => { const g = x.g.reduce((s, id) => s + (w.get(id) || 0), 0) / top / Math.sqrt(Math.max(1, x.g.length));
        return [x, (Math.max(0, g) + (hits.has(`${x.t[0]}${x.i}`) ? 1.6 : 0)) * (x.r || 6) * Math.log10(10 + (x.v || 0))]; })
      .filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).slice(0, n).map(([x]) => x);
    if (picks.length < 4) return null;
    // the "because": the swipe that brought the first pick, or else the latest liked title that shares its genres
    const k0 = `${picks[0].t[0]}${picks[0].i}`, from = (l) => l.map((k) => byK.get(k)).filter(Boolean);
    const near = (l) => from(l).find((x) => x.g.some((g) => picks[0].g.includes(g)));
    const because = byK.get(hits.get(k0)) || near(yes) || near(starred) || near(have) || from(yes)[0] || from(starred)[0] || from(have)[0] || null;
    const bk = because && `${because.t[0]}${because.i}`;
    return { picks, because, how: !bk ? null : sw[bk]?.[0] ? 'liked' : starred.includes(bk) ? 'loved' : 'saved' };
  }
  // TMDB's "more like this" for your latest right swipes (the Worker's /more), kept on this device for three days, for
  // forYou's like: { k: [keys] }. Fetched only when asked (signed in); never waits long, since the genres alone still work
  const LC = 'tenner-like-cache';
  const likeCache = {
    all() { try { const o = JSON.parse(localStorage.getItem(LC) || '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; } },
    put(k, l) { const o = likeCache.all(); o[k] = { at: Date.now(), l }; const ks = Object.keys(o); if (ks.length > 24) ks.sort((a, b) => o[a].at - o[b].at).slice(0, ks.length - 24).forEach((x) => delete o[x]); try { localStorage.setItem(LC, JSON.stringify(o)); } catch {} },
  };
  function moreLike(fetchNew) {
    const want = swipes.liked().slice(0, 4), c = likeCache.all(), fresh = Date.now() - 3 * 864e5;
    const like = Object.fromEntries(want.filter((k) => c[k]).map((k) => [k, c[k].l]));
    const need = fetchNew ? want.filter((k) => !(c[k]?.at > fresh)) : [];
    if (!need.length) return Promise.resolve(like);
    const got = Promise.all(need.map((k) => fetch(`${api}/more/${k}`).then((r) => (r.ok ? r.json() : null))
      .then((m) => { if (!m) return; const l = (m.like || []).map((x) => x.k).filter(Boolean); like[k] = l; likeCache.put(k, l); }).catch(() => {})));
    return Promise.race([got, new Promise((r) => setTimeout(r, 3500))]).then(() => like);
  }
  // where you're up to in a show: { k: [season, episode] } (the last episode you've watched), also on this device only
  const PR = 'tenner-progress';
  const progress = {
    all() { try { return JSON.parse(localStorage.getItem(PR) || '{}') || {}; } catch { return {}; } },
    get(k) { const p = progress.all()[k]; return Array.isArray(p) && p.length === 2 ? p : null; },
    set(k, p) { const all = progress.all(); if (p) all[k] = p; else delete all[k]; try { localStorage.setItem(PR, JSON.stringify(all)); } catch {} meta.edit((m) => { m.pat[k] = Date.now(); }); dispatchEvent(new Event('tn:saved')); },
  };
  // the next episode to watch after [s, e], given each season's episode count; null when you're caught up
  const nextUp = (p, sz) => { if (!p) return [1, 1]; const [s, e] = p; if (sz?.[s - 1] && e < sz[s - 1]) return [s, e + 1]; if (sz && s < sz.length) return [s + 1, 1]; return sz ? null : [s, e + 1]; };
  // "Today", "Tomorrow", "Fri 24 Oct (in 6 days)": when the next episode lands
  const whenText = (iso) => {
    const d = new Date(iso + 'T12:00:00'), t = new Date(); t.setHours(12, 0, 0, 0);
    const n = Math.round((d - t) / 864e5);
    return n <= 0 ? (n === 0 ? 'Today' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })) : n === 1 ? 'Tomorrow'
      : n < 7 ? d.toLocaleDateString('en-GB', { weekday: 'long' }) : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };
  addEventListener('storage', (e) => {
    const is = (...k) => e.key === null || k.includes(e.key);   // null: everything was cleared (in another tab)
    if (is(WL, PR, ST)) dispatchEvent(new Event('tn:saved')); if (is(MS)) dispatchEvent(new Event('tn:mine')); if (is(...Object.values(MARKS))) dispatchEvent(new Event('tn:marks')); if (is(PREFS)) { apply(); dispatchEvent(new Event('tn:prefs')); } if (is(SESS, ACC)) dispatchEvent(new Event('tn:account')); if (e.key === TIPS || e.key === null) tipQ.splice(0, tipQ.length, ...tipQ.filter((x) => !tips.seen(x.id))); });

  // ---------- My services: the ones you pay for, on this device. The Top 10 gets a chart of just those, and Browse
  // starts filtered to them. Empty means "all six". ----------
  const MS = 'tenner-services';
  const mine = {
    get() { try { const l = JSON.parse(localStorage.getItem(MS) || '[]'); return Array.isArray(l) ? l : []; } catch { return []; } },
    set(l) { try { if (l.length) localStorage.setItem(MS, JSON.stringify(l)); else localStorage.removeItem(MS); } catch {} meta.edit((m) => { m.sat = Date.now(); }); dispatchEvent(new Event('tn:mine')); },
  };
  // the picker: a card in the iOS Subscriptions style, in the popups' one look (styles.css). A round back button and the
  // title, one line on what the sheet is for, Watch before it goes (your Watchlist titles about to leave your services), then your services under Active and
  // the rest under Inactive (a tap moves one across), each a rounded card with its logo and what's waiting for you there,
  // and a switch for all six below
  const CHEV_L = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CHEV_R = '<svg class="mine-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 5.5 6.5 6.5-6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CAL_IC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 10h17M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="m9 15 2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function pickMine(list) {
    let dlg = document.getElementById('mineDlg');
    if (!dlg) {
      document.body.insertAdjacentHTML('beforeend', `<dialog class="mine-dlg mine-subs" id="mineDlg" aria-labelledby="mineH" aria-describedby="mineSum">
        <form method="dialog">
          <div class="mine-top"><button class="mine-back" value="done" aria-label="Done">${CHEV_L}</button><h2 id="mineH">My services</h2></div>
          <p class="mine-sum" id="mineSum">Choose the services you have, and see what’s waiting for you on each one.</p>
          <section class="mine-go" id="mineGo" aria-labelledby="mineGoH" hidden></section>
          <div id="mineSecs">
            <h3 class="mine-sec" id="mineOnH">Active</h3><div class="mine-list" id="mineOn" role="group" aria-labelledby="mineOnH"></div>
            <h3 class="mine-sec" id="mineOffH">Inactive</h3><div class="mine-list" id="mineOff" role="group" aria-labelledby="mineOffH"></div>
          </div>
          <label class="mine-all"><span class="mine-l">All six services<small>Your Top 10 and Browse cover them all. Turn off to pick just yours. Saved on this device.</small></span>
            <input type="checkbox" switch role="switch" id="mineAll"><i class="sw" aria-hidden="true"></i></label>
        </form></dialog>`);
      dlg = document.getElementById('mineDlg');
      dlg.addEventListener('close', () => {
        if (dlg.returnValue !== 'done') return;
        const on = [...dlg.querySelectorAll('.mine-list input:checked')].map((i) => i.value);
        mine.set(on.length === dlg.querySelectorAll('.mine-list input').length ? [] : on);   // all six is the same as none chosen
      });
      // a tap outside the card, or Escape, keeps what you've picked (the back button's job too)
      dlg.addEventListener('click', (e) => {
        if (e.target === dlg) { dlg.close('done'); return; }
        const r = e.target.closest('[data-remind]'); if (r) { e.preventDefault(); remind(r, dlg.waiting?.go[+r.dataset.remind]); }
      });
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); dlg.close('done'); });
      // a row moves between Active and Inactive as you tap it
      const place = () => {
        const rows = [...dlg.querySelectorAll('.mine-row')], on = dlg.querySelector('#mineOn'), off = dlg.querySelector('#mineOff');
        for (const r of rows) (r.querySelector('input').checked ? on : off).append(r);
        dlg.querySelector('#mineOnH').hidden = !on.children.length; dlg.querySelector('#mineOffH').hidden = !off.children.length;
        dlg.querySelector('#mineAll').checked = rows.every((r) => r.querySelector('input').checked);
        for (const r of rows) r.querySelector('.mine-d').textContent = r.querySelector('input').checked ? '' : 'Add';
        drawGo(dlg);
      };
      const move = () => (!reduce() && document.startViewTransition ? document.startViewTransition(place).ready.catch(() => {}) : place());
      dlg.addEventListener('change', (e) => {
        if (e.target.id === 'mineAll') { const v = e.target.checked; dlg.querySelectorAll('.mine-list input').forEach((i) => { i.checked = v; }); }
        haptic(6); move();
      });
      dlg.place = place;
    }
    const cur = mine.get();
    dlg.list = list; dlg.waiting = null;
    dlg.querySelector('#mineOn').innerHTML = list.map((s, i) => `<label class="mine-row" style="view-transition-name:mine-${i}" data-svc="${esc(s.key)}">
      <span class="mine-ic">${s.logo ? `<img src="${esc(s.logo)}" alt="">` : esc(s.label[0])}</span><span class="mine-l">${esc(s.label)}<small class="mine-n"></small></span>
      <span class="mine-d"></span>${CHEV_R}
      <input type="checkbox" value="${esc(s.key)}"${!cur.length || cur.includes(s.key) ? ' checked' : ''}></label>`).join('');
    dlg.querySelector('#mineOff').innerHTML = '';
    dlg.place();
    dlg.classList.toggle('native-sw', 'switch' in HTMLInputElement.prototype);   // Safari 17.4+: the real iOS switch
    dlg.returnValue = ''; dlg.scrollTop = 0; dlg.showModal();
    waiting(dlg, list);
  }

  // ---------- What's waiting on each service: from your Watchlist (what's there now, what's arriving, what's leaving),
  // or, with nothing saved there, what's trending on it. Where each title streams comes from data/titles.json (and the
  // search service for anything saved that the charts don't cover, 40 at most); arrivals and leavers from data/new.json;
  // the services' charts from data/trending.json ----------
  const SVC_MATCH = { netflix: /^netflix/, disney: /^disney plus/, prime: /^(amazon prime( video)?|prime video)/, hbomax: /^(hbo max|max)( with ads)?$/, paramount: /^paramount plus/, appletv: /^apple ?tv( plus|\+)?$/ };
  const planOne = new Map(), planP = {};   // each file and title asked for once a visit, however often the sheet opens
  const planFile = (f) => (planP[f] ||= fetch(`data/${f}.json?v=${Math.floor(Date.now() / 600000)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  const dayText = (iso) => {
    const n = Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${todayIso()}T12:00:00Z`)) / 864e5), d = new Date(`${iso}T12:00:00Z`);
    return n <= 0 ? 'today' : n === 1 ? 'tomorrow' : n < 7 ? `on ${d.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })}` : `on ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
  };
  async function waiting(dlg, list) {
    const wl = saved.all().filter((x) => !seen.has(x.k));   // what you've already watched isn't waiting for you
    const [d, fresh, charts] = await Promise.all([wl.length ? planFile('titles') : null, planFile('new'), planFile('trending')]);
    const providers = { ...(d?.providers || {}) }, items = { ...(d?.items || {}) };
    const missing = wl.filter((x) => !items[x.k]).slice(0, 40).map((x) => x.k);
    const one = (k) => { if (!planOne.has(k)) planOne.set(k, fetch(`${api}/title/${k}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)); return planOne.get(k); };
    await Promise.all(missing.map((k) => one(k).then((r) => { if (r?.items) { Object.assign(items, r.items); Object.assign(providers, r.providers); } })));
    if (!dlg.open || dlg.list !== list) return;
    const on = (k) => new Set([...(items[k]?.f || []), ...(items[k]?.fr || [])].map((id) => {
      const n = (providers[id]?.[0] || '').toLowerCase(); return Object.keys(SVC_MATCH).find((s) => SVC_MATCH[s].test(n));
    }).filter(Boolean));
    const want = new Map(wl.map((x) => [x.k, x])), today = todayIso(), month = new Date(Date.parse(`${today}T12:00:00Z`) + 31 * 864e5).toISOString().slice(0, 10);
    const keyOf = (x) => (x.id ? `${x.type === 'movie' ? 'm' : 't'}${x.id}` : null);
    const ofYours = (l) => (l || []).filter((x) => want.has(keyOf(x)) && x.date).map((x) => ({ ...x, k: keyOf(x), poster: x.poster || want.get(keyOf(x)).poster }));
    dlg.waiting = {
      here: (s) => wl.filter((x) => on(x.k).has(s)),
      coming: ofYours(fresh?.items).filter((x) => x.date > today && x.date <= month).sort((a, b) => a.date.localeCompare(b.date)),
      leaving: ofYours(fresh?.leaving).filter((x) => x.date >= today && x.date <= month).sort((a, b) => a.date.localeCompare(b.date)),
      top: (s) => { const c = (charts?.services || []).find((x) => x.key === s); return [...(c?.tv || []).slice(0, 1), ...(c?.movie || []).slice(0, 1)].sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0] || null; },
      go: [],
    };
    drawGo(dlg);
  }
  // each service's grey line, and the Watch before it goes box, for the services as they're set in the sheet right now
  function drawGo(dlg) {
    const w = dlg.waiting, box = dlg.querySelector('#mineGo'); if (!w) { box.hidden = true; return; }
    const label = (k) => dlg.list.find((s) => s.key === k)?.label || k;
    const active = [...dlg.querySelectorAll('.mine-row input:checked')].map((i) => i.value);
    for (const r of dlg.querySelectorAll('.mine-row')) {
      const s = r.dataset.svc, here = w.here(s), next = w.coming.find((x) => x.service === s), parts = [];
      if (here.length) parts.push(here.length === 1 ? `${here[0].title} is on your Watchlist` : `${here.length} on your Watchlist, including ${here[0].title}`);
      if (next) parts.push(`${next.title}${next.season ? ` season ${next.season}` : ''} arrives ${dayText(next.date)}`);
      if (!parts.length) { const t = w.top(s); parts.push(t ? `Trending here: ${t.title}` : 'Nothing from your Watchlist here yet'); }
      r.querySelector('.mine-n').textContent = parts.join(' · ');
    }
    w.go = w.leaving.filter((x) => active.includes(x.service)).slice(0, 5);
    box.innerHTML = w.go.length ? `<h3 class="mine-sec" id="mineGoH">Watch before it goes</h3>
      <p class="mine-go-p">From your Watchlist, leaving your services soon.</p>
      <ul class="mine-go-l">${w.go.map((x, i) => `<li><span class="mine-go-art">${x.poster ? `<img src="${esc(String(x.poster).replace('/t/p/w342/', '/t/p/w154/'))}" alt="" loading="lazy">` : ''}</span>
        <span class="mine-go-t"><b>${esc(x.title)}</b><small>Leaves ${esc(label(x.service))} ${esc(dayText(x.date))}</small></span>
        <button type="button" class="mine-cal" data-remind="${i}" aria-label="${esc(`Remind me to watch ${x.title}`)}">${CAL_IC}<span>Remind me</span></button></li>`).join('')}</ul>` : '';
    box.hidden = !w.go.length;
    featureTip({ id: 'mine-waiting', for: '#mineOn', title: 'What’s waiting for you', text: 'Each of your services now shows what’s waiting for you there: titles from your Watchlist, what’s arriving soon, or what’s trending.' });
  }
  // Remind me: an all-day calendar event two days before the title leaves (or today, if that's sooner); the iPhone and
  // Mac open it in Calendar
  function remind(b, x) {
    if (!x) return;
    const on = new Date(Math.max(Date.parse(`${todayIso()}T12:00:00Z`), Date.parse(`${x.date}T12:00:00Z`) - 2 * 864e5)), d = on.toISOString().slice(0, 10).replace(/-/g, '');
    const end = new Date(+on + 864e5).toISOString().slice(0, 10).replace(/-/g, ''), svc = SVC_LABEL[x.service] || 'its service';
    const link = `https://tenner.stream/?t=${x.k}`, leaves = new Date(`${x.date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    const txt = (t) => t.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n'), fold = (line) => line.replace(/(.{72})/g, '$1\r\n ').replace(/\r\n $/, '');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tenner//Watch before it goes//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      `UID:leaving-${x.service}-${x.k}-${x.date}@tenner.stream`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${end}`,
      fold(`SUMMARY:${txt(`Watch ${x.title} before it leaves ${svc}`)}`), fold(`DESCRIPTION:${txt(`${x.title} leaves ${svc} on ${leaves}. ${link}`)}`), `URL:${link}`,
      'TRANSP:TRANSPARENT', 'BEGIN:VALARM', 'ACTION:DISPLAY', fold(`DESCRIPTION:${txt(`${x.title} leaves ${svc} on ${leaves}`)}`), 'TRIGGER:PT18H', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a'); a.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
    if (!isIOS) a.download = `${`Watch ${x.title}`.replace(/[^\w ]+/g, '').trim() || 'Tenner'}.ics`;   // iPhone and iPad: Safari opens it straight into Calendar
    document.body.append(a); a.click(); a.remove(); haptic(10);
    b.classList.add('done'); b.querySelector('span').textContent = 'Added';
  }
  // My services from anywhere: the six services with their logos (from this hour's charts)
  const openMine = () => planFile('trending').then((t) => {
    const logo = Object.fromEntries((t?.services || []).map((x) => [x.key, x.logo]));
    pickMine(Object.keys(SVC_LABEL).map((k) => ({ key: k, label: SVC_LABEL[k], logo: logo[k] })));
  });
  const SVC_LABEL = { netflix: 'Netflix', disney: 'Disney+', prime: 'Prime Video', hbomax: 'HBO Max', paramount: 'Paramount+', appletv: 'Apple TV' };

  // ---------- The Top 10s: every service's chart in one big popup, the way a plan picker lines up its plans. A wide
  // frosted card over the dimmed page (a native modal <dialog>): the services' logos on the left (each jumps to its
  // column), the title in the middle, Shows / Films and a round close button on the right; then a column per service
  // (yours first): its No. 1 large, with its scene behind it, a button into Browse for that service, and Nos. 2 to 10
  // in the house list. On phones it's a sheet from the bottom and you swipe from one service to the next. A title opens
  // its sheet above the popup; every "See the Top 10s" link, By service button and the Top 10s tab opens it. ----------
  const T10_KIND = { tv: 'Shows', movie: 'Films' };
  const T10_IC = {
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    go: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    up: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 12.6V4M4.4 7.4 8 3.8l3.6 3.6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    down: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.4V12M4.4 8.6 8 12.2l3.6-3.6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 5.5 6.5 6.5-6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  const t10 = { kind: null, info: [] };
  const t10Kind = () => {
    if (t10.kind) return t10.kind;
    let k = null; try { k = sessionStorage.getItem('tenner-tt-kind') || localStorage.getItem('tenner-kind'); } catch {}
    return k === 'movie' ? 'movie' : 'tv';   // Both (or nothing chosen) starts on Shows
  };
  const t10Small = (u) => String(u).replace('/t/p/w342/', '/t/p/w154/');
  const t10Key = (it, k) => (/^\d+$/.test(String(it.id ?? '')) ? `${k === 'movie' ? 'm' : 't'}${it.id}` : null);
  const t10Ph = (t) => { const h = hue(t); return `<span class="t10-ph" style="background:linear-gradient(160deg,hsl(${h} 45% 40%),hsl(${(h + 40) % 360} 55% 16%))"></span>`; };
  // how a title moved since the last chart: up (green), down (grey) or new
  const t10Move = (mv) => (mv === 'new' ? '<span class="t10-mv new">New</span>'
    : +mv > 0 ? `<span class="t10-mv up" aria-label="up ${+mv}">${T10_IC.up}${+mv}</span>`
    : +mv < 0 ? `<span class="t10-mv down" aria-label="down ${-mv}">${T10_IC.down}${-mv}</span>` : '');
  function t10Col(s, k, mineSet, all) {
    const l = (s[k] || []).slice(0, 10); if (!l.length) return '';
    const word = k === 'movie' ? 'film' : 'show';
    const reg = (it, i) => { const n = t10.info.length; t10.info.push({ k: t10Key(it, k), type: k, eye: `No. ${i + 1} ${word} on ${s.label}`, title: it.title, year: it.year || null,
      rating: it.rating, poster: it.poster, backdrop: it.backdrop, overview: it.overview, netflix: /netflix\.com\/title\//.test(it.url || '') ? it.url : null,
      tmdb: t10Key(it, k) ? `https://www.themoviedb.org/${k}/${it.id}` : null,
      services: (it.on || [s.key]).map((x) => all.find((y) => y.key === x)).filter(Boolean).map((y) => ({ label: y.label, logo: y.logo })) }); return n; };
    const href = (it) => esc(it.url || (t10Key(it, k) ? `https://www.themoviedb.org/${k}/${it.id}` : './'));
    const sub = (it) => [k === 'movie' ? 'Film' : 'Series', it.year].filter(Boolean).join(' · ');
    const one = l[0], yours = mineSet.has(s.key);
    return `<section class="t10-col" id="t10-${esc(s.key)}" aria-labelledby="t10h-${esc(s.key)}">
      <header class="t10-ch"><span class="t10-logo">${s.logo ? `<img src="${esc(s.logo)}" alt="">` : esc(s.label[0])}</span><h3 id="t10h-${esc(s.key)}">${esc(s.label)}</h3>${yours ? '<span class="t10-pill">Yours</span>' : ''}</header>
      <a class="t10-one" href="${href(one)}" target="_blank" rel="noopener" data-t10="${reg(one, 0)}">
        <span class="t10-one-bg" aria-hidden="true">${one.backdrop ? `<img src="${esc(one.backdrop.replace('/w1280/', '/w780/'))}" alt="" loading="lazy" decoding="async">` : one.poster ? `<img class="blur" src="${esc(one.poster)}" alt="" loading="lazy">` : t10Ph(one.title)}</span>
        <span class="t10-one-n" aria-hidden="true">1</span>
        <span class="t10-one-t"><small>No. 1 ${word}</small><b>${esc(one.title)}</b><span>${esc(sub(one))}${one.rating ? ` · ★ ${(+one.rating).toFixed(1)}` : ''}</span></span></a>
      <a class="btn btn-tinted t10-go" href="browse.html?s=${encodeURIComponent(s.key)}">${T10_IC.go}Browse ${esc(s.label)}</a>
      <p class="t10-also">Also charting on ${esc(s.label)}:</p>
      <ol class="cl t10-l" start="2">${l.slice(1).map((it, j) => `<li><a href="${href(it)}" target="_blank" rel="noopener" data-t10="${reg(it, j + 1)}">
        <span class="t10-n">${j + 2}</span>${it.poster ? `<img src="${esc(t10Small(it.poster))}" alt="" loading="lazy" decoding="async">` : t10Ph(it.title)}
        <span class="cl-t"><b>${esc(it.title)}</b><small>${esc(sub(it))}</small></span>${t10Move(it.mv)}</a></li>`).join('')}</ol></section>`;
  }
  function t10Draw(dlg, d) {
    const row = dlg.querySelector('#t10Row'), k = t10Kind();
    dlg.querySelectorAll('.t10-seg button').forEach((b) => b.setAttribute('aria-checked', b.dataset.kind === k));
    const all = (d?.services || []).filter((s) => !s.shop && !s.store);
    const mineSet = new Set(mine.get()), list = [...all].sort((a, b) => (mineSet.has(b.key) - mineSet.has(a.key)));   // yours first, then the charts' own order
    t10.info = [];
    const cols = list.map((s) => t10Col(s, k, mineSet, all)).filter(Boolean);
    const shown = list.filter((s) => (s[k] || []).length);
    dlg.querySelector('#t10Logos').innerHTML = shown.map((s, i) => `<button type="button" data-jump="${esc(s.key)}" aria-label="${esc(s.label)}" title="${esc(s.label)}"${i ? '' : ' aria-current="true"'}>${s.logo ? `<img src="${esc(s.logo)}" alt="">` : `<span>${esc(s.label[0])}</span>`}</button>`).join('');
    row.innerHTML = cols.length ? cols.join('') : `<p class="t10-none">${d ? 'The charts are on their way. They’ll be here after the next hourly update.' : 'The charts didn’t load. Check your connection and try again.'}</p>`;
    row.scrollLeft = 0; row.querySelectorAll('.t10-col').forEach((c) => (c.scrollTop = 0));
    const at = new Date(d?.generatedAt), when = isNaN(at) ? '' : at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    dlg.querySelector('#t10When').textContent = when ? `Updated every hour, last at ${when}.` : 'Updated every hour.';
    row.setAttribute('aria-busy', 'false'); t10Ends(dlg);
    featureTip({ id: 'top10s-popup', for: '#t10Row', title: 'Every Top 10 at once', text: 'Each service’s chart side by side. Scroll or swipe across the services, switch between shows and films, and tap a title to see where to watch.' });
  }
  // the arrows, the faded edges and which logo is lit follow the row as it scrolls
  function t10Ends(dlg) {
    const row = dlg.querySelector('#t10Row'), max = row.scrollWidth - row.clientWidth - 2;
    const [p, n] = dlg.querySelectorAll('[data-t10go]');
    p.disabled = row.scrollLeft <= 2; n.disabled = row.scrollLeft >= max; p.hidden = n.hidden = max <= 0;
    row.classList.toggle('at-start', row.scrollLeft <= 2); row.classList.toggle('at-end', row.scrollLeft >= max);
    const cols = [...row.querySelectorAll('.t10-col')], x = row.getBoundingClientRect().left;
    const first = cols.reduce((b, c) => { const d = Math.abs(c.getBoundingClientRect().left - x - 16); return d < b.d ? { c, d } : b; }, { c: null, d: Infinity }).c;
    dlg.querySelectorAll('#t10Logos button').forEach((b) => b.toggleAttribute('aria-current', !!first && `t10-${b.dataset.jump}` === first.id));
  }
  function top10s() {
    let dlg = document.getElementById('t10');
    if (!dlg) {
      document.body.insertAdjacentHTML('beforeend', `<dialog class="t10" id="t10" aria-labelledby="t10H" closedby="any">
        <header class="t10-hd">
          <div class="t10-logos" id="t10Logos" aria-label="Jump to a service"></div>
          <h2 id="t10H">The <em class="grad">Top 10s</em></h2>
          <div class="t10-acts">
            <div class="segmented t10-seg" role="radiogroup" aria-label="Shows or films"><span class="seg-thumb" aria-hidden="true"></span>${Object.entries(T10_KIND).map(([k, l]) => `<button type="button" role="radio" data-kind="${k}" aria-checked="false">${l}</button>`).join('')}</div>
            <button type="button" class="t10-x" id="t10X" aria-label="Close">${T10_IC.x}</button></div>
        </header>
        <div class="t10-row" id="t10Row" aria-busy="true"></div>
        <footer class="t10-ft">
          <p><span id="t10When"></span> <span class="t10-fine">Built from what’s trending on TMDB and where it streams in the UK, so a chart may look a little different from the service’s own.</span> <a href="charts.html#top10" data-page>How the charts moved this week</a></p>
          <span class="t10-arrows"><button type="button" class="t10-ar" data-t10go="-1" aria-label="Previous services">${T10_IC.prev}</button><button type="button" class="t10-ar" data-t10go="1" aria-label="Next services">${T10_IC.next}</button></span>
        </footer></dialog>`);
      dlg = document.getElementById('t10');
      const row = dlg.querySelector('#t10Row'), seg = dlg.querySelector('.t10-seg');
      const shut = () => {
        if (!dlg.open || dlg.classList.contains('out')) return;
        if (reduce()) { dlg.close(); return; }
        dlg.classList.add('out'); setTimeout(() => { dlg.classList.remove('out'); dlg.close(); }, 240);
      };
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); shut(); });
      dlg.querySelector('#t10X').addEventListener('click', shut);
      const pick = (b) => {
        if (!b || b.getAttribute('aria-checked') === 'true') return;
        t10.kind = b.dataset.kind; try { sessionStorage.setItem('tenner-tt-kind', t10.kind); } catch {}
        haptic(6); planFile('trending').then((d) => t10Draw(dlg, d));
      };
      seg.addEventListener('click', (e) => pick(e.target.closest('button[data-kind]')));
      segment(seg, pick); arrows(seg, () => [...seg.querySelectorAll('button')], pick);
      dlg.addEventListener('click', (e) => {
        if (e.target === dlg) { shut(); return; }   // a tap on the dimmed page around the card
        const j = e.target.closest('[data-jump]');
        if (j) { const c = dlg.querySelector(`#t10-${CSS.escape(j.dataset.jump)}`); if (c) row.scrollTo({ left: c.offsetLeft - row.offsetLeft - parseFloat(getComputedStyle(row).scrollPaddingLeft || 0), behavior: reduce() ? 'auto' : 'smooth' }); return; }
        const g = e.target.closest('[data-t10go]');
        if (g) { const c = row.querySelector('.t10-col'), step = c ? c.offsetWidth + parseFloat(getComputedStyle(row).columnGap || 0) : row.clientWidth;
          row.scrollBy({ left: +g.dataset.t10go * step * Math.max(1, Math.floor((row.clientWidth + 2) / step)), behavior: reduce() ? 'auto' : 'smooth' }); return; }
        const a = e.target.closest('[data-t10]');
        if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;   // modified clicks open TMDB as usual
        e.preventDefault(); const info = t10.info[+a.dataset.t10]; if (!info) return;
        if (window.tnSheet) window.tnSheet.open(info); else if (info.k) location.href = `./?t=${info.k}`;
      });
      row.addEventListener('scroll', () => t10Ends(dlg), { passive: true });
      new ResizeObserver(() => t10Ends(dlg)).observe(row);
    }
    if (dlg.open) return;
    const row = dlg.querySelector('#t10Row');
    if (!row.children.length) row.innerHTML = Array.from({ length: 4 }, () => '<section class="t10-col t10-sk" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></section>').join('');
    const k = t10Kind(); dlg.querySelectorAll('.t10-seg button').forEach((b) => b.setAttribute('aria-checked', b.dataset.kind === k));
    dlg.showModal(); haptic(8); dlg.querySelector('#t10X').focus({ preventScroll: true });
    glide(dlg.querySelector('.t10-seg .seg-thumb'), dlg.querySelector('.t10-seg [aria-checked="true"]'), false, 1.1);   // the thumb under the choice, now it can be measured
    planFile('trending').then((d) => { if (dlg.open) t10Draw(dlg, d); });
  }
  // every link to the Top 10s page opens the popup instead (data-page keeps one going to the page: the week on the charts)
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href$="charts.html#top10"]:not([data-page])');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    e.preventDefault(); top10s();
  });

  // ---------- Share: the phone's own share sheet where there is one, otherwise the share card ----------
  // As on Channel Crossings: on phones and tablets the system share sheet; on computers a black card (a native modal
  // <dialog>: Escape, focus and the dimmed page come free) with X, Facebook, WhatsApp, Telegram and Copy link, plus
  // "Save as picture" where there's a picture to save. Nothing loads from those sites until a button's pressed.
  // share({ heading, title, text, url, picture: async () => ({ blob, name }) })
  const NETS = [
    ['Post on X', (t, u) => `https://x.com/intent/post?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}`,
      '<path fill="currentColor" d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43Z"/>'],
    ['Share on Facebook', (t, u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
      '<circle cx="12" cy="12" r="11" fill="#0866FF"/><path fill="#fff" d="M13.4 23v-8.1h2.7l.42-3.2H13.4V9.7c0-.92.26-1.55 1.58-1.55h1.68V5.3a22 22 0 0 0-2.45-.13c-2.43 0-4.09 1.48-4.09 4.2v2.35H7.37v3.2h2.75V23z"/>'],
    ['Send on WhatsApp', (t, u) => `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}`,
      '<path fill="#25D366" d="M12 1.5A10.4 10.4 0 0 0 3.05 17.2L1.6 22.5l5.45-1.43A10.4 10.4 0 1 0 12 1.5Z"/><path fill="#fff" d="M17.6 14.5c-.3-.15-1.8-.88-2.07-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.35.22-.65.07a8.5 8.5 0 0 1-4.2-3.67c-.32-.55.32-.5.9-1.68.1-.2.05-.37-.02-.52-.08-.15-.68-1.64-.93-2.24-.25-.59-.5-.5-.68-.51h-.58c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1 .15 .2 2.1 3.2 5.08 4.49 1.89.81 2.62.88 3.56.74.57-.09 1.8-.74 2.04-1.45.25-.71.25-1.47.18-1.45-.07-.13-.27-.2-.57-.35Z"/>'],
    ['Send on Telegram', (t, u) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
      '<circle cx="12" cy="12" r="11" fill="#29A9EB"/><path fill="#fff" d="M5.3 11.7 16.9 7.2c.54-.2 1.01.13.83.95l-1.97 9.3c-.15.66-.54.82-1.09.51l-3-2.22-1.45 1.4c-.16.16-.3.3-.6.3l.21-3.05 5.55-5.01c.24-.21-.05-.33-.38-.12l-6.86 4.32-2.96-.92c-.64-.2-.65-.64.14-.95Z"/>'],
  ];
  const LINK = '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4.5 4.5 0 0 0 6.4.4l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 0 0-6.4-.4l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/></g>';
  const PIC = '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m20.5 16-4.8-4.8L6 19.5"/></g>';
  // the scene at the foot of the card: a drive-in on a starry night, the screen glowing in Tenner's colours
  const SCENE = `<svg viewBox="0 0 280 170" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>
      <linearGradient id="scSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".6" stop-color="#0d0b24"/><stop offset="1" stop-color="#1d1440"/></linearGradient>
      <linearGradient id="scScr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff375f"/><stop offset=".35" stop-color="#ff9f0a"/><stop offset=".7" stop-color="#0a84ff"/><stop offset="1" stop-color="#bf5af2"/></linearGradient>
      <linearGradient id="scBeam" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <radialGradient id="scGlow"><stop offset="0" stop-color="#bf5af2" stop-opacity=".55"/><stop offset="1" stop-color="#bf5af2" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="280" height="170" fill="url(#scSky)"/>
    <g fill="#fff">${[[22, 18, 1.1], [58, 34, .8], [96, 12, 1], [204, 20, 1.2], [238, 40, .8], [262, 14, 1], [150, 8, .7], [178, 44, .8], [36, 52, .7]].map(([x, y, r]) => `<circle class="sc-star" cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
    <ellipse class="sc-glow" cx="140" cy="80" rx="110" ry="60" fill="url(#scGlow)"/>
    <path class="sc-beam" d="M232 150 L96 52 L184 52 Z" fill="url(#scBeam)"/>
    <rect x="128" y="104" width="4" height="40" fill="#14112b"/><rect x="148" y="104" width="4" height="40" fill="#14112b"/>
    <rect class="sc-screen" x="88" y="44" width="104" height="62" rx="4" fill="url(#scScr)"/>
    <text x="140" y="88" text-anchor="middle" font-family="Inter Tight, Inter, -apple-system, sans-serif" font-weight="800" font-size="34" fill="none" stroke="#fff" stroke-width="1.6" opacity=".92">10</text>
    <path d="M0 150 Q70 138 140 144 T280 140 V170 H0Z" fill="#0b0920"/>
    <g fill="#05040d"><path d="M40 152h44l-6-10H50z"/><rect x="36" y="150" width="52" height="9" rx="4"/><path d="M170 154h40l-5-9h-26z"/><rect x="166" y="152" width="48" height="8" rx="4"/></g>
    <g fill="#ffd60a" opacity=".85"><circle cx="40" cy="155" r="1.6"/><circle cx="166" cy="157" r="1.5"/></g>
    <rect x="226" y="146" width="12" height="9" rx="2" fill="#05040d"/>
  </svg>`;
  let card = null, shareNow = null;
  function shareCard() {
    if (card) return card;
    document.body.insertAdjacentHTML('beforeend', `<dialog class="share-card" id="shareCard" aria-labelledby="scT">
      <button type="button" class="sc-x" id="scX" aria-label="Close"><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
      <h2 id="scT"></h2>
      <div class="sc-btns" id="scBtns"></div>
      <p>Each post carries a link back to Tenner. Nothing loads from these sites until you tap.</p>
      <div class="sc-art">${SCENE}</div>
    </dialog>`);
    card = $('#shareCard');
    const shut = () => { if (!card.open || card.classList.contains('out')) return; if (reduce()) { card.close(); return; } card.classList.add('out'); setTimeout(() => { card.classList.remove('out'); card.close(); }, 200); };
    $('#scX').addEventListener('click', shut);
    card.addEventListener('cancel', (e) => { e.preventDefault(); shut(); });
    card.addEventListener('click', (e) => {   // a tap on the dimmed page closes it
      if (e.target === card) { const r = card.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) shut(); return; }
      const b = e.target.closest('[data-sc]'); if (!b || !shareNow) return;
      if (b.dataset.sc === 'copy') {
        // no clipboard (or it said no): the link itself shows instead, for a moment, so it can be copied by hand
        const say = (t, ms) => { b.lastChild.textContent = t; clearTimeout(b.t); b.t = setTimeout(() => (b.lastChild.textContent = 'Copy link'), ms); };
        (navigator.clipboard ? navigator.clipboard.writeText(shareNow.url) : Promise.reject()).then(() => say('Link copied', 1600), () => say(shareNow.url, 6000));
      } else if (b.dataset.sc === 'pic') {
        b.disabled = true; b.lastChild.textContent = 'Making the picture…';
        shareNow.picture().then((p) => {
          if (!p?.blob) throw new Error();
          const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(p.blob), download: p.name }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
          b.lastChild.textContent = 'Picture saved';
        }).catch(() => { b.lastChild.textContent = 'Couldn’t make the picture'; })
          .finally(() => { b.disabled = false; setTimeout(() => (b.lastChild.textContent = 'Save as picture'), 1800); });
      }
    });
    return card;
  }
  async function share(o) {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {   // phones and tablets: the system's own share sheet
      let files;
      try { const p = o.picture && await o.picture(); const f = p?.blob && new File([p.blob], p.name, { type: p.blob.type }); if (f && navigator.canShare?.({ files: [f] })) files = [f]; } catch {}
      return navigator.share(files ? { files, title: o.title, text: `${o.text} ${o.url}` } : { title: o.title, text: o.text, url: o.url }).catch(() => {});
    }
    const c = shareCard(); shareNow = o;
    $('#scT').textContent = o.heading;
    $('#scBtns').innerHTML = NETS.map(([label, href, icon]) => `<a class="sc-b" href="${esc(href(o.text, o.url))}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg><span>${label}</span></a>`).join('')
      + `<button type="button" class="sc-b" data-sc="copy"><svg viewBox="0 0 24 24" aria-hidden="true">${LINK}</svg><span>Copy link</span></button>`
      + (o.picture ? `<button type="button" class="sc-b" data-sc="pic"><svg viewBox="0 0 24 24" aria-hidden="true">${PIC}</svg><span>Save as picture</span></button>` : '');
    c.classList.remove('out'); if (!c.open) c.showModal();
    $('#scX').focus({ preventScroll: true });
  }

  // ---------- search, from any page: a native search box under the logo (at the top of the menu on phones) ----------
  // Results as you type, matched the way Browse matches (fold and score, below): this hour's catalogue first, then every
  // other film and show and the cast and crew from the search service, and a last row that opens the full results in
  // Browse. A title opens its sheet here, a person theirs (person.js), or on the homepage where a page has neither.
  // Browse keeps its own box.
  // Accents, case and punctuation don't matter: 'Amelie' finds 'Amélie', 'spiderman' finds 'Spider-Man'.
  const fold = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
  function score(x, q) {           // x: a catalogue entry ({ n: name }); q: folded. Higher is better; 0 means no match
    if (!x._f) { x._f = fold(x.n); x._t = x._f.replace(/ /g, ''); x._a = x._f.replace(/^(the|a|an) /, ''); x._i = x._f.split(' ').map((w) => w[0]).join(''); }
    if (x._f === q || x._a === q) return 100;
    if (x._f.startsWith(q) || x._a.startsWith(q)) return 80;
    if ((' ' + x._f).includes(' ' + q)) return 60;            // a word starts with it
    if (x._t.includes(q.replace(/ /g, ''))) return 40;         // ignoring spaces and dashes
    const words = q.split(' ');
    if (words.length > 1 && words.every((w) => x._f.includes(w) || (w.length > 1 && x._i.includes(w)))) return 30;   // initials count: 'svu'
    if (q.length > 1 && !q.includes(' ') && x._i === q) return 50;
    return 0;
  }
  const brandEl = $('.top-brand');
  if (brandEl) {
    const GLASS = '<svg class="ss-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5 20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    brandEl.insertAdjacentHTML('afterend', `<div class="side-search" role="search">${GLASS}
      <input id="ssQ" type="search" placeholder="Search shows, films and cast" aria-label="Search shows, films and cast" autocomplete="off" spellcheck="false" enterkeyhint="search"
        role="combobox" aria-expanded="false" aria-controls="ssRes" aria-autocomplete="list">
      <div class="ss-res" id="ssRes" role="listbox" aria-label="Search results" hidden></div></div>`);
    const box = $('.side-search'), qi = $('#ssQ'), res = $('#ssRes'), phone = matchMedia('(max-width: 719px)'), inline = matchMedia('(max-width: 719px), (min-width: 1000px)');
    const S = { cat: null, catP: null, svc: null, items: new Map(), people: [], q: '', t: 0, ctl: null, at: -1 };
    // the catalogue (and the services' names) are fetched the first time the box is used, then kept
    const load = () => S.catP ||= Promise.all([
      fetch('data/browse.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('data/trending.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      prefs.get().no18 && window.tnSheet?.details ? window.tnSheet.details().catch(() => null) : null,
    ]).then(([c, t, d]) => {
      S.cat = c; S.svc = Object.fromEntries((t?.services || []).map((s) => [s.key, s]));
      if (d && c) c.items = c.items.filter((x) => d.items?.[`${x.t[0]}${x.i}`]?.c !== '18');   // Settings: "Hide titles rated 18"
      if (S.q) draw();
    });
    // phones and computers: the results fill the menu (the drawer, or the sidebar); tablets: they float over the page in a
    // popover (the browser's top layer)
    const fit = () => {
      if (inline.matches) { res.removeAttribute('popover'); res.removeAttribute('style'); return; }
      res.setAttribute('popover', 'manual');
      const r = qi.getBoundingClientRect(), w = Math.min(380, innerWidth - r.left - 12);
      Object.assign(res.style, { left: `${r.left}px`, top: `${r.bottom + 8}px`, width: `${Math.max(w, r.width)}px` });
    };
    const shown = () => (inline.matches ? !res.hidden : res.matches(':popover-open'));
    function show(on) {
      on = on && !!S.q;
      qi.setAttribute('aria-expanded', on); box.classList.toggle('on', on); $('#drawer')?.classList.toggle('finding', on && phone.matches);
      if ($('#drH')) $('#drH').textContent = on && phone.matches ? 'Search' : 'More';
      box.parentElement.classList.toggle('finding', on && inline.matches && !phone.matches);
      if (inline.matches) { res.hidden = !on; return; }
      res.hidden = false; fit();
      if (on && !shown()) res.showPopover?.(); else if (!on && shown()) res.hidePopover?.();
    }
    const DEPT = { Acting: 'Actor', Directing: 'Director', Writing: 'Writer', Production: 'Producer', Sound: 'Composer', Camera: 'Cinematographer', Editing: 'Editor' };
    const row = (x, i) => {
      if (x.person) return `<a class="ss-r ss-p" role="option" id="ssr${i}" aria-selected="false" href="./?p=${x.id}" data-p="${x.id}"><span class="ss-pf" style="--h:${hue(x.name)}">${x.photo
        ? `<img src="${esc(x.photo)}" alt="" loading="lazy" decoding="async">` : esc(x.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join(''))}</span>
        <span class="ss-t"><b>${esc(x.name)}</b><small>${esc([DEPT[x.dept] || x.dept, x.known.slice(0, 2).join(', ')].filter(Boolean).join(' · '))}</small></span></a>`;
      const art = x.poster ? `<img src="${esc(x.poster)}" alt="" loading="lazy" decoding="async">` : `<span class="ss-ph" style="background:hsl(${hue(x.title)} 45% 35%)"></span>`;
      return `<a class="ss-r" role="option" id="ssr${i}" aria-selected="false" href="./?t=${esc(x.k)}" data-k="${esc(x.k)}">${art}
        <span class="ss-t"><b>${esc(x.title)}</b><small>${esc([x.type === 'tv' ? 'Show' : 'Film', x.year, x.on].filter(Boolean).join(' · '))}</small></span></a>`;
    };
    const seeAll = () => `<a class="ss-r ss-all" role="option" id="ssrAll" aria-selected="false" href="browse.html#q=${encodeURIComponent(qi.value.trim())}">${GLASS.replace('ss-ic', 'ss-all-ic')}
      <span class="ss-t"><b>See all results</b><small>In Browse, with filters</small></span></a>`;
    function draw() {
      const q = S.q;
      if (!q) { res.innerHTML = ''; show(false); return; }
      const c = S.cat, local = !c ? [] : c.items.map((x) => [x, score(x, q)]).filter(([, sc]) => sc).sort((a, b) => b[1] - a[1] || b[0].p - a[0].p).slice(0, 5)
        .map(([x]) => ({ k: `${x.t[0]}${x.i}`, type: x.t, title: x.n, year: (x.d || '').slice(0, 4) || null, rating: x.r || null, from: x,
          poster: x.img ? (x.img.startsWith('/') ? c.img + x.img : x.img) : null, on: x.s.map((s) => S.svc?.[s]?.label).filter(Boolean)[0] || '' }));
      const have = new Set(local.map((x) => x.k)), more = [...S.items.values()].filter((x) => !have.has(x.k)).slice(0, 8 - local.length);
      // cast and crew: up to three, first when a name matches better than any title does ('tom hanks'), otherwise after
      // this hour's titles
      const people = S.people.slice(0, 3), best = (l) => Math.max(0, ...l.map((x) => score({ n: x.title || x.name }, q)));
      const lead = people.length && best(people) > best([...local, ...more]);
      S.list = lead ? [...people, ...local, ...more] : [...local, ...people, ...more]; S.at = -1;
      res.innerHTML = (S.list.length ? S.list.map(row).join('') : `<p class="ss-note">${S.busy || !S.catP || !c ? 'Searching…' : `Nothing found for “${esc(qi.value.trim())}”.`}</p>`) + seeAll();
      qi.removeAttribute('aria-activedescendant');
      show(document.activeElement === qi || box.contains(document.activeElement) || res.contains(document.activeElement));
    }
    // every other film and show, and the people (TMDB, via the search service), after a short pause in typing
    function web() {
      const raw = qi.value.trim(); clearTimeout(S.t); S.ctl?.abort(); S.items = new Map(); S.people = [];
      if (!api || raw.length < 2) { S.busy = false; return; }
      S.busy = true;
      S.t = setTimeout(async () => {
        S.ctl = new AbortController();
        try {
          const ask = (path) => fetch(`${api}${path}?q=${encodeURIComponent(raw.slice(0, 80))}`, { signal: S.ctl.signal }).then((r) => (r.ok ? r.json() : null)).catch((e) => { if (e.name === 'AbortError') throw e; return null; });
          const [d, pp] = await Promise.all([ask('/search'), ask('/people')]);
          if (qi.value.trim() !== raw) return;
          for (const x of d?.results || []) S.items.set(x.k, { ...x, poster: x.poster ? d.img + x.poster : null, backdrop: x.backdrop ? d.bd + x.backdrop : null, web: true });
          // the people worth showing: a face or something they're known for, so the names nobody's heard of stay out
          S.people = (pp?.results || []).filter((x) => x.photo && x.known?.length).map((x) => ({ ...x, person: true, k: `p${x.id}` }));
        } catch (e) { if (e.name === 'AbortError') return; }
        S.busy = false; draw();
      }, 280);
    }
    qi.addEventListener('focus', () => { load(); if (S.q) draw(); });
    qi.addEventListener('input', () => { S.q = fold(qi.value).slice(0, 80); web(); draw(); });
    // the arrow keys move through the results, Return opens one (or the full results), Escape clears, then leaves
    const pick = (i) => {
      const rows = [...res.querySelectorAll('.ss-r')]; if (!rows.length) return;
      S.at = (i + rows.length) % rows.length;
      rows.forEach((a, j) => a.setAttribute('aria-selected', j === S.at));
      qi.setAttribute('aria-activedescendant', rows[S.at].id); rows[S.at].scrollIntoView({ block: 'nearest' });
    };
    qi.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (!shown()) return; e.preventDefault(); pick(S.at + (e.key === 'ArrowDown' ? 1 : S.at < 0 ? 0 : -1)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (!S.q) return; (res.querySelectorAll('.ss-r')[Math.max(0, S.at)] || res.querySelector('.ss-all'))?.click(); }
      else if (e.key === 'Escape') { if (qi.value) { e.preventDefault(); e.stopPropagation(); qi.value = ''; S.q = ''; web(); draw(); } else if (!phone.matches) qi.blur(); }
    });
    qi.addEventListener('search', () => { if (!qi.value) { S.q = ''; web(); draw(); } });   // the box's own clear button
    async function go(x) {
      show(false); qi.blur();
      if (!window.tnSheet) { location.href = `./?t=${x.k}`; return; }
      if (window.tnSheet.isOpen()) { window.tnSheet.close(); await new Promise((r) => setTimeout(r, 380)); }
      const c = x.from;
      window.tnSheet.open(c ? { k: x.k, type: x.type, title: x.title, year: x.year, rating: x.rating, poster: x.poster,
        genres: [...new Set(c.g.map((g) => S.cat.genres?.[g]).filter(Boolean))].slice(0, 3), tmdb: `https://www.themoviedb.org/${c.t}/${c.i}`,
        services: c.s.map((s) => ({ label: S.svc?.[s]?.label || s, logo: S.svc?.[s]?.logo })) }
        : { k: x.k, type: x.type, title: x.title, year: x.year, rating: x.rating, poster: x.poster, backdrop: x.backdrop, overview: x.overview,
          tmdb: `https://www.themoviedb.org/${x.type}/${x.k.slice(1)}`, services: [] });
    }
    res.addEventListener('pointerdown', (e) => { if (!phone.matches) e.preventDefault(); });   // keep the box focused while choosing
    res.addEventListener('click', (e) => {
      const a = e.target.closest('.ss-r'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      if (a.classList.contains('ss-all')) { show(false); if (onPage('browse')) { e.preventDefault(); location.hash = `q=${encodeURIComponent(qi.value.trim())}`; } return; }
      if (a.dataset.p) {   // a person: their sheet here, or on the homepage where this page has none
        show(false); qi.blur();
        if (window.tnPerson) { e.preventDefault(); window.tnPerson.open(a.dataset.p, false, a.querySelector('b')?.textContent); }
        return;
      }
      const x = S.list.find((y) => y.k === a.dataset.k); if (!x) return;
      e.preventDefault(); go(x);
    });
    // computers: a tap anywhere else puts the results away; they come back when you return to the box
    qi.addEventListener('blur', () => { if (!phone.matches) setTimeout(() => { if (document.activeElement !== qi) show(false); }, 120); });
    addEventListener('resize', () => { if (shown()) fit(); });
    inline.addEventListener('change', () => { show(false); fit(); });
    fit();
    window.tnFind = () => { qi.focus(); qi.select(); };
  }

  // the menu's search box, ready to type in: on phones the menu opens first
  function findAnywhere() {
    if (!window.tnFind) { location.href = 'browse.html#search'; return; }
    const d = $('#drawer');
    if (d && drawerQ.matches && !d.open) d.showModal();
    window.tnFind();
  }

  // ---------- phones: the iOS way. The pages are a floating glass tab bar along the bottom, with Search as its own round
  // tab beside it (as in iOS 26's Music, TV and App Store). The bar at the top: a back button on pages under More, the logo
  // in the middle and, on the right, the page's Share (or Filters) and your account picture, which opens the More sheet:
  // a native modal <dialog> that rises from the bottom (Search, your account, About, Theme, Settings and the small print),
  // grouped like iOS Settings. Swipe it down, tap outside or press Done to put it away. ----------
  const drawerQ = matchMedia('(max-width: 719px)');
  const topRow = $('.top-row');
  if (topRow) {
    const ME = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="3.6" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M5.6 19c1.2-3 3.6-4.6 6.4-4.6s5.2 1.6 6.4 4.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
    topRow.insertAdjacentHTML('afterbegin', '<div class="tb-right" id="tbRight"></div>');
    const rightBox = $('#tbRight');
    rightBox.insertAdjacentHTML('beforeend', `<button type="button" class="tb-round tb-menu" id="menuBtn" aria-label="Your account and more" aria-haspopup="dialog" aria-controls="drawer" aria-expanded="false">${ME}</button>`);
    // pages under More (Settings, About, Contact…), not one of the tabs: iOS's back button, top left
    if (['settings', 'about', 'account', 'contact', 'legal', 'updates', 'list'].some(onPage)) {
      const back = Object.assign(document.createElement('a'), { className: 'tb-round tb-back', href: './',
        innerHTML: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
      back.setAttribute('aria-label', 'Back');
      back.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        let same = false; try { same = !!document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1; } catch {}
        if (same) { e.preventDefault(); history.back(); }
      });
      topRow.prepend(back);
    }
    // the right-hand slot: the page's own Share if it has one, otherwise the Filters menu if the page has filters
    const share = $('#shareChart');
    const filters = [...document.querySelectorAll('[data-filter]')];
    // Search: a round glass tab of its own, beside the tab bar
    const search = Object.assign(document.createElement('a'), { className: 'tb-search', href: 'browse.html#search',
      innerHTML: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.1"/><path d="M15.5 15.5 20 20" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>' });
    search.setAttribute('aria-label', 'Search');
    const right = share, rightHome = share ? document.createComment('share') : null;
    if (rightHome) share.before(rightHome);
    document.body.insertAdjacentHTML('beforeend', `<dialog class="drawer" id="drawer" aria-labelledby="drH">
      <div class="dr-grab" aria-hidden="true"></div>
      <div class="dr-head"><h2 class="dr-title" id="drH">More</h2>
        <button type="button" class="btn btn-tinted dr-done" id="drX"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Done</button></div>
      <div class="dr-body" id="drBody"></div></dialog>`);
    const drawer = $('#drawer'), drBody = $('#drBody'), menuBtn = $('#menuBtn'), tabbar = $('.tabbar');
    // the sidebar's own pieces move into the sheet on phones (and back again on bigger screens), listeners and all
    const movers = ['.side-search', '.side-about:not(.side-settings)', '.top-act', '.side-about.side-settings', '.side-links'].map((q) => $(q)).filter(Boolean);
    const marks = movers.map((el) => { const m = document.createComment('drawer'); el.before(m); return m; });
    // the tab bar leaves the top bar on phones (which is a backdrop root, so its frost would have nothing to blur)
    const tbMark = tabbar ? document.createComment('tabbar') : null;
    if (tbMark) tabbar.before(tbMark);
    const place = () => {
      if (drawerQ.matches) { movers.forEach((el) => drBody.append(el)); if (right) rightBox.prepend(right); if (tabbar) { tabbar.append(search); topRow.after(tabbar); } }
      else {
        if (drawer.open) drawer.close();
        if (tbMark) tbMark.after(tabbar);
        movers.forEach((el, i) => marks[i].after(el));
        if (rightHome) rightHome.after(share); search.remove();
      }
    };
    place(); drawerQ.addEventListener('change', place);
    const shut = () => {
      if (!drawer.open || drawer.classList.contains('out')) return;
      if (reduce()) { drawer.close(); return; }
      drawer.classList.add('out'); setTimeout(() => { drawer.classList.remove('out'); drawer.close(); }, 300);
    };
    menuBtn.addEventListener('click', () => { drawer.showModal(); $('#drX').focus({ preventScroll: true }); });
    // the round Search tab: Browse's own box on Browse, the More sheet's search box everywhere else
    search.addEventListener('click', (e) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); open('search'); });
    drawer.addEventListener('close', () => { menuBtn.setAttribute('aria-expanded', 'false'); root.classList.remove('drawer-open'); drawer.classList.remove('finding'); });
    drawer.addEventListener('cancel', (e) => { e.preventDefault(); shut(); });
    new MutationObserver(() => { const o = drawer.open; menuBtn.setAttribute('aria-expanded', o); root.classList.toggle('drawer-open', o); }).observe(drawer, { attributes: true, attributeFilter: ['open'] });
    $('#drX').addEventListener('click', shut);
    drawer.addEventListener('click', (e) => {
      if (e.target === drawer) { const r = drawer.getBoundingClientRect(); if (e.clientY < r.top) shut(); return; }
      if (e.target.closest('a[href]')) setTimeout(shut, 60);   // a link chosen: the sheet gets out of the way
    });
    // swipe a sheet down to put it away (from its grabber and title, or anywhere once its list is at the top)
    const swipeAway = (dlg, away) => {
      let y0 = null, dy = 0;
      dlg.addEventListener('touchstart', (e) => { if (dlg.scrollTop > 0 || e.target.closest('input, select, .ss-res')) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
      dlg.addEventListener('touchmove', (e) => {
        if (y0 == null) return;
        dy = Math.max(0, e.touches[0].clientY - y0);
        if (dy > 4) { dlg.classList.add('dragging'); dlg.style.setProperty('--drag', `${dy}px`); }
      }, { passive: true });
      dlg.addEventListener('touchend', () => {
        if (y0 == null) return; y0 = null; dlg.classList.remove('dragging');
        if (dy > 110) { haptic(8); away(); } else dlg.style.removeProperty('--drag');
      });
      dlg.addEventListener('close', () => dlg.style.removeProperty('--drag'));
    };
    swipeAway(drawer, shut);
    // iOS 26: scrolling down tucks the tab bar in, scrolling up (or reaching either end) brings it back
    let lastY = scrollY, tuck = false;
    addEventListener('scroll', () => {
      const y = scrollY, dy = y - lastY, end = y + innerHeight >= document.documentElement.scrollHeight - 40;
      if (Math.abs(dy) < 6 && !end) return;
      const t = drawerQ.matches && dy > 0 && y > 140 && !end;
      if (t !== tuck) { tuck = t; root.classList.toggle('tb-min', t); }
      lastY = y;
    }, { passive: true });
    // introduce the new layout once, on phones: the menu now lives behind your account button
    if (drawerQ.matches) setTimeout(() => window.tn?.tip?.({ id: 'ios-more', for: '#menuBtn', title: 'Your account and more',
      text: 'The pages are along the bottom now, with Search beside them. Tap here for your account, About, Theme and Settings.' }), 0);

    // ---------- phones: the Filters menu, the left menu's twin, sliding in from the right. Any control on the page marked
    // data-filter="Its heading" moves in here on phones (and back on bigger screens), listeners and all, so a new filter
    // only needs the attribute. Done (or a tap outside) puts it away. ----------
    if (filters.length && !share) {
      const FILT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="15" cy="7" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="17" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
      rightBox.insertAdjacentHTML('afterbegin', `<button type="button" class="tb-round tb-filt" id="filtBtn" aria-label="Filters" aria-haspopup="dialog" aria-controls="filters" aria-expanded="false">${FILT}</button>`);
      document.body.insertAdjacentHTML('beforeend', `<dialog class="drawer drawer-r" id="filters" aria-labelledby="flH">
        <div class="dr-grab" aria-hidden="true"></div>
        <div class="dr-head"><h2 class="fl-h" id="flH">Filters</h2>
          <button type="button" class="tb-round dr-x" id="flX" aria-label="Close filters"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button></div>
        <div class="dr-body fl-body" id="flBody"></div>
        <button type="button" class="btn btn-tinted fl-done" id="flDone"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Done</button></dialog>`);
      const fl = $('#filters'), flBody = $('#flBody'), flBtn = $('#filtBtn');
      const fmarks = filters.map((el) => { const m = document.createComment('filter'); el.before(m); return m; });
      const rows = filters.map((el) => { const r = document.createElement('div'); r.className = 'fl-row';
        r.innerHTML = `<span class="fl-l">${esc(el.dataset.filter)}</span>`; flBody.append(r); return r; });
      const fplace = () => {
        root.classList.toggle('filters-out', drawerQ.matches);
        if (drawerQ.matches) filters.forEach((el, i) => rows[i].append(el));
        else { if (fl.open) fl.close(); filters.forEach((el, i) => fmarks[i].after(el)); }
      };
      fplace(); drawerQ.addEventListener('change', fplace);
      const fshut = () => {
        if (!fl.open || fl.classList.contains('out')) return;
        if (reduce()) { fl.close(); return; }
        fl.classList.add('out'); setTimeout(() => { fl.classList.remove('out'); fl.close(); }, 260);
      };
      flBtn.addEventListener('click', () => { fl.showModal(); $('#flX').focus({ preventScroll: true }); });
      fl.addEventListener('cancel', (e) => { e.preventDefault(); fshut(); });
      new MutationObserver(() => { const o = fl.open; flBtn.setAttribute('aria-expanded', o); root.classList.toggle('drawer-open', o); }).observe(fl, { attributes: true, attributeFilter: ['open'] });
      $('#flX').addEventListener('click', fshut); $('#flDone').addEventListener('click', fshut);
      swipeAway(fl, fshut);
      fl.addEventListener('click', (e) => { if (e.target !== fl) return; const r = fl.getBoundingClientRect(); if (e.clientX < r.left || e.clientY > r.bottom || e.clientY < r.top) fshut(); });
    }
  }

  // ---------- a one-time note about privacy: not a consent banner (there's nothing to consent to), just reassurance ----------
  // Shown once, at the foot of the screen in Tenner's frosted style; Got it puts it away for good on this device.
  // Its wording changed when accounts arrived, so it's shown once more under a new name (the old one is tidied away).
  const NOTE = 'tenner-note-seen-2';
  let noteSeen = false; try { localStorage.removeItem('tenner-note-seen'); noteSeen = !!localStorage.getItem(NOTE); } catch {}
  if (!noteSeen && !navigator.webdriver) setTimeout(() => {
    document.body.insertAdjacentHTML('beforeend', `<aside class="pv-note" id="pvNote" aria-label="Privacy">
      <span class="pv-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M2.5 11.2 6 7.8l3.2 1.1 2.6-1.6a2.2 2.2 0 0 1 2.3 0l5.9 3.7-3.4 3.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="m16.6 14.4-4.1-3.1-2 1.3a1.5 1.5 0 0 1-2-.4 1.5 1.5 0 0 1 .3-2.1l3-2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="m2.5 11.2 3.3 3.6M7.6 16.6l1.6 1.5a1.3 1.3 0 0 0 1.8 0M10.2 15.2l2.3 2.1a1.3 1.3 0 0 0 1.8 0 1.3 1.3 0 0 0 0-1.8M12.6 14l2.1 2a1.3 1.3 0 0 0 1.8-.1 1.3 1.3 0 0 0 0-1.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      <p>Tenner doesn’t use cookies or tracking. Your Watchlist and settings stay on this device unless you sign in to sync them. <a href="legal.html#cookies">Privacy Policy</a></p>
      <button type="button" class="pv-ok" id="pvOk">Got it</button></aside>`);
    const box = $('#pvNote');
    requestAnimationFrame(() => box.classList.add('in'));
    $('#pvOk').addEventListener('click', () => {
      try { localStorage.setItem(NOTE, '1'); } catch {}
      tipReady = true; setTimeout(nextTip, 900);
      box.classList.remove('in'); setTimeout(() => box.remove(), reduce() ? 0 : 350);
    });
  }, 1200);

  // ---------- the search API (worker/, on Cloudflare): every film and show on TMDB. Empty until it's deployed ----------
  const api = 'https://tenner-api.danseacroft.workers.dev';

  // ---------- a title from somewhere else: an IMDb number, a TMDB link, or a name (and year) to search for ----------
  // Used by Settings' import (Letterboxd, IMDb, Trakt, Netflix) and by links shared to Tenner from other apps.
  const foldName = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/^the /, '');
  async function findTitle({ imdb, title, year, type }) {
    const get = (p) => fetch(`${api}${p}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (/^tt\d{1,10}$/.test(imdb || '')) { const d = await get(`/find/${imdb}`); if (d?.k) return d; }
    if (!title) return null;
    const d = await get(`/search?q=${encodeURIComponent(String(title).slice(0, 80))}`), all = (d?.results || []).filter((x) => !type || x.type === type);
    const same = all.filter((x) => foldName(x.title) === foldName(title)), near = (x) => year && x.year && Math.abs(x.year - year) <= 1;
    const x = same.find(near) || (year ? all.find(near) : null) || same[0] || all[0];
    return x ? { k: x.k, type: x.type, title: x.title, year: x.year, poster: x.poster ? d.img + x.poster : null } : null;
  }
  // a link shared to Tenner (the share sheet, once it's on the Home Screen): what it points at
  function sharedTitle(p) {
    const text = [p.get('url'), p.get('text'), p.get('title')].filter(Boolean).join(' ');
    const imdb = text.match(/imdb\.com\/(?:[a-z]{2}\/)?title\/(tt\d{1,10})/)?.[1];
    const tmdb = text.match(/themoviedb\.org\/(movie|tv)\/(\d{1,9})/);
    if (tmdb) return Promise.resolve({ k: `${tmdb[1] === 'movie' ? 'm' : 't'}${tmdb[2]}` });
    const slug = text.match(/letterboxd\.com\/film\/([a-z0-9-]+)/)?.[1] || text.match(/justwatch\.com\/[a-z]{2}\/(?:movie|film)\/([a-z0-9-]+)/)?.[1];
    const show = text.match(/justwatch\.com\/[a-z]{2}\/(?:tv-show|tv-series)\/([a-z0-9-]+)/)?.[1];
    if (slug || show) { const m = (slug || show).match(/^(.*?)(?:-(\d{4}))?$/); return findTitle({ title: m[1].replace(/-/g, ' '), year: +m[2] || null, type: show ? 'tv' : 'movie' }); }
    const name = (p.get('title') || p.get('text') || '').replace(/https?:\/\/\S+/g, '').replace(/^(watch|check out)\s+/i, '').replace(/\s+(on|\|)\s+(netflix|disney\+?|prime video|apple tv\+?|hbo max|max|paramount\+?|youtube|imdb|letterboxd).*$/i, '').replace(/\s*\((\d{4})\)/, ' $1').trim();
    const yr = name.match(/\s(\d{4})$/)?.[1];
    return findTitle({ imdb, title: yr ? name.slice(0, -5) : name, year: +yr || null });
  }

  // ---------- Watchlist alerts (worker/src/push.js): a notification when something you saved arrives ----------
  // The browser's own push service; the Worker is told this device's push address and its Watchlist (and nothing else),
  // and again whenever the Watchlist changes. On an iPhone or iPad, Safari can only do this once Tenner is on the Home Screen.
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const pushSub = async () => { try { const reg = await navigator.serviceWorker?.getRegistration(); return (await reg?.pushManager?.getSubscription()) || null; } catch { return null; } };
  const post = (path, body) => { const t = (() => { try { return localStorage.getItem('tenner-session'); } catch { return null; } })();
    return fetch(`${api}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(t ? { authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify(body) }); };
  const syncAlerts = (sub) => post('/push/subscribe', { sub: sub.toJSON(), watch: saved.all().map((x) => x.k) }).then((r) => { if (!r.ok) throw new Error('subscribe'); });
  const alerts = {
    // 'on', 'off', 'blocked' (turned off in the browser's settings), 'install' (iPhone: add to the Home Screen first) or 'unsupported'
    async state() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return isIOS && !standalone ? 'install' : 'unsupported';
      if (Notification.permission === 'denied') return 'blocked';
      return (await pushSub()) ? 'on' : 'off';
    },
    async enable() {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return perm === 'denied' ? 'blocked' : 'off';
      const reg = await navigator.serviceWorker.ready;
      const { key } = await (await fetch(`${api}/push/key`)).json();
      if (!key) throw new Error('Alerts aren’t ready yet');
      const raw = Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((key.length + 3) % 4)), (c) => c.charCodeAt(0));
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: raw }));
      await syncAlerts(sub); return 'on';
    },
    async disable() {
      const sub = await pushSub();
      if (sub) { post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
      return 'off';
    },
  };
  let syncT;   // the Watchlist changed: tell the Worker a moment later (once, however many changes)
  addEventListener('tn:saved', () => { clearTimeout(syncT); syncT = setTimeout(async () => { const sub = await pushSub(); if (sub) syncAlerts(sub).catch(() => {}); }, 1500); });

  // ---------- offline: the service worker keeps every Watchlist title's details and poster (sw.js) ----------
  // and, in the installed app on Chrome and Edge, fetches the hour's charts in the background so they're waiting
  const keepOffline = () => navigator.serviceWorker?.ready.then((reg) => reg.active?.postMessage({ type: 'keep', items: saved.all().map((x) => ({ k: x.k, poster: x.poster })) })).catch(() => {});
  let keepT; addEventListener('tn:saved', () => { clearTimeout(keepT); keepT = setTimeout(keepOffline, 2000); });
  if (standalone) navigator.serviceWorker?.ready.then(async (reg) => {
    if (!reg.periodicSync) return;
    const st = await navigator.permissions?.query({ name: 'periodic-background-sync' }).catch(() => null);
    if (st?.state === 'granted') await reg.periodicSync.register('tenner-charts', { minInterval: 3600e3 });
  }).catch(() => {});

  // ---------- the Home Screen icon's badge: how many shows on your Watchlist have a new episode out today ----------
  // Worked out once a day (and again when the Watchlist changes) from the hour's title details, and the search service
  // for saved shows the charts don't cover (40 at most). The installed app only; nothing shows in a browser tab.
  const BADGE = 'tenner-badge';
  async function badge(force) {
    if (!navigator.setAppBadge || !standalone) return;
    const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    let last = null; try { last = JSON.parse(localStorage.getItem(BADGE) || 'null'); } catch {}
    if (!force && last?.day === day) return;
    const shows = saved.all().filter((x) => x.type === 'tv' || x.k[0] === 't');
    const d = shows.length ? await fetch(`data/titles.json?v=${Math.floor(Date.now() / 600000)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : null;
    const items = { ...(d?.items || {}) };
    await Promise.all(shows.filter((x) => !items[x.k]).slice(0, 40).map((x) => fetch(`${api}/title/${x.k}`).then((r) => (r.ok ? r.json() : null)).then((a) => Object.assign(items, a?.items)).catch(() => {})));
    const n = shows.filter((x) => items[x.k]?.nx?.[0] === day).length;
    try { localStorage.setItem(BADGE, JSON.stringify({ day, n })); } catch {}
    (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
  }
  let badgeT; addEventListener('tn:saved', () => { clearTimeout(badgeT); badgeT = setTimeout(() => badge(true), 2500); });
  addEventListener('tn:check', () => badge());
  addEventListener('load', () => { setTimeout(() => { badge(); keepOffline(); }, 3000); });

  // ---------- iPhone and iPad: a one-time tip to put Tenner on the Home Screen (full screen, and alerts) ----------
  // On the third page you open in Safari, after the privacy note has been put away; Got it puts it away for good.
  const A2 = 'tenner-a2hs';
  if (isIOS && !standalone && noteSeen && !navigator.webdriver) {
    let n = 0; try { n = +localStorage.getItem(A2) || 0; } catch {}
    if (n >= 0) {
      try { localStorage.setItem(A2, String(n + 1)); } catch {}
      if (n + 1 >= 3) setTimeout(() => {
        document.body.insertAdjacentHTML('beforeend', `<aside class="pv-note a2-note" id="a2Note" aria-label="Add Tenner to your Home Screen">
          <img class="a2-ic" src="apple-touch-icon.png" alt="" width="42" height="42">
          <p><b>Add Tenner to your Home Screen.</b> Tap <svg class="a2-share" viewBox="0 0 24 24" aria-label="Share"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M6 11v8.5h12V11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> then <b>Add to Home Screen</b>. It opens full screen, and can send Watchlist alerts.</p>
          <button type="button" class="pv-ok" id="a2Ok">Got it</button></aside>`);
        const box = $('#a2Note');
        requestAnimationFrame(() => box.classList.add('in'));
        $('#a2Ok').addEventListener('click', () => { try { localStorage.setItem(A2, '-1'); } catch {} box.classList.remove('in'); setTimeout(() => box.remove(), reduce() ? 0 : 350); });
      }, 2500);
    }
  }

  // ---------- accounts (worker/src/auth.js): optional; sign in and this device keeps in step with your others ----------
  // The session is a random token kept here (no cookies). Whenever the Watchlist, progress, services, settings or Discover's swipes change,
  // and when you come back to the page, this device's copy goes to the account, which merges it with your other devices'
  // (newest change wins, item by item) and hands back the result.
  const SESS = 'tenner-session', ACC = 'tenner-account';
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} };
  // Remember me (the switch on the sign-in form; on unless you turn it off). Off, this device is signed out once Tenner
  // has been closed: every open Tenner tab marks itself (sessionStorage, which goes when the tab or browser closes) and
  // leaves a "still open" time behind (tenner-alive, every 30 seconds and as it closes). A page that opens with neither,
  // more than three minutes after the last Tenner tab went, signs out before anything else reads the sign-in. No cookies.
  const KEEP = 'tenner-keep', ALIVE = 'tenner-alive', HERE = 'tenner-here';
  const ssGet = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
  const ssSet = (k) => { try { sessionStorage.setItem(k, '1'); } catch {} };
  const brief = () => lsGet(KEEP) === '0' && !!lsGet(SESS);
  let aliveT = 0;
  const stayAlive = () => {
    if (!brief()) { clearInterval(aliveT); aliveT = 0; return; }
    ssSet(HERE); lsSet(ALIVE, String(Date.now()));
    aliveT ||= setInterval(() => (brief() ? lsSet(ALIVE, String(Date.now())) : stayAlive()), 30e3);
  };
  if (brief() && !ssGet(HERE) && !(Date.now() - (+lsGet(ALIVE) || 0) < 180e3)) {
    const t = lsGet(SESS);
    [SESS, ACC, KEEP, ALIVE].forEach((k) => lsSet(k, null));
    fetch(`${api}/auth/logout`, { method: 'POST', keepalive: true, headers: { authorization: `Bearer ${t}` } }).catch(() => {});
  }
  stayAlive();
  addEventListener('pagehide', () => { if (brief()) lsSet(ALIVE, String(Date.now())); });
  let applying = false, acctT = 0, syncing = null;
  const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64u = (str) => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)), (c) => c.charCodeAt(0));
  // Sign in with Google: the OAuth client ID from Google Cloud (public)
  const GOOGLE_ID = '573684167951-69isfjep31v7kl8hs0083228flhbq53e.apps.googleusercontent.com';
  let gReady = null;
  const account = {
    token: () => lsGet(SESS),
    user() { try { return JSON.parse(lsGet(ACC) || 'null'); } catch { return null; } },
    async call(method, path, body) {
      const t = account.token();
      const r = await fetch(`${api}${path}`, { method, headers: { 'content-type': 'application/json', ...(t ? { authorization: `Bearer ${t}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
        .catch(() => { throw new Error(navigator.onLine === false ? 'You’re offline. Try again when you’re back online' : 'Couldn’t reach Tenner. Check your connection and try again'); });   // not the browser's "Failed to fetch"
      const d = await r.json().catch(() => ({}));
      if (r.status === 401 && t) { account.forget(); }   // signed out elsewhere (or the account was deleted)
      if (!r.ok) throw Object.assign(new Error(d.error || 'Something went wrong'), { status: r.status, data: d });
      return d;
    },
    remember: lsGet(KEEP) !== '0',   // the sign-in form's Remember me switch (your last choice on this device)
    signedIn(token, user) {
      lsSet(SESS, token); lsSet(ACC, JSON.stringify(user)); lsSet(KEEP, account.remember ? null : '0'); stayAlive();
      dispatchEvent(new Event('tn:account')); return account.sync();
    },
    setUser(user) { lsSet(ACC, JSON.stringify(user)); dispatchEvent(new Event('tn:account')); },
    // signing in, shared by the account page and the account pill's dropdown. The password is stretched here first
    // (PBKDF2, 310,000 rounds, salted with the email), so what's sent is a key, never the password; the account server
    // salts and hashes that once more.
    async pwKey(email, pw) {
      const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw.normalize('NFKC')), 'PBKDF2', false, ['deriveBits']);
      return b64u(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(`tenner.stream:${email.trim().toLowerCase()}`), iterations: 310000 }, base, 256));
    },
    async passkeyIn() {
      const { id, options: o } = await account.call('POST', '/auth/login/start');
      const cred = await navigator.credentials.get({ publicKey: { challenge: unb64u(o.challenge), rpId: o.rpId, timeout: o.timeout, userVerification: o.userVerification, allowCredentials: [] } });
      const r = cred.response;
      const out = await account.call('POST', '/auth/login/finish', { id, credential: { id: cred.id, type: cred.type,
        response: { clientDataJSON: b64u(r.clientDataJSON), authenticatorData: b64u(r.authenticatorData), signature: b64u(r.signature), userHandle: r.userHandle ? b64u(r.userHandle) : null } } });
      await account.signedIn(out.token, out.user);
    },
    async passkeyNew(name) {   // a new account (name given), or another passkey for yours (signed in)
      const { id, options: o } = await account.call('POST', '/auth/passkey/start', name ? { name } : {});
      const cred = await navigator.credentials.create({ publicKey: { ...o, challenge: unb64u(o.challenge), user: { ...o.user, id: unb64u(o.user.id) },
        excludeCredentials: (o.excludeCredentials || []).map((c) => ({ ...c, id: unb64u(c.id) })) } });
      const out = await account.call('POST', '/auth/passkey/finish', { id, credential: { id: cred.id, type: cred.type,
        response: { clientDataJSON: b64u(cred.response.clientDataJSON), attestationObject: b64u(cred.response.attestationObject) } } });
      if (out.token) await account.signedIn(out.token, out.user);
    },
    // Google's own button (their script loads only when a sign-in form or the account page asks for it). Signing in with
    // it, or linking it to your account (signed in: onLinked); Google's button is drawn light or dark to match Tenner.
    google(into, { onError, onShown, onLinked } = {}) {
      gReady ||= new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; sc.onload = res; sc.onerror = rej; document.head.append(sc); });
      gReady.then(() => {
        if (!window.google?.accounts?.id || !into.isConnected) return;   // blocked by a content blocker, say, or the form has moved on
        window.google.accounts.id.initialize({ client_id: GOOGLE_ID, ux_mode: 'popup', callback: async ({ credential }) => {
          try { const out = await account.call('POST', '/auth/google', { credential }); if (out.token) await account.signedIn(out.token, out.user); else onLinked?.(); }
          catch (err) { onError?.(err); }
        } });
        const th = document.documentElement.dataset.theme, dark = th ? th === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
        into.innerHTML = ''; onShown?.();
        window.google.accounts.id.renderButton(into, { type: 'standard', theme: dark ? 'filled_black' : 'outline', size: 'large', shape: 'rectangular', text: 'continue_with', width: Math.min(360, into.clientWidth || into.parentElement.clientWidth || 300) });
      }).catch(() => {});
    },
    friendly: (e) => e?.name === 'NotAllowedError' ? 'Cancelled' : e?.name === 'InvalidStateError' ? 'This device already has a passkey for your account' : e?.message || 'Something went wrong',
    forget() { lsSet(SESS, null); lsSet(ACC, null); lsSet(ALIVE, null); stayAlive(); dispatchEvent(new Event('tn:account')); },
    async signOut(clear) {
      try { await account.call('POST', '/auth/logout'); } catch {}
      account.forget();
      if (clear) { ['tenner-watchlist', 'tenner-progress', 'tenner-services', 'tenner-stars', SW, SYNC, ...Object.values(MARKS)].forEach((k) => lsSet(k, null)); dispatchEvent(new Event('tn:saved')); dispatchEvent(new Event('tn:mine')); }
    },
    local() {
      const m = meta.get();
      return { watchlist: saved.all(), removed: m.removed, progress: progress.all(), pat: m.pat, stars: stars.map(), swipes: swipes.map(), services: mine.get(), sat: m.sat, settings: prefs.get(), pfat: m.pfat, seen: seen.map(), hidden: hidden.map(), notes: notes.map(), tips: tips.all() };
    },
    // send this device's copy; take back the merged one
    sync() {
      if (!account.token()) return Promise.resolve(null);
      if (syncing) return syncing;
      const was = account.token();
      syncing = account.call('PUT', '/me/data', { data: account.local() }).then(({ data, user }) => {
        if (account.token() !== was) return null;   // signed out (or in as someone else) while it was on its way: that wins
        if (user && JSON.stringify(user) !== JSON.stringify(account.user())) account.setUser(user);   // a new name or photo from another device
        applyData(data); return data; })
        .catch(() => null).finally(() => { syncing = null; });
      return syncing;
    },
  };
  function applyData(d) {
    if (!d) return;
    const before = JSON.stringify(account.local());
    applying = true;
    lsSet(WL, JSON.stringify(d.watchlist || []));
    lsSet(PR, JSON.stringify(d.progress || {}));
    lsSet(ST, JSON.stringify(d.stars || {}));
    if (d.swipes) lsSet(SW, JSON.stringify(d.swipes));
    for (const [f, key] of Object.entries(MARKS)) if (d[f]) lsSet(key, JSON.stringify(d[f]));
    lsSet(MS, d.services?.length ? JSON.stringify(d.services) : null);
    if (d.settings && Object.keys(d.settings).length) lsSet(PREFS, JSON.stringify({ ...DEF, ...d.settings }));
    if (d.tips && typeof d.tips === 'object') lsSet(TIPS, JSON.stringify(d.tips));
    lsSet(SYNC, JSON.stringify({ removed: d.removed || {}, pat: d.pat || {}, sat: d.sat || 0, pfat: d.pfat || 0 }));
    if (JSON.stringify(account.local()) !== before) { apply(); dispatchEvent(new Event('tn:saved')); dispatchEvent(new Event('tn:mine')); dispatchEvent(new Event('tn:prefs')); dispatchEvent(new Event('tn:swiped')); dispatchEvent(new Event('tn:marks')); }
    applying = false;
    dispatchEvent(new Event('tn:synced'));
  }
  const soon = () => { if (applying || !account.token()) return; clearTimeout(acctT); acctT = setTimeout(account.sync, 1200); };
  ['tn:saved', 'tn:mine', 'tn:prefs', 'tn:swiped', 'tn:marks', 'tn:tips'].forEach((e) => addEventListener(e, soon));
  addEventListener('tn:check', () => account.sync());
  if (account.token()) setTimeout(account.sync, 600);

  // the account in the sidebar (and the phone's menu): your picture and name, or Sign in
  const avatar = (u, cls = '') => u?.picture ? `<img class="av ${cls}" src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer">`
    : `<span class="av ${cls}" style="--h:${u ? u.hue : 210}" aria-hidden="true">${u ? esc((u.name || '?').trim()[0]?.toUpperCase() || '?') : '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="4" fill="currentColor"/><path d="M4.5 20c1-4 4-6 7.5-6s6.5 2 7.5 6z" fill="currentColor"/></svg>'}</span>`;
  const links = $('.side-links');
  if (links) {
    links.insertAdjacentHTML('afterbegin', '<a class="side-acct" id="sideAcct" href="account.html"></a>');
    const draw = () => { const u = account.user(); $('#sideAcct').innerHTML = `${avatar(u)}<span><b>${u ? esc(u.name || 'You') : 'Sign in'}</b><small>${u ? 'Your account' : 'or sign up, free'}</small></span>`; if (onPage('account')) $('#sideAcct').setAttribute('aria-current', 'page');
      // phones: your picture (or initial) on the round button top right, as in the App Store; the outline figure until you sign in
      const mb = $('#menuBtn'); if (mb) { mb.dataset.icon ||= mb.innerHTML; mb.classList.toggle('has-av', !!u); mb.innerHTML = u ? avatar(u, 'mb-av') : mb.dataset.icon; } };
    draw(); addEventListener('tn:account', draw);
  }
  // signed in (computers and tablets): your picture and name top right of every page (on the homepage, above the dropdowns)
  // in one rounded pill, with a round Sign out inside it; the sidebar's own account entry then steps aside.
  // Signing out asks once, iOS-style; what's on this device stays.
  let tnSignIn = () => false;
  const hd = $('.bx-hd .bx-dds') ? $('.bx-hd') : null, mainEl = $('main');
  if (hd || mainEl) {
    const OUT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10.5 12h10M17 8.3l3.7 3.7-3.7 3.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const over = $('.ab-hero');
    // its own row above the page; on About, over the top of the full-width artwork instead (never pushing it off the edge), just
    // before it rather than inside it, so it stays above the Christmas lights (the artwork is a layer of its own)
    // On the homepage a slot in its header keeps the place above the dropdowns, and the pill floats over that slot from
    // outside the page's own layer, so the Christmas lights hang behind it there too
    if (hd) hd.insertAdjacentHTML('beforeend', '<div class="bx-me-slot" id="meSlot" aria-hidden="true"></div>');
    (over || mainEl).insertAdjacentHTML('beforebegin', `<div class="me-row${over ? ' me-over' : hd ? ' me-abs' : ''}" id="meRow"></div>`);
    $('#meRow').insertAdjacentHTML('beforeend', `<div class="bx-me" id="bxMe" hidden><button type="button" class="bx-me-card" id="bxMeCard" aria-haspopup="true" aria-expanded="false" aria-controls="meMenu"></button><button type="button" class="bx-me-out bx-me-th" id="bxMeTh" aria-label="Switch to Day" title="Switch to Day"></button><button type="button" class="bx-me-out" id="bxMeOut" aria-label="Sign out" title="Sign out">${OUT}</button></div>`);
    // the dropdown lives at the end of the page rather than inside the pill, so its own frost blurs the page (glass inside
    // glass would only blur the pill); it's placed under the pill each time it opens
    document.body.insertAdjacentHTML('beforeend', '<div class="me-menu" id="meMenu" role="dialog" aria-label="Your account" hidden><div class="me-body" id="meBody"></div></div>');
    // ---------- tap the pill: a dropdown with your account at a glance (status, numbers, links). It grows out of the pill
    // like a drop of liquid (springy scale and a softening blur, the rows following one after another), only with motion on.
    let syncedAt = 0;
    addEventListener('tn:synced', () => { syncedAt = Date.now(); if (!$('#meMenu').hidden) fillMenu(); });
    const ago = (t) => { const m = Math.round((Date.now() - t) / 6e4); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} hr ago`; };
    const ME_I = {
      acct: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M4.8 19.5c1.2-3.6 4-5.3 7.2-5.3s6 1.7 7.2 5.3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
      list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h11v17L12 16.6 6.5 20.5z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>',
      set: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-2.6-1.5L14.2 2.6h-4l-.4 2.5A7.6 7.6 0 0 0 7.2 6.6l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.3 1 2-3.4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
      tv: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="12.5" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M8.5 20.5h7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
      share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14.5V3.5M8 7.2l4-3.7 4 3.7M7.5 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      chev: '<svg class="me-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    };
    // signed out: the dropdown signs you in (Google, email and password, or a passkey) or makes you an account, right
    // here; it's the only way in. On phones (no pill) and on the account page the same form sits in the page instead.
    const KEY = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 12h9M18 12v3.5M21 12v2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    const IN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 4.5H17a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-6.5M3.5 12h10M10 8.3l3.7 3.7-3.7 3.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
    const MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="m4 7.5 8 5.5 8-5.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    let guest = { mode: 'in' };   // in, up, check (confirm your email), reset (from the email's link)
    function guestForm(root, o = guest) {
      const m = o.mode, up = m === 'up', q = (c) => root.querySelector(c);
      const heads = { in: ['Sign in to Tenner', 'Your Watchlist and settings on every device'], up: ['Sign up for Tenner', 'Free, and it keeps every device in step'],
        check: ['Check your inbox', 'One tap on the link and you’re in'], reset: ['Choose a new password', 'Then you’re straight back in'] };
      const field = (c, type, ac, ph, extra = '') => `<input class="me-in ${c}" type="${type}" autocomplete="${ac}" placeholder="${ph}" aria-label="${ph.replace(/ \(.*/, '')}" ${extra}>`;
      const body = m === 'check'
        ? `<p class="me-note">${esc(o.fresh ? `We’ve sent a link to ${o.email}. Tap it to confirm your email and finish making your account.` : `${o.email} isn’t confirmed yet. Tap the link we emailed you, or have it sent again.`)}</p>
           <div class="me-form"><button type="button" class="btn btn-tinted me-go-btn me-resend">${MAIL}Send it again</button></div>`
        : m === 'reset'
        ? `<form class="me-form" novalidate>${field('me-e', 'email', 'username', 'Email', `value="${esc(o.email || '')}" readonly`)}${field('me-p', 'password', 'new-password', 'New password (8 or more characters)')}
           <button class="btn btn-tinted me-go-btn">${TICK}Save and sign in</button></form>`
        : `${GOOGLE_ID ? '<div class="me-google" hidden></div><p class="me-or" hidden><span>or</span></p>' : ''}
           <form class="me-form" novalidate>${up ? field('me-nm', 'text', 'given-name', 'Your name', 'maxlength="40"') : ''}${field('me-e', 'email', up ? 'email' : 'username', 'Email')}${field('me-p', 'password', up ? 'new-password' : 'current-password', up ? 'Password (8 or more characters)' : 'Password')}
           <div class="me-opts"><label class="me-keep"><input type="checkbox" switch role="switch" class="me-rem"${account.remember ? ' checked' : ''}><i class="sw" aria-hidden="true"></i>Remember me</label>${m === 'in' ? '<button type="button" class="me-link me-forgot">Forgot password?</button>' : ''}</div><button class="btn btn-tinted me-go-btn">${up ? PLUS : IN}${up ? 'Sign up' : 'Sign in'}</button>
           ${window.PublicKeyCredential ? `<button type="button" class="btn btn-tinted me-pk">${KEY}${up ? 'Use a passkey instead' : 'Sign in with a passkey'}</button>` : ''}</form>`;
      const foot = m === 'up' ? 'Already have an account? <button type="button" class="me-link me-swap">Sign in</button>'
        : m === 'in' ? 'New to Tenner? <button type="button" class="me-link me-swap">Sign up</button>'
        : '<button type="button" class="me-link me-swap">Back to sign in</button>';
      root.innerHTML = `<div class="me-hd me-hd-g" style="--i:0">${m === 'check' ? `<span class="av me-av me-mail" aria-hidden="true">${MAIL}</span>` : avatar(null, 'me-av')}<span><b>${heads[m][0]}</b><small>${o.lede ? esc(o.lede) : heads[m][1]}</small></span></div>
        <div class="me-ways" style="--i:1">${body}</div><p class="me-msg" role="status" aria-live="polite"></p><p class="me-alt" style="--i:2">${foot}</p>${root.id === 'meBody' ? `<nav class="me-links me-links-g" aria-label="Tenner">${mineRow(3)}${shareRow(3)}</nav>` : ''}`;
      const say = (t, bad) => { const n = q('.me-msg'); n.textContent = t; n.classList.toggle('bad', !!bad); };
      if (o.note) say(o.note, o.bad);
      const go = (mode, more = {}) => { Object.assign(o, { note: '', bad: false }, more, { mode }); guestForm(root, o); q('.me-in:not([readonly])')?.focus(); };
      const inbox = (email, fresh) => go('check', { email, fresh });
      q('.me-swap').addEventListener('click', () => go(m === 'in' ? 'up' : 'in'));
      q('.me-forgot')?.addEventListener('click', async () => {
        const email = q('.me-e').value.trim();
        if (!email) { q('.me-e').focus(); return say('Enter your email above, then tap Forgot password again'); }
        try { await account.call('POST', '/auth/password/forgot', { email }); say(`If there’s a Tenner account for ${email}, we’ve emailed it a link to choose a new password. Check your inbox (and junk).`); }
        catch (err) { say(account.friendly(err), true); }
      });
      q('.me-resend')?.addEventListener('click', async (e) => {
        try { await account.call('POST', '/auth/password/resend', { email: o.email }); say('Sent. It can take a minute to arrive'); e.currentTarget.disabled = true; }
        catch (err) { say(account.friendly(err), true); }
      });
      const rem = q('.me-rem');
      if (rem) {
        q('.me-form').classList.toggle('native-sw', 'switch' in HTMLInputElement.prototype);   // Safari: the real iOS switch
        rem.addEventListener('change', () => { account.remember = rem.checked; haptic(8); });
        window.tn?.tip?.({ id: 'remember-me', for: rem.closest('.me-keep'), title: 'Remember me', text: 'On, you stay signed in on this device. Turn it off on a shared computer and you’re signed out once you close Tenner. Your browser can save your password for you.' });
      }
      const g = q('.me-google');
      if (g) account.google(g, { onError: (err) => say(account.friendly(err), true), onShown: () => { g.hidden = false; q('.me-or').hidden = false; } });
      q('.me-pk')?.addEventListener('click', async (e) => {
        const b = e.currentTarget; b.disabled = true;
        try { if (up) { const name = q('.me-nm').value.trim(); if (!name) { q('.me-nm').focus(); throw new Error('Enter your name first'); } await account.passkeyNew(name); } else await account.passkeyIn(); }
        catch (err) { say(err.status === 404 ? 'That passkey isn’t linked to an account. Create one instead' : account.friendly(err), err.name !== 'NotAllowedError'); }
        b.disabled = false;
      });
      q('form')?.addEventListener('submit', async (e) => {
        e.preventDefault(); const b = q('.me-go-btn'), email = q('.me-e').value.trim(), pw = q('.me-p').value;
        if (up && !q('.me-nm').value.trim()) return q('.me-nm').focus();
        if (!email) return q('.me-e').focus();
        if (m !== 'in' && pw.length < 8) { q('.me-p').focus(); return say('Use 8 or more characters for your password', true); }
        if (!pw) return q('.me-p').focus();
        b.disabled = true; say(up ? 'Making your account…' : m === 'reset' ? 'Saving…' : 'Signing you in…');
        try {
          const key = await account.pwKey(email, pw);
          const out = up ? await account.call('POST', '/auth/password/signup', { email, name: q('.me-nm').value.trim(), key })
            : m === 'reset' ? await account.call('POST', '/auth/password/reset', { token: o.token, key })
            : await account.call('POST', '/auth/password/login', { email, key });
          if (out.verify) return inbox(out.verify, true);
          guest = { mode: 'in' }; await account.signedIn(out.token, out.user); haptic(10);
        } catch (err) {
          if (err.data?.unverified) return inbox(err.data.unverified, false);
          say(account.friendly(err), true); b.disabled = false;
        }
      });
    }
    // My services, from the pill: the sheet's own button (a row like the links), signed in or not
    // Share Tenner: the phone's own share sheet, or Tenner's share card on computers
    const shareRow = (i) => `<button type="button" class="me-row-l" data-me-share style="--i:${i}"><i>${ME_I.share}</i><span><b>Share Tenner</b><small>Tell a friend what’s worth watching</small></span>${ME_I.chev}</button>`;
    const mineRow = (i) => `<button type="button" class="me-row-l" data-me-mine style="--i:${i}"><i>${ME_I.tv}</i><span><b>My services</b><small>See what’s waiting for you</small></span>${ME_I.chev}</button>`;
    function fillMenu() {
      const u = account.user(); if (!u) return guestForm($('#meBody'));
      const off = navigator.onLine === false;
      const status = off ? ['off', 'Offline', 'Changes sync when you’re back online'] : ['on', 'Synced', syncedAt ? `Updated ${ago(syncedAt)}` : 'On all your devices'];
      const since = u.created ? new Date(u.created).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '';
      const n = (v, l, i) => `<div class="me-n" style="--i:${i}"><b>${v.toLocaleString('en-GB')}</b><small>${l}</small></div>`;
      const wl = saved.all().length, watched = seen.list().length, going = Object.keys(progress.all()).length, loved = stars.all().length, svc = mine.get().length || 6;
      const row = (href, ic, t, sub, i) => `<a class="me-row-l" href="${href}" style="--i:${i}"><i>${ic}</i><span><b>${t}</b><small>${sub}</small></span>${ME_I.chev}</a>`;
      $('#meBody').innerHTML = `<div class="me-hd" style="--i:0">${avatar(u, 'me-av')}<span><b>${esc(u.name || 'You')}</b><small>${esc(u.email || (since ? `With Tenner since ${since}` : 'Your Tenner account'))}</small></span></div>
        <p class="me-st me-st-${status[0]}" style="--i:1"><i aria-hidden="true"></i><b>${status[1]}</b><span>${esc(status[2])}</span></p>
        <div class="me-nums">${n(wl, 'On your Watchlist', 2)}${n(watched, watched === 1 ? 'Title watched' : 'Titles watched', 2)}${n(going, 'Watching now', 3)}${n(loved, 'Loved', 3)}</div>
        <nav class="me-links" aria-label="Your account">${row('account.html', ME_I.acct, 'Your account', 'Profile, sign-in and devices', 4)}${row('charts.html#watchlist', ME_I.list, 'Your Watchlist', `${wl} saved`, 5)}${mineRow(5)}${row('settings.html', ME_I.set, 'Settings', since ? `With Tenner since ${since}` : 'Make Tenner yours', 6)}${shareRow(6)}</nav>
        <div class="me-share" style="--i:7"><label class="me-share-row"><span><b>Share your Watchlist</b><small>${u.share_id ? '<b class="set-state">On.</b> Anyone with the link can see it' : '<b class="set-state">Off.</b> Only you can see it'}</small></span>
          <input type="checkbox" switch role="switch" id="meShare"${u.share_id ? ' checked' : ''} aria-label="Share your Watchlist with a public link"><i class="sw" aria-hidden="true"></i></label>
          ${u.share_id ? `<div class="me-share-link"><span>${esc(`${location.origin}/list.html?u=${u.share_id}`)}</span><button type="button" class="me-copy" id="meCopy">Copy</button></div>` : ''}</div>`;
    }
    const menu = () => $('#meMenu'), card = () => $('#bxMeCard');
    function openMenu(tapped) {   // tapped: you opened it (a buzz); the account page opening it for you stays quiet
      fillMenu(); const m = menu(), r = $('#bxMe').getBoundingClientRect();
      m.style.top = `${r.bottom + scrollY + 10}px`; m.style.right = `${Math.max(16, document.documentElement.clientWidth - r.right)}px`;
      m.hidden = false; card().setAttribute('aria-expanded', 'true'); if (tapped) haptic(6);
      requestAnimationFrame(() => requestAnimationFrame(() => m.classList.add('in')));
      if (account.user()) account.sync();   // freshen the numbers while it's open
      else setTimeout(() => $('#meMenu .me-in:not([readonly])')?.focus({ preventScroll: true }), 120);
    }
    function closeMenu(focus) {
      const m = menu(); if (m.hidden) return;
      m.classList.remove('in'); card().setAttribute('aria-expanded', 'false');
      const end = () => { if (!m.classList.contains('in')) m.hidden = true; };
      if (document.documentElement.classList.contains('still')) end(); else setTimeout(end, 260);
      if (focus) card().focus();
    }
    $('#bxMeCard').addEventListener('click', () => (menu().hidden ? openMenu(true) : closeMenu()));
    menu().addEventListener('click', (e) => {
      if (e.target.closest('[data-me-mine]')) { closeMenu(); openMine(); return; }
      if (!e.target.closest('[data-me-share]')) return;
      closeMenu(); haptic();
      const o = { heading: 'Share Tenner with friends and family', title: 'Tenner', text: 'Tenner shows what’s popular on UK streaming, all in one place.', url: 'https://tenner.stream/' };
      if (navigator.share && isIOS) navigator.share({ title: o.title, text: o.text, url: o.url }).catch(() => {}); else share(o);
    });
    // Share your Watchlist: a public link anyone can open, off unless you turn it on; Copy (the share sheet on iPhone)
    menu().addEventListener('change', async (e) => {
      if (e.target.id !== 'meShare') return;
      const on = e.target.checked; haptic(6);
      try { const { share_id } = await account.call('POST', '/me/share', { on }); account.setUser({ ...account.user(), share_id }); fillMenu(); }
      catch { e.target.checked = !on; }
    });
    menu().addEventListener('click', async (e) => {
      const b = e.target.closest('#meCopy'); if (!b) return;
      const link = b.previousElementSibling.textContent, u = account.user();
      if (navigator.share && isIOS) { navigator.share({ title: `${u?.name || 'My'}’s Watchlist`, url: link }).catch(() => {}); return; }
      try { await navigator.clipboard.writeText(link); b.textContent = 'Copied'; haptic(8); setTimeout(() => (b.textContent = 'Copy'), 1500); } catch {}
    });
    // the account page (signed out) opens the dropdown where there's a pill, or draws the same form into the page
    tnSignIn = (o, inline) => {
      guest = { mode: 'in', ...o };
      if (!account.user() && matchMedia('(min-width: 720px)').matches && !$('#bxMe').hidden) { openMenu(); return true; }
      if (inline) guestForm(inline, guest);
      return false;
    };
    document.addEventListener('click', (e) => { if (e.target.isConnected && !e.target.closest('#bxMe, #meMenu')) closeMenu(); });
    let lastW = innerWidth; addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; closeMenu(); } });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu().hidden) closeMenu(true); });
    addEventListener('online', () => { if (!menu().hidden) fillMenu(); }); addEventListener('offline', () => { if (!menu().hidden) fillMenu(); });
    let dlg = null;
    const ask = () => {
      if (!dlg) {
        document.body.insertAdjacentHTML('beforeend', `<dialog class="mine-dlg out-dlg" id="outDlg" aria-labelledby="outH" aria-describedby="outP" closedby="any"><form method="dialog">
          <span class="out-ic" aria-hidden="true"><i></i><i></i><i></i><i></i></span><h2 id="outH">Sign out of Tenner?</h2>
          <p id="outP">Your Watchlist and settings stay on this device. Sign in again any time to sync them.</p>
          <div class="out-acts"><button class="btn btn-tinted" value="out"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h6.5M10.5 12h10M17 8.3l3.7 3.7-3.7 3.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Sign out</button><button class="btn btn-tinted out-stay" value="stay" autofocus><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>Cancel</button></div>
        </form></dialog>`);
        dlg = $('#outDlg');
        dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close('stay'); });   // tap outside to close
        dlg.addEventListener('close', async () => {
          if (dlg.returnValue !== 'out') return;
          haptic(); await account.signOut(false);
          const t = $('#toast'); if (t) { t.textContent = 'Signed out'; t.hidden = false; clearTimeout(t.t); t.t = setTimeout(() => (t.hidden = true), 2600); }
        });
      }
      dlg.returnValue = ''; dlg.showModal();
    };
    $('#bxMeOut').addEventListener('click', () => { closeMenu(); ask(); });
    const drawMe = () => {
      const u = account.user(), box = $('#bxMe');
      box.hidden = false; box.classList.toggle('me-guest', !u); hd?.classList.add('me-on'); placeMe(); document.documentElement.classList.toggle('signed-in', !!u);   // (not 'me-in': that's the sign-in fields' class, which then styled the whole page)
      const c = $('#bxMeCard'), wide = matchMedia('(min-width: 720px)').matches;
      const DN = '<svg class="me-dn" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      if (!menu().hidden) fillMenu();   // signing in (or out) inside the dropdown: it turns into the other view where it is
      if (!u) {   // signed out: the same pill, inviting you to make an account or sign in, right in its dropdown
        c.innerHTML = `${avatar(null)}<span><b>Sign up for Tenner</b><small>or sign in to your account</small></span>${DN}`;
        if (wide) setTimeout(() => featureTip({ id: 'account-signup-pill', for: '#bxMeCard', title: 'Your own Tenner account',
          text: 'Tap here to sign in or sign up for free, without leaving the page. It keeps your Watchlist, progress and settings in step on every device.' }));
        return;
      }
      c.innerHTML = `${avatar(u)}<span><b>${esc(u.name || 'You')}</b><small>Your account</small></span>${DN}`;
      if (wide) setTimeout(() => featureTip({ id: 'account-dropdown', for: '#bxMeCard', title: 'Your account at a glance',
        text: 'Tap your name to see your sync status and your Tenner in numbers, with quick links to your account, Watchlist and settings.' }));
    };
    function placeMe() {
      const sl = $('#meSlot'); if (!sl) return;
      const r = sl.getBoundingClientRect(), row = $('#meRow');
      row.style.top = `${r.top + scrollY}px`; row.style.right = `${document.documentElement.clientWidth - r.right}px`;
    }
    addEventListener('resize', placeMe); new ResizeObserver(placeMe).observe(hd || document.body);
    drawMe(); addEventListener('tn:account', drawMe);
  }
  // the colour you picked for your account becomes Tenner's accent everywhere: links, highlights, the menu's icons, focus
  // rings, glows and the wash behind the page (tnMe, in each page's head, so it's there before the first paint).
  // Only the six colours on the account page count (the first blue is Tenner's own): a new account's random shade, or an old
  // one's, could be a muddy olive or brown, so those keep Tenner's blue until you pick one.
  const meHue = () => window.tnMe?.(account.user());
  meHue(); addEventListener('tn:account', meHue);

  // ---------- variety in the big featured artwork (the homepage's hero, Browse's spotlight) ----------
  // Remembers when each title last had the spotlight on this device, so the next visit leads with ones you haven't
  // seen lately instead of the same No. 1 every time. Titles with artwork come first; the rest are shuffled.
  const FT = 'tenner-featured';
  const featured = {
    all() { try { const o = JSON.parse(localStorage.getItem(FT) || '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; } },
    // n of the pool (each title once), the ones featured longest ago (or never) first
    pick(pool, key, n, art = () => true) {
      const seen = featured.all(), have = new Set();
      return pool.filter((x) => { const k = key(x); return k && !have.has(k) && have.add(k); })
        .map((x) => [x, !art(x), seen[key(x)] || 0, Math.random()])
        .sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[3] - b[3]).slice(0, n).map((a) => a[0]);
    },
    saw(k) {
      if (!k) return; const o = featured.all(); o[k] = Date.now();
      const ks = Object.keys(o); if (ks.length > 400) ks.sort((a, b) => o[a] - o[b]).slice(0, ks.length - 400).forEach((x) => delete o[x]);
      try { localStorage.setItem(FT, JSON.stringify(o)); } catch {}
    },
  };

  // ---------- one-time feature tips (the owner's rule: every new feature introduces itself, once) ----------
  // From the feature's own code, once it's on the page:  tn.tip({ id: 'live-list', for: '#liveBtn', title: '…', text: '…' })
  // A small frosted box points at the feature and says what it is and how it works. It's shown once and never again, here
  // or on your other devices if you're signed in (tenner-tips, synced with your account). One at a time, only while the
  // feature is on screen, never over the privacy note; Got it, Esc, or a tap anywhere else puts it away.
  const tipQ = []; let tipOn = null, tipIO = null, tipReady = noteSeen || !!navigator.webdriver;
  const tipEl = (o) => (typeof o.for === 'string' ? document.querySelector(o.for) : o.for);
  const tipShows = (el) => {
    if (!el?.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
    let m = null; try { m = document.querySelector('dialog:modal'); } catch {}
    return !(m && !m.contains(el)) && !el.closest('[inert]');
  };
  function featureTip(o) {
    if (!o?.id || !o.for || tips.seen(o.id) || tipOn?.id === o.id || tipQ.some((x) => x.id === o.id)) return;
    if (navigator.webdriver && !window.tnTipsTest) return;   // keeps automated checks of the pages clean
    tipQ.push(o); setTimeout(nextTip, o.delay ?? 1200);
  }
  function nextTip() {
    if (tipOn || !tipReady) return;
    for (let i = tipQ.length - 1; i >= 0; i--) if (tips.seen(tipQ[i].id)) tipQ.splice(i, 1);
    const o = tipQ.find((x) => tipShows(tipEl(x)));
    if (o) return showFeatureTip(o, tipEl(o));
    // nothing on screen yet: look again when one of them scrolls (or opens) into view
    tipIO?.disconnect();
    tipIO = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { tipIO.disconnect(); setTimeout(nextTip, 500); } });
    tipQ.forEach((x) => { const el = tipEl(x); if (el) tipIO.observe(el); });
  }
  function showFeatureTip(o, el) {
    tipQ.splice(tipQ.indexOf(o), 1); tips.mark(o.id); tipOn = o;
    const b = document.createElement('aside');
    b.className = 'ft'; b.setAttribute('aria-label', 'New feature'); b.setAttribute('aria-live', 'polite');
    b.innerHTML = `<span class="ft-arw" aria-hidden="true"></span>
      <p class="ft-new"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c.5 4.6 2.9 7 7.5 7.5-4.6.5-7 2.9-7.5 7.5-.5-4.6-2.9-7-7.5-7.5 4.6-.5 7-2.9 7.5-7.5zM19 15.5c.2 1.9 1.1 2.8 3 3-1.9.2-2.8 1.1-3 3-.2-1.9-1.1-2.8-3-3 1.9-.2 2.8-1.1 3-3z" fill="currentColor"/></svg>New</p>
      <h2 class="ft-t">${esc(o.title)}</h2><p class="ft-x">${esc(o.text)}</p>
      <button type="button" class="ft-ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Got it</button>`;
    // inside the feature's own sheet, if it's in one, so it sits above it and can be tapped; in the top layer where Safari
    // has popovers, so nothing on the page can cover it
    (el.closest('dialog') || document.body).append(b);
    if (b.showPopover) { b.popover = 'manual'; b.showPopover(); }
    const place = () => {
      if (!tipShows(el)) return close();
      const r = el.getBoundingClientRect(), w = b.offsetWidth, h = b.offsetHeight, g = 12, gap = 12;
      const below = r.bottom + gap + h <= innerHeight - g || r.top - gap - h < g;
      const cx = r.left + r.width / 2, left = Math.max(g, Math.min(innerWidth - w - g, cx - w / 2));
      b.style.left = `${left}px`; b.style.top = `${below ? r.bottom + gap : r.top - gap - h}px`;
      b.classList.toggle('up', !below); b.style.setProperty('--ax', `${Math.max(20, Math.min(w - 20, cx - left))}px`);
    };
    let raf = 0; const soonPlace = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; place(); }); };
    const outside = (e) => { if (!b.contains(e.target)) close(); };
    const key = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
    const watch = setInterval(place, 400);   // the feature moved, closed or went away
    function close() {
      if (tipOn !== o) return; tipOn = null; clearInterval(watch);
      removeEventListener('scroll', soonPlace, true); removeEventListener('resize', soonPlace);
      removeEventListener('pointerdown', outside, true); removeEventListener('keydown', key, true);
      b.classList.remove('in');
      setTimeout(() => { b.remove(); setTimeout(nextTip, 700); }, reduce() ? 0 : 260);
    }
    place();
    addEventListener('scroll', soonPlace, { capture: true, passive: true }); addEventListener('resize', soonPlace);
    addEventListener('pointerdown', outside, true); addEventListener('keydown', key, true);
    b.querySelector('.ft-ok').addEventListener('click', close);
    requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('in')));
  }

  // ---------- loading (computers): Tenner's ring of ten, in the middle of the page, only while something is on its way ----------
  // Ten little bars in Tenner's colours, a light running round them like Apple's activity indicator, in a frosted square.
  // It waits a moment before it shows (so a quick page or chart never flashes it), stays long enough not to flicker, and
  // only appears on computers. Leaving for another page shows it if that page is slow to arrive; a page's own data load
  // shows it with tn.loading.wrap(promise). With Animations off it doesn't turn or spring, the light just runs round.
  const ldQ = matchMedia('(min-width: 1000px) and (hover: hover) and (pointer: fine)');
  const ldOn = new Set(); let ldEl = null, ldT = 0, ldAt = 0, ldOut = 0;
  const LD_C = ['#ff375f', '#ff5e3a', '#ff9f0a', '#ffd60a', '#30d158', '#64d2ff', '#0a84ff', '#5e5ce6', '#bf5af2', '#ff2d92'];
  function ldMake() {
    if (ldEl) return ldEl;
    ldEl = document.createElement('div'); ldEl.className = 'ld'; ldEl.hidden = true;
    ldEl.setAttribute('role', 'status'); ldEl.setAttribute('aria-live', 'polite');
    ldEl.innerHTML = `<div class="ld-box"><span class="ld-glow" aria-hidden="true"></span><svg class="ld-ring" viewBox="-32 -32 64 64" aria-hidden="true">${LD_C.map((c, i) =>
      `<rect class="ld-bar" x="-2.6" y="-27" width="5.2" height="13" rx="2.6" fill="${c}" transform="rotate(${i * 36})" style="--i:${i}"/>`).join('')}</svg><span class="sh-vh">Loading</span></div>`;
    document.body.append(ldEl); return ldEl;
  }
  function ldSync() {
    const want = ldOn.size > 0 && ldQ.matches && !document.querySelector('dialog[open]');
    clearTimeout(ldT);
    if (want) {
      if (ldEl && !ldEl.hidden && !ldEl.classList.contains('out')) return;
      ldT = setTimeout(() => {
        const el = ldMake(); clearTimeout(ldOut); el.classList.remove('out', 'in'); el.hidden = false; ldAt = Date.now();
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
      }, ldOn.has('nav') ? 160 : 380);
    } else if (ldEl && !ldEl.hidden) {
      const go = () => { ldEl.classList.remove('in'); ldEl.classList.add('out'); ldOut = setTimeout(() => { ldEl.hidden = true; ldEl.classList.remove('out'); }, root.classList.contains('still') ? 0 : 320); };
      const wait = Math.max(0, 450 - (Date.now() - ldAt));   // once it's up, long enough to see, never a flicker
      ldT = setTimeout(go, wait);
    }
  }
  const loading = {
    show(k = 'page') { ldOn.add(k); ldSync(); },
    hide(k = 'page') { ldOn.delete(k); ldSync(); },
    wrap(p, k = 'page') { loading.show(k); Promise.resolve(p).finally(() => loading.hide(k)).catch(() => {}); return p; },   // the page handles its own failure
  };
  // leaving for another of Tenner's pages: the ring, should it take a moment (pages that open a sheet instead say so first)
  addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || /^\/t\//.test(u.pathname) || (u.pathname === location.pathname && u.search === location.search)) return;   // another site, or this page (a #section)
    loading.show('nav');
  });
  addEventListener('pagehide', () => { ldOn.clear(); clearTimeout(ldT); if (ldEl) ldEl.hidden = true; });
  addEventListener('pageshow', (e) => { if (e.persisted) { ldOn.clear(); ldSync(); } });   // Back to a page kept in memory
  ldQ.addEventListener('change', ldSync);

  // how far a title climbed: a green badge (a round arrow, the places, and "up" beneath), as on Apple's Stocks
  const climb = (n) => `<span class="climb"><span class="sh-vh">, up ${+n || 0} ${+n === 1 ? 'place' : 'places'}</span><span class="climb-ic" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M8 12.6V4M4.4 7.4 8 3.8l3.6 3.6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="climb-n" aria-hidden="true"><b>${+n || 0}</b><small>${+n === 1 ? 'place' : 'places'}</small></span></span>`;
  const haptic = (ms = 8) => { try { navigator.vibrate?.(ms); } catch {} };   // a small buzz, where the device has one
  // ---------- Tenner's own cut: the featured spots in motion, without YouTube ----------
  // In place of a trailer (YouTube's ads, its player and the words written over the footage), the title's own wordless
  // stills from TMDB, one after another: each drifts slowly (a push in or a pull out, panning a different way each time)
  // and dissolves into the next, like the opening of a film. Pictures only, moved by the browser off the main thread (the
  // Web Animations API, which Tenner's Animations-off switch for CSS leaves alone).
  // Like the trailer it stands in for (and the Christmas snow), it's the slide's point, so it plays with Animations off;
  // never with Reduce Motion or Settings → Start trailers by themselves off (it stays on the picture), on Data Saver it
  // doesn't start, and it pauses while hold(true) (scrolled away, another tab, a sheet open). Stops once its card is gone.
  const CUT_HOLD = 6500;   // each still's turn; the drift runs a little longer, under the dissolve
  const CUT_MOVES = [   // [scale from, to, x from, to, y from, to] in % of the picture: never far enough to show an edge
    [1.04, 1.16, -1.5, 1.5, 0, -1], [1.16, 1.04, 1.5, -1.5, -1, 0], [1.06, 1.18, 1.5, -1, 1, -.5],
    [1.18, 1.06, 0, 0, -1.5, 1], [1.05, 1.15, 0, 1.5, 1, 1], [1.15, 1.05, -1, 1, .5, -1],
  ];
  function cut(host, srcs) {
    srcs = [...new Set((srcs || []).filter(Boolean))];
    if (!host || !srcs.length || navigator.connection?.saveData) return null;
    const box = document.createElement('div'); box.className = 'cut'; box.setAttribute('aria-hidden', 'true'); host.append(box);
    const anims = new Set();
    let n = 0, t = 0, held = false, gone = false, busy = false, misses = 0, left = CUT_HOLD, since = 0, m = Math.floor(Math.random() * CUT_MOVES.length);
    const shot = (src) => { const img = new Image(); img.alt = ''; img.decoding = 'async'; img.className = 'cut-f'; img.src = src; return img.decode().then(() => img, () => null); };
    async function next() {
      if (gone) return;
      if (!box.isConnected) { stop(); return; }
      if (osStill.matches || prefs.get().autoplay === false) { anims.forEach((a) => a.pause()); t = setTimeout(next, 2000); return; }   // the picture on screen stays as it is
      busy = true; const img = await shot(srcs[n++ % srcs.length]); busy = false; if (gone) return;
      // none of the stills will load (offline, say): the picture beneath stays, and it stops asking
      if (!img && ++misses >= srcs.length) { stop(); return; }
      if (img) {
        misses = 0;
        const v = CUT_MOVES[m++ % CUT_MOVES.length];
        box.append(img);
        for (const a of [
          img.animate([{ transform: `scale(${v[0]}) translate(${v[2]}%, ${v[4]}%)` }, { transform: `scale(${v[1]}) translate(${v[3]}%, ${v[5]}%)` }], { duration: CUT_HOLD + 3000, fill: 'both' }),
          img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1800, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' }),
        ]) { anims.add(a); a.onfinish = () => anims.delete(a); }   // play() would start a finished one over
        anims.forEach((a) => a.play());   // anything paused while it was calm carries on
        setTimeout(() => [...box.children].slice(0, -1).forEach((c) => { c.getAnimations().forEach((a) => { a.cancel(); anims.delete(a); }); c.remove(); }), 2000);
      }
      left = img ? CUT_HOLD : 400; since = Date.now(); if (!held) t = setTimeout(next, left);
    }
    function hold(on) {
      if (gone || on === held) return; held = on; anims.forEach((a) => (on ? a.pause() : a.play()));
      // (while a still is on its way, next() itself carries on once it's here: a second timer would run the cut twice as fast)
      if (on) { clearTimeout(t); left = Math.max(300, left - (Date.now() - since)); } else if (!busy) { since = Date.now(); clearTimeout(t); t = setTimeout(next, left); }
    }
    function stop() { gone = true; clearTimeout(t); anims.forEach((a) => a.cancel()); box.remove(); }
    next();
    return { hold, stop };
  }
  // a still's address at the size the screen needs (TMDB's w780 on phones, w1280 elsewhere)
  cut.src = (path) => `https://image.tmdb.org/t/p/${innerWidth * Math.min(2, devicePixelRatio || 1) > 1300 ? 'w1280' : 'w780'}${path}`;

  window.tn = { prefs, tip: featureTip, top10s, cut, loading, haptic, climb, member, seen, hidden, notes, esc, hue, glide, arrows, segment, reduce, saved, stars, swipes, forYou, moreLike, progress, nextUp, whenText, mine, pickMine, openMine, api, share, alerts, isIOS, account, avatar, featured, findTitle, sharedTitle, fold, score, signIn: (o, inline) => tnSignIn(o, inline) };
  // the Update centre introduces itself once, at the build number in the menu (on phones, when the menu's open)
  if (!onPage('updates')) featureTip({ id: 'update-centre', for: '.side-ver', title: 'What’s new', text: 'Tap the build number to open the Update centre: every Tenner update, with its date, what changed and any notes.' });

  // ---------- paste or drop a link: an IMDb, TMDB, Letterboxd, JustWatch or Tenner link opens that title's sheet ----------
  // ⌘V (Ctrl+V) anywhere but a text box, or a link dragged onto the page. Anything else pasted is left alone.
  const LINKY = /imdb\.com\/(?:[a-z]{2}\/)?title\/tt\d|themoviedb\.org\/(?:movie|tv)\/\d|letterboxd\.com\/film\/[a-z0-9-]|justwatch\.com\/[a-z]{2}\/(?:movie|film|tv-show|tv-series)\/[a-z0-9-]|tenner\.stream\S*(?:[?&]t=|\/t\/)[mt]\d/;
  async function openLink(text) {
    text = String(text || '').trim().slice(0, 600);
    if (!LINKY.test(text)) return false;
    const own = text.match(/tenner\.stream\S*(?:[?&]t=|\/t\/)([mt]\d{1,9})/)?.[1];
    const x = own ? { k: own } : await sharedTitle(new URLSearchParams({ text }));
    if (!x?.k) return true;
    if (!window.tnSheet) { location.href = `./?t=${x.k}`; return true; }
    if (window.tnSheet.isOpen()) { window.tnSheet.close(); await new Promise((r) => setTimeout(r, 380)); }
    // the page opens it the way it opens a shared link (with what the chart knows), or the search service does
    const u = new URL(location.href); u.searchParams.set('t', x.k); history.pushState(null, '', u);
    dispatchEvent(new PopStateEvent('popstate'));
    setTimeout(() => { if (!window.tnSheet.isOpen()) window.tnSheet.openKey(x.k); }, 400);
    return true;
  }
  const typingIn = (el) => /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName) || el?.isContentEditable;
  document.addEventListener('paste', (e) => {
    if (typingIn(document.activeElement) || document.querySelector('dialog[open]:not(.sheet)')) return;
    const text = e.clipboardData?.getData('text/plain'); if (LINKY.test(text || '')) { e.preventDefault(); openLink(text); }
  });
  const linkIn = (e) => [...(e.dataTransfer?.types || [])].some((t) => t === 'text/uri-list' || t === 'text/plain') && ![...(e.dataTransfer?.types || [])].includes('Files');
  document.addEventListener('dragover', (e) => { if (linkIn(e) && !typingIn(e.target)) e.preventDefault(); });
  document.addEventListener('drop', (e) => {
    if (!linkIn(e) || typingIn(e.target)) return;
    const text = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (LINKY.test(text || '')) { e.preventDefault(); openLink(text); }
  });

  // ---------- tabs ----------
  const tabs = [...document.querySelectorAll('#tabs [role=tab]')], ind = $('#tabInd'), names = tabs.map((t) => t.dataset.tab);
  let cur = tabs.find((t) => t.getAttribute('aria-selected') === 'true')?.dataset.tab ?? null, placed = false;
  const placeInd = (animate) => glide(ind, tabs[names.indexOf(cur)], animate, 1.18);
  function select(name) {
    cur = name;
    tabs.forEach((t) => { const on = t.dataset.tab === name; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    placeInd(placed); placed = true;
  }
  // pages without their own handler (About) send the tabs to their page; Home is the home page
  function open(name) {
    if (name === 'search') {   // Browse's own box on Browse; the menu's everywhere else
      const q = document.getElementById('q');
      if (q) { q.focus(); q.select(); scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' }); return; }
      findAnywhere(); return;
    }
    if (name === 'top10' && cur !== 'top10') { top10s(); return; }   // the Top 10s open as a popup (on their own page, the tab takes you back to the top)
    if (window.tnOnTab) return window.tnOnTab(name);
    if (name === cur) { scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' }); return; }
    loading.show('nav');
    if (name === 'about') { location.href = 'about.html'; return; }
    if (name === 'browse') { location.href = 'browse.html'; return; }
    if (name === 'new') { location.href = 'charts.html#new'; return; }
    if (name === 'top10') { location.href = 'charts.html#top10'; return; }
    if (name === 'watchlist') { location.href = 'charts.html#watchlist'; return; }
    location.href = './';
  }
  tabs.forEach((t) => t.addEventListener('click', () => open(t.dataset.tab)));
  arrows($('#tabs'), () => tabs, (n) => open(n.dataset.tab));   // the visible tabs only (About is hidden in the sidebar)
  addEventListener('resize', () => placeInd(false));
  document.fonts?.ready.then(() => placeInd(false));
  placeInd(false); placed = true;

  // ---------- keyboard shortcuts, as on the Mac: / or ⌘K (Ctrl+K) to search, from any page ----------
  addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey) && !e.altKey)) {
      e.preventDefault(); open('search');
    }
  });

  // ---------- Theme: Auto, Day or Night (Night by default) ----------
  const modeBtns = document.querySelectorAll('.th-list button');
  const mode = () => root.getAttribute('data-theme') || 'auto';
  function showTheme() {
    const m = mode();
    modeBtns.forEach((b) => b.setAttribute('aria-checked', b.dataset.mode === m));
    const dark = m === 'dark' || (m === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    $('#thIc').innerHTML = $(`.th-list [data-mode="${dark ? 'dark' : 'light'}"] i`).innerHTML; // the round button: a moon by night, a sun by day
    const meTh = $('#bxMeTh');   // ...and the same in the account pill, which flips between Day and Night
    if (meTh) { meTh.innerHTML = $('#thIc').innerHTML; meTh.setAttribute('aria-label', dark ? 'Switch to Day' : 'Switch to Night'); meTh.title = meTh.getAttribute('aria-label'); }
  }
  // the round button opens a card just under it, lined up with its right edge
  // The card is a native popover (the browser's top layer, with its own tap-outside and Escape to close)
  function tbMenu(btn, pop, onOpen) {
    const side = matchMedia('(min-width: 1000px)');
    const place = () => {
      const r = btn.getBoundingClientRect(), w = pop.offsetWidth;
      if (side.matches) {   // computers: beside its row in the sidebar, like a Mac menu
        const h = pop.offsetHeight, top = Math.max(12, Math.min(r.top - 18, innerHeight - h - 12));
        Object.assign(pop.style, { left: `${r.right + 10}px`, top: `${top}px`, maxHeight: `${innerHeight - 24}px` });
        pop.style.setProperty('--tb-o', `-14px ${r.top + r.height / 2 - top}px`); return;
      }
      const left = Math.max(12, Math.min(r.right - w, innerWidth - w - 12));
      const h = pop.offsetHeight, up = innerHeight - r.bottom < h + 20 && r.top > h + 20;
      pop.style.top = (up ? r.top - h - 8 : r.bottom + 8) + 'px';
      pop.style.maxHeight = Math.max(200, up ? r.top - 20 : innerHeight - r.bottom - 20) + 'px';
      pop.style.left = left + 'px';
      pop.style.setProperty('--tb-o', `${r.left + r.width / 2 - left}px ${up ? 'calc(100% + 14px)' : '-14px'}`); // it grows out of its own button
    };
    btn.setAttribute('popovertarget', pop.id);
    pop.addEventListener('toggle', (e) => {
      const on = e.newState === 'open';
      btn.setAttribute('aria-expanded', on);
      if (on) { [...pop.children].forEach((c, i) => c.style.setProperty('--i', i)); place(); onOpen?.(); }
      else if (pop.contains(document.activeElement) || document.activeElement === document.body) btn.focus({ preventScroll: true });
    });
    addEventListener('resize', () => { if (pop.matches(':popover-open')) place(); });
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', showTheme); // Auto: the icon follows the device
  tbMenu($('#thBtn'), $('#thPop'), () => $('#thPop [aria-checked="true"]')?.focus({ preventScroll: true }));
  arrows($('#thPop'), () => [...modeBtns]);
  modeBtns.forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.mode)));
  // phones: the phone's own picker instead of the card (a native <select> laid invisibly over the round button)
  const thWrap = document.createElement('span'), thSel = document.createElement('select');
  thWrap.className = 'th-wrap'; thSel.className = 'th-sel'; thSel.setAttribute('aria-label', 'Theme');
  thSel.innerHTML = '<option value="auto">Auto (follows your device)</option><option value="light">Day</option><option value="dark">Night</option>';
  $('#thBtn').before(thWrap); thWrap.append($('#thBtn'), thSel);
  thSel.addEventListener('change', () => setTheme(thSel.value));
  function syncSel() { thSel.value = mode(); }
  syncSel();
  // ...and the round button in the account pill (top right): one tap flips between Day and Night
  // (signed in on computers and tablets it stands in for the Theme button; Auto is in Settings)
  $('#bxMeTh')?.addEventListener('click', () => {
    setTheme($('#bxMeTh').getAttribute('aria-label') === 'Switch to Day' ? 'light' : 'dark'); haptic(6);
    if (!reduce()) replay($('#bxMeTh'), 'me-th-spin');
  });
  // every way of changing the theme (the Theme menu, the phone's picker, the pill, Settings) goes through here, so the
  // round buttons, the menu's ticks and Settings' own menu always agree; another tab changing it changes this one too
  function setTheme(n, quiet) {
    window.tnTheme?.(n); if (!quiet) { try { localStorage.setItem('tenner-theme', n); } catch {} }
    showTheme(); syncSel(); dispatchEvent(new Event('tn:theme'));
  }
  window.tn.setTheme = (n) => setTheme(n);
  addEventListener('storage', (e) => { if (e.key === 'tenner-theme') setTheme(['light', 'auto'].includes(e.newValue) ? e.newValue : 'dark', true); });
  showTheme();

  // ---------- a fade behind the floating bar once the page has scrolled ----------
  // and the page's title moves into the bar once its large title has gone under it (phones and tablets)
  const brand = $('.top-brand'), barTitle = document.createElement('span');
  barTitle.className = 'bar-title'; barTitle.setAttribute('aria-hidden', 'true'); brand?.append(barTitle);
  let ticking = false;
  const sidebar = matchMedia('(min-width: 1000px)'); sidebar.addEventListener('change', () => onScroll());
  const titleCheck = () => {
    ticking = false;
    const h = [...document.querySelectorAll('h1')].find((e) => e.getClientRects().length), bar = brand?.getBoundingClientRect();
    const under = !sidebar.matches && !!(h && bar && h.getBoundingClientRect().bottom < bar.bottom + 4);   // phones and tablets only
    if (under) { const t = (h.dataset.title || h.textContent).trim(); if (barTitle.textContent !== t) barTitle.textContent = t; }
    root.classList.toggle('title-in', under);
  };
  const onScroll = () => {
    root.classList.toggle('scrolled', scrollY > 8);
    if (!ticking) { ticking = true; requestAnimationFrame(titleCheck); }
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ---------- staying current: pages left open fetch the new hour's data by themselves ----------
  // Every 15 minutes while the page is on screen, and whenever you come back to it after a few minutes away,
  // a "tn:check" event goes out; each page listens and quietly swaps in fresh posters, artwork and charts.
  // Nothing runs while the tab is hidden.
  let lastCheck = Date.now();
  const check = () => { lastCheck = Date.now(); dispatchEvent(new Event('tn:check')); };
  setInterval(() => { if (document.visibilityState === 'visible') check(); }, 15 * 60e3);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - lastCheck > 4 * 60e3) check(); });
  addEventListener('pageshow', (e) => { if (e.persisted) check(); });   // back/forward cache

  // ---------- service names: a small glass label over any logo marked data-tip ----------
  // Hover with a mouse (or focus with the keyboard) to see it; on a phone, press and hold the logo.
  // A hold that showed the name doesn't also open what's underneath.
  const tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('aria-hidden', 'true'); document.body.append(tip);
  let tipFor = null, tipWait = 0, tipHide = 0, tipLast = 0, held = false, hold = null;
  const showTip = (el) => {
    clearTimeout(tipHide); tipFor = el; tip.textContent = el.dataset.tip;
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, below = r.top < h + 14;
    tip.style.left = Math.round(Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8)) + 'px';
    tip.style.top = Math.round(below ? r.bottom + 8 : r.top - h - 8) + 'px';
    tip.classList.toggle('below', below); tip.classList.add('on');
  };
  const hideTip = (after = 0) => { clearTimeout(tipWait); clearTimeout(tipHide); tipHide = setTimeout(() => { if (tipFor) tipLast = Date.now(); tipFor = null; tip.classList.remove('on'); }, after); };
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const el = e.target.closest?.('[data-tip]'); if (!el || el === tipFor) return;
    clearTimeout(tipWait); tipWait = setTimeout(() => showTip(el), tipFor || Date.now() - tipLast < 600 ? 0 : 350);
  });
  document.addEventListener('pointerout', (e) => { if (e.pointerType !== 'touch' && e.target.closest?.('[data-tip]') && !e.relatedTarget?.closest?.('[data-tip]')) hideTip(); });
  document.addEventListener('focusin', (e) => { if (e.target.matches?.(':focus-visible[data-tip]')) showTip(e.target); });
  document.addEventListener('focusout', () => hideTip());
  document.addEventListener('pointerdown', (e) => {
    held = false; const el = e.pointerType === 'touch' && e.target.closest?.('[data-tip]'); if (!el) return;
    hold = { x: e.clientX, y: e.clientY, t: setTimeout(() => { held = true; showTip(el); navigator.vibrate?.(8); }, 450) };
  }, { passive: true });
  document.addEventListener('pointermove', (e) => { if (hold && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > 10) { clearTimeout(hold.t); hold = null; } }, { passive: true });
  const letGo = () => { if (hold) { clearTimeout(hold.t); hold = null; } if (held) hideTip(1400); };
  document.addEventListener('pointerup', letGo); document.addEventListener('pointercancel', letGo);
  document.addEventListener('click', (e) => { if (held) { held = false; e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener('contextmenu', (e) => { if (e.target.closest?.('[data-tip]') && (held || hold)) e.preventDefault(); });
  addEventListener('scroll', () => tipFor && hideTip(), { passive: true, capture: true });

  // Privacy & Terms: only the part you're reading is marked in the menu (it marked all three at once), following you as you scroll
  const legal = [...document.querySelectorAll('.side-link[href^="legal.html#"]')];
  if (onPage('legal') && legal.length) {
    const parts = legal.map((a) => [a, document.getElementById(a.hash.slice(1))]).filter(([, el]) => el);
    const mark = () => {
      const order = parts.slice().sort((x, y) => x[1].offsetTop - y[1].offsetTop), end = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
      const line = innerHeight * 0.35, at = (end && scrollY > 0 && order.at(-1)) || parts.filter(([, el]) => el.getBoundingClientRect().top < line).sort((x, y) => y[1].getBoundingClientRect().top - x[1].getBoundingClientRect().top)[0]
        || parts.find(([a]) => a.hash === location.hash) || order[0];
      for (const [a] of parts) { if (a === at?.[0]) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); }
    };
    let lt = false; addEventListener('scroll', () => { if (!lt) { lt = true; requestAnimationFrame(() => { lt = false; mark(); }); } }, { passive: true });
    addEventListener('hashchange', mark); mark();
  }

  window.tnShell = { select, current: () => cur };

  // ---------- computers: frosted cards catch a soft light under the pointer (drawn in CSS from --mx / --my) ----------
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const lit = '.set-page .set-group, .cx-card, .ab-box';
    let card = null, raf = 0, px = 0, py = 0;
    const draw = () => { raf = 0; if (!card) return; const r = card.getBoundingClientRect(); card.style.setProperty('--mx', `${px - r.left}px`); card.style.setProperty('--my', `${py - r.top}px`); };
    document.addEventListener('pointermove', (e) => {
      const c = e.target.closest?.(lit) || null;
      if (c !== card) { card?.style.removeProperty('--mx'); card?.style.removeProperty('--my'); card = c; }
      px = e.clientX; py = e.clientY; if (card && !raf) raf = requestAnimationFrame(draw);
    }, { passive: true });
    document.addEventListener('pointerleave', () => { card?.style.removeProperty('--mx'); card?.style.removeProperty('--my'); card = null; });
  }

  // ---------- Christmas lights: old-fashioned glass bulbs (the big C9 kind) in red, green and blue, strung on a sagging
  // wire pinned to the top of every page (beside the sidebar on computers, never over it), from November until Boxing Day. The bulbs are drawn in one SVG (lit glass with a
  // hot filament glow and a highlight); each bulb's halo is its own layer, so with Animations on it can twinkle (opacity
  // only, off the main thread). Still otherwise, and under Reduce Motion. Never in the way: they can't be tapped.
  {
    const d = new Date(), m = d.getMonth();
    // not on phones (the owner's pick): computers and tablets only
    if ((m === 10 || (m === 11 && d.getDate() <= 26)) && !matchMedia('(max-width: 719px)').matches) {
      const xl = document.createElement('div');
      xl.className = 'xl'; xl.setAttribute('aria-hidden', 'true');
      const C = { r: ['#fff6e8', '#ff5a47', '#e01b10', '#8f0c06'], g: ['#f4ffe9', '#4ef06e', '#16b23a', '#07601d'], u: ['#f1f8ff', '#55a6ff', '#1466f0', '#0a3590'] };
      const defs = Object.entries(C).map(([k, [hot, lit, mid, deep]]) => `<radialGradient id="xl${k}" cx="46%" cy="40%" r="68%" fx="44%" fy="36%"><stop offset="0" stop-color="${hot}"/><stop offset=".18" stop-color="${lit}"/><stop offset=".62" stop-color="${mid}"/><stop offset="1" stop-color="${deep}"/></radialGradient>`).join('')
        + '<linearGradient id="xlsk" x1="0" x2="1"><stop offset="0" stop-color="#16271d"/><stop offset=".38" stop-color="#3d6450"/><stop offset=".55" stop-color="#5f8a73"/><stop offset="1" stop-color="#101d15"/></linearGradient>'
        + '<radialGradient id="xlhot"><stop offset="0" stop-color="#fffbe8"/><stop offset=".45" stop-color="#fff3c4" stop-opacity=".75"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient>'
        + '<linearGradient id="xlsh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>';
      // a C9 bulb hanging from (0, 0): a metal socket with ribs, then the glass: lit colour, a warm filament core, a fine
      // rim, a long highlight down one side and a glint
      const glass = 'M-4.8 8C-8.8 11-9.4 18-6.7 23.8-4.7 28-1.9 31.7 0 33.2 1.9 31.7 4.7 28 6.7 23.8 9.4 18 8.8 11 4.8 8Z';
      const bulb = (k) => `<path d="M-1.2-2.2h2.4v2.6h-2.4z" fill="#0d1811"/><rect x="-4.9" y="-.6" width="9.8" height="9.4" rx="2" fill="url(#xlsk)"/>
        <path d="M-4.9 2.4h9.8M-4.9 5.2h9.8" stroke="rgba(0,0,0,.35)" stroke-width=".9"/><path d="M-4.9 3h9.8M-4.9 5.8h9.8" stroke="rgba(255,255,255,.18)" stroke-width=".5"/>
        <path d="${glass}" fill="url(#xl${k})" stroke="${C[k][3]}" stroke-opacity=".55" stroke-width=".6"/>
        <ellipse cx="0" cy="17" rx="3.6" ry="6" fill="url(#xlhot)"/>
        <path d="M-5.6 12.2C-7.1 15.6-6.9 19.6-5.2 23.2-4.6 21-4.4 16.4-3.4 12.6-4 11.6-5 11.4-5.6 12.2Z" fill="url(#xlsh)" opacity=".8"/>
        <circle cx="3.3" cy="12" r="1" fill="#fff" opacity=".7"/>`;
      let w = 0;
      const hang = () => {
        const W = xl.clientWidth || innerWidth;
        if (W === w) return; w = W;
        const sm = innerWidth < 600, U = sm ? 112 : 158, S = sm ? 13 : 17, sc = sm ? .86 : 1.08, n = Math.ceil(w / U) + 1, x0 = -((n * U - w) / 2);
        const y = (t) => 1 + 4 * t * (1 - t) * S, H = 2 * S + 52;
        let path = '', bulbs = '', glows = '', k = 0;
        for (let i = 0; i < n; i++) {
          const a = x0 + i * U;
          path += `${i ? '' : `M${a} 1`} Q${a + U / 2} ${1 + 2 * S} ${a + U} 1 `;
          for (const t of [0.27, 0.73]) {
            const c = 'rgu'[k % 3], x = a + t * U, yy = y(t), tilt = [-8, 6, -4, 9, -6, 4][k % 6];
            bulbs += `<g transform="translate(${x.toFixed(1)} ${yy.toFixed(1)}) rotate(${tilt}) scale(${sc})">${bulb(c)}</g>`;
            glows += `<i class="xl-o xl-${c}" style="left:${x.toFixed(1)}px;top:${(yy + 20 * sc).toFixed(1)}px;--d:${(-(k * 0.83) % 3.1).toFixed(2)}s"></i>`;
            k++;
          }
        }
        xl.innerHTML = `${glows}<svg width="${w}" height="${H}" viewBox="0 0 ${w} ${H}"><defs>${defs}</defs><path class="xl-w" d="${path}"/><path class="xl-w2" d="${path}"/>${bulbs}</svg>`;
      };
      // on Browse, inside its page (a layer of its own), so the search bar that holds on at the top stays above them
      (document.querySelector('main.bwrap') || document.body).append(xl); hang();
      let raf = 0; addEventListener('resize', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; hang(); }); });
      featureTip({ id: 'xmas-lights', for: xl, title: 'Christmas lights', delay: 2400,
        text: 'Tenner\'s lit up for the season. The lights twinkle when Animations are on in Settings, and come down after Boxing Day.' });
    }
  }

  // the crossfade between pages: one cut short (a tap or Escape mid-way) is fine, not an error
  for (const ev of ['pageswap', 'pagereveal']) addEventListener(ev, (e) => { e.viewTransition?.ready.catch(() => {}); e.viewTransition?.finished.catch(() => {}); });

  // ---------- install as an app: the offline cache (sw.js) ----------
  if ('serviceWorker' in navigator && location.protocol === 'https:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
