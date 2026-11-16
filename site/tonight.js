// "What should I watch tonight?": three questions, three picks from your services. window.tnTonight.box() draws the home
// page's box (the first question, asked right there), and any [data-tonight] button opens the guided sheet; data-tonight="tv"
// (or movie, any) answers the first question on the way in. A page can lend the catalogue, services and title details
// it has already loaded with window.tnTonight.use({ cat, services, titles }).
(() => {
  const { esc, hue } = window.tn;
  const $ = (s, el = document) => el.querySelector(s);
  const opts = {};
  const shown = new Map(), reg = (info) => { const n = String(shown.size); shown.set(n, info); return `data-sheet="${n}"`; };
  const tmdbUrl = (type, id) => `https://www.themoviedb.org/${type}/${id}`;
  const thumb = (u) => String(u).replace('/t/p/w342/', '/t/p/w154/');
  let svcP = null;
  const services = () => (opts.services?.()?.length ? Promise.resolve(opts.services()) : (svcP ||= fetch('data/trending.json').then((r) => (r.ok ? r.json() : null)).then((d) => (d?.services || []).filter((s) => !s.shop && !s.store)).catch(() => [])
    .then((l) => { if (!l.length) svcP = null; return l; })));   // a failure isn't kept: the next try asks again
  const titles = () => opts.titles?.() || null;

  // How long you've got (an episode or two, a film, either), the mood, and who's watching; then the best-rated, most-watched
  // matches from the Browse catalogue on your services (or all of them), a few at random from the top so it's never the same.
  // Every answer has its own icon: a white glyph on an Apple-style gradient tile.
  const TN_GLYPH = {
    tv: '<rect x="3" y="4.5" width="18" height="12.5" rx="3"/><path d="M8.5 20.5h7"/><path d="M10.3 8.3v5.4l4.5-2.7z" fill="currentColor"/>',
    movie: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8.5 3v18M15.5 3v18M4 7.5h4.5M4 12h4.5M4 16.5h4.5M15.5 7.5H20M15.5 12H20M15.5 16.5H20"/>',
    any: '<path d="M3 7h3.2c2 0 3.2 1 4.2 2.7l2.6 4.6c1 1.7 2.2 2.7 4.2 2.7H21M3 17h3.2c1.4 0 2.4-.5 3.2-1.4M14.4 8.4c.8-.9 1.8-1.4 3.2-1.4H21M18.2 4.2 21 7l-2.8 2.8M18.2 14.2 21 17l-2.8 2.8"/>',
    laugh: '<circle cx="12" cy="12" r="9"/><path d="M7.8 13.6c.9 2 2.4 3 4.2 3s3.3-1 4.2-3z" fill="currentColor"/><circle cx="9" cy="9.8" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="9.8" r="1.3" fill="currentColor" stroke="none"/>',
    edge: '<path d="M13.5 2.5 4.8 13.4h6.4l-1 8.1 8.9-11.3h-6.6z" fill="currentColor"/>',
    feel: '<path d="M12 20.3s-8-4.7-8-10.6a4.4 4.4 0 0 1 8-2.6 4.4 4.4 0 0 1 8 2.6c0 5.9-8 10.6-8 10.6z" fill="currentColor"/>',
    mind: '<circle cx="12" cy="12" r="5.2"/><path d="M6.8 14.6c-3 2.3-4.4 4.3-3.6 5.1 1.2 1.2 6.4-1.4 11-6s7.3-9.7 6-11c-.8-.7-2.8.6-5.1 3.6"/>',
    real: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3z"/>',
    scare: '<path d="M5 20.5V11a7 7 0 0 1 14 0v9.5l-2.3-1.6-2.4 1.6-2.3-1.6-2.3 1.6-2.4-1.6z"/><circle cx="9.6" cy="11" r="1.3" fill="currentColor" stroke="none"/><circle cx="14.4" cy="11" r="1.3" fill="currentColor" stroke="none"/>',
    me: '<circle cx="12" cy="8" r="3.8"/><path d="M4.8 20.3c.9-3.8 3.7-5.9 7.2-5.9s6.3 2.1 7.2 5.9"/>',
    two: '<circle cx="8.8" cy="8.6" r="3.3"/><path d="M2.8 19.8c.7-3.3 3-5.1 6-5.1s5.3 1.8 6 5.1"/><circle cx="16.6" cy="7.4" r="2.8"/><path d="M16.8 12.6c2.4.1 4 1.6 4.6 4.3"/>',
    family: '<path d="M3.2 11.2 12 4l8.8 7.2"/><path d="M5.6 9.3V20h12.8V9.3"/><path d="M12 17.6s-3.1-1.8-3.1-4a1.6 1.6 0 0 1 3.1-.9 1.6 1.6 0 0 1 3.1.9c0 2.2-3.1 4-3.1 4z" fill="currentColor" stroke="none"/>',
    pop: '<path d="M5.6 9.2h12.8l-1.7 11.1a1.5 1.5 0 0 1-1.5 1.3H8.8a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M10 9.6l.5 11.9M14 9.6l-.5 11.9"/><path d="M6.2 9a2.6 2.6 0 0 1 2.1-4.1 2.9 2.9 0 0 1 5.1-1 2.6 2.6 0 0 1 4.1 2.6A2 2 0 0 1 17.8 9"/>',
  };
  // each icon's two colours, from Apple's system palette
  const TN_TINT = { tv: ['#64d2ff', '#0a84ff'], movie: ['#ffb340', '#ff375f'], any: ['#da8fff', '#5e5ce6'], laugh: ['#ffd60a', '#ff9f0a'],
    edge: ['#ff7a45', '#ff2d55'], feel: ['#ff8fab', '#ff375f'], mind: ['#a78bfa', '#5e5ce6'], real: ['#66e08a', '#00b5a8'],
    scare: ['#8e8cf0', '#3a2f8f'], me: ['#64d2ff', '#0a84ff'], two: ['#ff8fab', '#bf5af2'], family: ['#ffd60a', '#ff8a00'], pop: ['#ff6b6b', '#ff375f'] };
  const tnIc = (k) => `<span class="tn-ic" style="--a:${TN_TINT[k][0]};--b:${TN_TINT[k][1]}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${TN_GLYPH[k]}</svg></span>`;
  const MOODS = [
    ['laugh', 'A laugh', 'Comedy, sitcoms, animation', [35, 16]],
    ['edge', 'Edge of my seat', 'Thrillers, crime, action', [53, 80, 28, 10759, 9648]],
    ['feel', 'Something feel‑good', 'Family, romance, heart-warming', [10751, 10749, 10762, 35]],
    ['mind', 'Mind-bending', 'Sci-fi, fantasy, mystery', [878, 10765, 14, 9648]],
    ['real', 'Something real', 'Documentaries and true stories', [99, 36, 10764]],
    ['scare', 'A scare', 'Horror', [27]],
  ];
  const DARK = [27, 80, 53, 10752];   // left out when the family's watching
  let tnCat = null;
  const AGAIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v4.5H9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const SPARK = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10.5 3.5l1.8 4.9 4.9 1.8-4.9 1.8-1.8 4.9-1.8-4.9-4.9-1.8 4.9-1.8z"/><path d="M18 14l.9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9z"/></svg>';
  const tonight = { step: 0, len: null, mood: null, who: null, seen: new Set(), dir: 1 };
  // the three questions, and how each answer reads on the path once it's given
  const STEPS = [['len', 'How long'], ['mood', 'Mood'], ['who', 'Who’s watching']];
  const SAID = { tv: 'Episodes', movie: 'A film', any: 'Either', me: 'Just me', two: 'The two of you', family: 'The family', ...Object.fromEntries(MOODS.map((m) => [m[0], m[1].replace('‑', '-')])) };
  const CHEV = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const still = () => document.documentElement.classList.contains('still') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  let busy = false;
  function tonightDialog() {
    let d = $('#tnDlg');
    if (!d) {
      document.body.insertAdjacentHTML('beforeend', `<dialog class="mine-dlg tn-dlg" id="tnDlg" aria-labelledby="tnH"><form method="dialog">
        <span class="tn-grab" aria-hidden="true"></span>
        <div class="tn-bar"><button type="button" class="tn-rd" data-tn="back" aria-label="Back">${CHEV('m15 5-7 7 7 7')}</button>
          <p class="tn-bar-t" id="tnBarT" aria-live="polite"></p>
          <button class="tn-rd" value="x" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button></div>
        <ol class="tn-path" id="tnPath" aria-label="Your answers"></ol>
        <div id="tnBody"></div></form></dialog>`);
      d = $('#tnDlg');
      d.addEventListener('click', (e) => {
        if (e.target === d) { d.close(); return; }
        const o = e.target.closest('[data-tn]'); if (!o || busy) return;
        e.preventDefault();
        const [f, v] = o.dataset.tn.split(':');
        if (f === 'again') { tonight.dir = 1; tonight.step = 0; tonight.seen.clear(); }
        else if (f === 'more') { tonight.dir = 1; /* same answers, the next few */ }
        else if (f === 'back') { tonight.dir = -1; tonight.step = Math.max(0, tonight.step - 1); }
        else if (f === 'go') { tonight.dir = -1; tonight.step = +v; }
        else {   // an answer: it lights up with a tick for a moment, then on to the next question
          tonight[f] = v; tonight.dir = 1; window.tn?.haptic?.(8);
          o.classList.add('on'); o.setAttribute('aria-pressed', 'true');
          busy = true;
          setTimeout(() => { busy = false; tonight.step++; drawTonight(); }, still() ? 0 : 220);
          return;
        }
        drawTonight();
      });
      d.addEventListener('click', (e) => {   // a pick opens its title card
        const a = e.target.closest('[data-sheet]'); if (!a || e.metaKey || e.ctrlKey) return;
        e.preventDefault(); d.close(); window.tnSheet?.open(shown.get(a.dataset.sheet));
      });
      // on a phone it's a sheet from the bottom: pull it down by its top to put it away
      let y0 = null, dy = 0;
      d.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch' || !matchMedia('(max-width: 600px)').matches || !e.target.closest('.tn-grab, .tn-bar') || e.target.closest('button') || d.scrollTop > 0) return;
        y0 = e.clientY; dy = 0; d.classList.add('tn-drag');
      });
      d.addEventListener('pointermove', (e) => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); d.style.translate = `0 ${dy}px`; });
      const end = () => { if (y0 == null) return; y0 = null; d.classList.remove('tn-drag'); d.style.translate = ''; if (dy > 90) d.close(); };
      d.addEventListener('pointerup', end); d.addEventListener('pointercancel', end);
    }
    return d;
  }
  // the path along the top: each step a number until it's answered, then your answer's icon (tap it to change that answer)
  function drawPath() {
    const s = tonight.step, path = $('#tnPath');
    path.style.setProperty('--done', Math.min(s, 2));
    path.innerHTML = STEPS.map(([f, label], i) => {
      const v = tonight[f], done = i < s && v;
      if (done) return `<li class="done"><button type="button" class="tn-node" data-tn="go:${i}" aria-label="${esc(label)}: ${esc(SAID[v])}. Change">${tnIc(v)}<small>${esc(SAID[v])}</small></button></li>`;
      return `<li class="${i === s ? 'now' : ''}"${i === s ? ' aria-current="step"' : ''}><span class="tn-node"><span class="tn-dot">${i + 1}</span><small>${esc(label)}</small></span></li>`;
    }).join('');
    $('#tnBarT').textContent = s < 3 ? `Step ${s + 1} of 3` : 'Tonight’s picks';
    $('#tnDlg [data-tn="back"]').classList.toggle('tn-off', s === 0);
  }
  function drawTonight() {
    const b = $('#tnBody'), s = tonight.step;
    const opt = (f, v, label, sub) => `<button type="button" class="tn-opt" data-tn="${f}:${v}"${tonight[f] === v && s < 3 && tonight.dir < 0 ? ' data-was' : ''}>${tnIc(v)}<span class="tn-ol"><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>
      <svg class="tn-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <svg class="tn-tick" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="m7.5 12.3 3 3 6-6.3" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
    const head = (q, sub) => `<div class="tn-pane"><h2 id="tnH" tabindex="-1">${q}</h2><p class="tn-sub">${sub}</p>`;
    const svcs = window.tn.mine.get().length ? 'your services' : 'every service';
    drawPath();
    let h;
    if (s === 0) h = head('How long have you got?', `Three quick questions, then three picks from ${svcs}.`) + `<div class="tn-opts tn-row">${opt('len', 'tv', 'An episode or two', 'Shows')}${opt('len', 'movie', 'A film', 'Films')}${opt('len', 'any', 'Either', 'Surprise me')}</div></div>`;
    else if (s === 1) h = head('What are you in the mood for?', 'Pick the feeling you’re after.') + `<div class="tn-opts tn-grid">${MOODS.map(([v, l, sub]) => opt('mood', v, l, sub)).join('')}</div></div>`;
    else if (s === 2) h = head('Who’s watching?', 'So we get the tone just right.') + `<div class="tn-opts tn-row">${opt('who', 'me', 'Just me', 'All yours')}${opt('who', 'two', 'Me and someone else', 'Something you’ll both like')}${opt('who', 'family', 'The family', 'Nothing too scary or grown-up')}</div></div>`;
    else {
      h = `<div class="tn-pane"><h2 id="tnH" tabindex="-1">Finding tonight’s three…</h2><p class="tn-sub">Looking through ${svcs}.</p><ul class="tn-picks tn-sk" aria-hidden="true">${'<li><a><span class="tn-ph"></span><span class="tn-t"><i></i><i></i></span></a></li>'.repeat(3)}</ul></div>`;
      tonightPicks().then((r) => { if (tonight.step === 3) { b.innerHTML = `<div class="tn-pane tn-in">${r}</div>`; } });
    }
    b.innerHTML = h;
    b.querySelector('.tn-pane')?.classList.add(tonight.dir < 0 ? 'tn-bk' : 'tn-fw');
    if (document.activeElement?.closest?.('#tnDlg') || document.activeElement === document.body) (b.querySelector('.tn-opt[data-was]') || b.querySelector('.tn-opt'))?.focus({ preventScroll: true });
  }
  async function tonightPicks() {
    tnCat ||= (opts.cat?.() ? Promise.resolve(opts.cat()) : fetch('data/browse.json').then((r) => (r.ok ? r.json() : null)).catch(() => null));   // the page has it already, usually
    const cat = await tnCat; if (!cat?.items) tnCat = null;   // try again next time, rather than keep the failure
    if (!cat?.items) return `<h2 id="tnH" tabindex="-1">Couldn’t load the picks</h2><p class="tn-sub">Try again in a moment.</p><div class="tn-acts"><button type="button" class="btn btn-tinted" data-tn="again">${AGAIN}Start again</button></div>`;
    const svcList = await services(), svc = (k) => svcList.find((s) => s.key === k);
    const mineSvcs = window.tn.mine.get(), want = new Set(mineSvcs.length ? mineSvcs : svcList.map((x) => x.key));
    const genres = new Set(MOODS.find((m) => m[0] === tonight.mood)?.[3] || []), no18 = window.tn.prefs.get().no18, hid = window.tn.hidden.keys();
    const pool = cat.items.filter((x) => (tonight.len === 'any' || x.t === tonight.len) && x.s?.some((k) => want.has(k)) && x.g?.some((g) => genres.has(g))
        && (tonight.who !== 'family' || !x.g.some((g) => DARK.includes(g))) && (x.r || 0) >= 6.4 && (x.v || 0) >= 40 && !hid.has(`${x.t[0]}${x.i}`) && !(no18 && titles()?.items?.[`${x.t === 'movie' ? 'm' : 't'}${x.i}`]?.c === '18'))
      .map((x) => ({ x, score: (x.r || 0) * Math.log10(10 + (x.v || 0)) + Math.log10(1 + (x.p || 0)) }))
      .sort((a, b) => b.score - a.score).slice(0, 30).filter(({ x }) => !tonight.seen.has(`${x.t}${x.i}`));
    if (!pool.length) return `<h2 id="tnH" tabindex="-1">${tonight.seen.size ? 'That’s all for those answers' : 'Nothing quite fits'}</h2><p class="tn-sub">Try a different mood${mineSvcs.length ? ', or add more of your services in Settings' : ''}.</p><div class="tn-acts"><button type="button" class="btn btn-tinted" data-tn="again">${AGAIN}Start again</button></div>`;
    // three, each from a different part of the best thirty, so the very best one usually shows and the others vary
    const picks = []; const bag = [...pool];
    while (picks.length < 3 && bag.length) { const i = Math.floor(Math.pow(Math.random(), 1.6) * bag.length); picks.push(bag.splice(i, 1)[0].x); }
    picks.forEach((x) => tonight.seen.add(`${x.t}${x.i}`));
    return `<h2 id="tnH" tabindex="-1">Tonight, try…</h2><p class="tn-sub">Picked for ${tonight.who === 'family' ? 'the family' : tonight.who === 'two' ? 'the two of you' : 'you'} from ${mineSvcs.length ? 'your services' : 'every service'}. Tap one for the details.</p>
      <ul class="tn-picks">${picks.map((x, n) => {
        const poster = x.img ? (x.img.startsWith('/') ? cat.img + x.img : x.img) : null;
        const svcs = x.s.filter((k) => want.has(k)).map(svc).filter(Boolean);
        const info = { k: `${x.t === 'movie' ? 'm' : 't'}${x.i}`, type: x.t, title: x.n, year: (x.d || '').slice(0, 4) || null, rating: x.r, poster, eye: 'Tenner’s pick for tonight',
          tmdb: tmdbUrl(x.t, x.i), services: svcs.map((s) => ({ label: s.label, logo: s.logo })), genres: (x.g || []).map((g) => cat.genres?.[g]).filter(Boolean).slice(0, 3) };
        return `<li><a href="${esc(info.tmdb)}" target="_blank" rel="noopener" ${reg(info)}>
          ${poster ? `<img src="${esc(thumb(poster))}" alt="" loading="lazy">` : `<span class="tn-ph" style="background:hsl(${hue(x.n)} 45% 35%)"></span>`}
          <span class="tn-t">${n ? '' : '<span class="tn-best">Best match</span>'}<b>${esc(x.n)}</b><small>${esc([x.t === 'movie' ? 'Film' : 'Series', info.year, x.r ? `★ ${x.r.toFixed(1)}` : ''].filter(Boolean).join(' · '))}</small>
          <small>On ${esc(svcs.map((s) => s.label).join(', '))}</small></span></a></li>`;
      }).join('')}</ul>
      <div class="tn-acts"><button type="button" class="btn btn-tinted btn-2nd" data-tn="again">${AGAIN}Start again</button><button type="button" class="btn btn-tinted mine-done" data-tn="more">${SPARK}Show me others</button></div>`;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tonight]'); if (!b) return;
    const len = b.dataset.tonight;   // the home box asks the first question itself
    Object.assign(tonight, { step: 0, len: null, mood: null, who: null, dir: 1 }); tonight.seen.clear(); shown.clear(); busy = false;
    if (TN_TINT[len]) { tonight.len = len; tonight.step = 1; window.tn?.haptic?.(8); }
    const d = tonightDialog(); drawTonight(); d.showModal(); $('#tnH')?.focus();   // start on the question, not a ringed close button
  });
  // the home page's box: the first question, asked right there; an answer opens the sheet on the next one
  function tonightBox() {
    const tile = (v, l) => `<button type="button" class="bx-tn-opt" data-tonight="${v}">${tnIc(v)}<span>${l}</span></button>`;
    return `<section class="bx-panel panel bx-tn" aria-labelledby="bxTn">
      <div class="bx-tn-hd">${tnIc('pop')}<div><h2 id="bxTn">What should I watch tonight?</h2>
      <p class="bx-panel-say">Three quick questions, three picks from ${window.tn.mine.get().length ? 'your services' : 'every service'}.</p></div></div>
      <p class="bx-tn-q"><span>1 of 3</span>How long have you got?</p>
      <div class="bx-tn-opts" role="group" aria-label="How long have you got?">${tile('tv', 'Episodes')}${tile('movie', 'A film')}${tile('any', 'Either')}</div></section>`;
  }
  window.tnTonight = { box: tonightBox, use(o) { Object.assign(opts, o); } };
})();
