// Search that knows what you meant. When TMDB finds nothing that fits what was typed ('jurasic park', 'lord of rings
// fellowship', 'tom hanx'), this asks Wikipedia's spelling suggestion and best matches for the likely name, and tries
// the longer words on their own, then keeps only the answers that are a slip or two away from what was typed. Wikipedia
// needs no key; if it's down or slow, the word-by-word tries still run, and the plain answer stands if nothing fits.

const UA = 'Tenner/1.0 (https://github.com/danxharvard/tenner)';
const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'in', 'on', 'to', 'at', 'for', 'with', 'part', 'movie', 'film', 'show', 'series', 'tv']);

export const fold = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();

// at most `max` letters added, dropped, changed or swapped round between a and b
export function near(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false;
  let pp = null, prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let low = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (pp && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], pp[j - 2] + 1);   // 'thigns'
      low = Math.min(low, cur[j]);
    }
    if (low > max) return false;
    pp = prev; prev = cur;
  }
  return prev[b.length] <= max;
}

// the words that matter in what was typed ('the', 'of' and the like only count when there's nothing else)
const words = (q) => { const all = fold(q).split(' ').filter(Boolean), w = all.filter((x) => !STOP.has(x)); return w.length ? w : all; };
const slip = (w) => (w.length > 7 ? 2 : w.length > 3 ? 1 : 0);
// how much of what was typed is in a name, allowing a slip or two in each longer word: 0 to 1
export function fits(name, q) {
  const tw = fold(name).split(' '), qw = words(q); if (!qw.length) return 0;
  const joined = tw.join('');
  let hit = 0;
  for (const w of qw) if (tw.some((t) => t === w || (w.length > 2 && t.startsWith(w)) || (slip(w) && near(w, t, slip(w)))) || (w.length > 5 && joined.includes(w))) hit++;
  return hit / qw.length;
}

async function wikiGuess(q, fetcher) {
  try {
    const p = new URLSearchParams({ action: 'query', list: 'search', srsearch: q, srinfo: 'suggestion', srprop: '', srlimit: '3', srnamespace: '0', format: 'json' });
    const r = await fetcher(`https://en.wikipedia.org/w/api.php?${p}`, { headers: { 'user-agent': UA, accept: 'application/json' }, signal: AbortSignal.timeout(2500) });
    if (!r.ok) return { fix: null, names: [] };
    const d = await r.json(), fix = d.query?.searchinfo?.suggestion || null;
    const names = (d.query?.search || []).map((h) => String(h.title || '').replace(/\s*\([^)]*\)\s*$/, '').trim()).filter(Boolean);   // 'Jurassic Park (film)'
    return { fix, names };
  } catch { return { fix: null, names: [] }; }
}

// body: the plain answer ({ results: [...] }); q: what was typed; ask(query): the same search for another query, shaped
// the same way (null if it failed). Returns the body, with better answers first and fixed: what it searched for instead.
export async function smarter(body, q, ask, fetcher = fetch) {
  const name = (x) => x.title || x.name || '', list = body?.results || [];
  if (list.some((x) => fits(name(x), q) === 1)) return body;   // it already found what you typed
  const qw = words(q), need = qw.length > 1 ? (qw.length - 1) / qw.length : 1;   // one word in three may be quite wrong
  const wiki = await wikiGuess(q, fetcher);
  const tries = [];   // [query, how close an answer must be]
  for (const g of [wiki.fix, ...wiki.names].filter(Boolean)) if (fold(g) !== fold(q) && !tries.some(([t]) => fold(t) === fold(g))) tries.push([g, need]);
  if (qw.length > 1) for (const w of qw.filter((w) => w.length > 3).sort((a, b) => b.length - a.length).slice(0, 2)) tries.push([w, 1]);   // the longer words alone
  if (!tries.length) return body;
  const answers = await Promise.all(tries.slice(0, 5).map(([t]) => ask(t).catch(() => null)));
  const seen = new Set(), found = [];
  answers.forEach((a, n) => (a?.results || []).forEach((x, i) => {
    const f = fits(name(x), q);
    if (f >= tries[n][1] && f > 0 && !seen.has(x.k)) { seen.add(x.k); found.push([x, f, n, i]); }
  }));
  if (!found.length) return body;
  found.sort((a, b) => b[1] - a[1] || a[2] - b[2] || a[3] - b[3]);
  const best = found.map(([x]) => x), keep = best.concat(list.filter((x) => !seen.has(x.k))).slice(0, Math.max(20, list.length));
  const cap = (t) => t.replace(/\S+/g, (w, at) => (at && STOP.has(w.toLowerCase()) ? w : w[0].toUpperCase() + w.slice(1)));   // 'jurassic park' → 'Jurassic Park'
  const fixed = wiki.fix && found.some(([, , n]) => fold(tries[n][0]) === fold(wiki.fix)) ? cap(wiki.fix) : name(best[0]);
  return { ...body, results: keep, fixed };
}
