// Tenner concepts: one shared data layer for every concept, so each design only draws.
// Reads the same data files as tenner.stream (../../data/*.json beside the live site), so on the preview Worker the
// concepts show the real charts and artwork; with the sample data in git they fall back to drawn artwork.
const DATA = new URL('../../data/', import.meta.url);

export const SERVICES = [
  { key: 'netflix', label: 'Netflix', short: 'N', color: '#e50914' },
  { key: 'disney', label: 'Disney+', short: 'D+', color: '#1f6bff' },
  { key: 'prime', label: 'Prime Video', short: 'P', color: '#00a8e1' },
  { key: 'hbomax', label: 'HBO Max', short: 'M', color: '#7b3fe4' },
  { key: 'paramount', label: 'Paramount+', short: 'P+', color: '#0064ff' },
  { key: 'appletv', label: 'Apple TV', short: 'tv', color: '#8e8e93' },
  { key: 'free', label: 'Free to watch', short: 'Free', color: '#30d158' },
];
export const svc = (k) => SERVICES.find((s) => s.key === k) || { key: k, label: k, short: '?', color: '#888' };

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const hue = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; };
export const keyOf = (x) => (x.type === 'tv' ? 't' : 'm') + x.id;
export const typeWord = (t) => (t === 'tv' ? 'Series' : 'Film');

const get = (f) => fetch(new URL(f + '.json', DATA)).then((r) => (r.ok ? r.json() : null)).catch(() => null);

let cache;
export function load() {
  return (cache ||= Promise.all(['trending', 'browse', 'new', 'week', 'cinema', 'titles'].map(get)).then(([trending, browse, fresh, week, cinema, titles]) => {
    const all = new Map();
    const add = (x, extra = {}) => {
      if (!x) return null;
      const k = keyOf(x), had = all.get(k);
      const it = Object.assign(had || { k, id: x.id, type: x.type, title: x.title, year: x.year, overview: x.overview, rating: x.rating, poster: x.poster, backdrop: x.backdrop, on: new Set() }, extra);
      (x.on || []).forEach((s) => it.on.add(s));
      if (!had) all.set(k, it);
      return it;
    };
    const charts = { all: { tv: [], movie: [] } };
    for (const t of ['tv', 'movie']) charts.all[t] = (trending?.overall?.[t] || []).map((x, i) => Object.assign(add(x), { rank: i + 1, mv: x.mv }));
    for (const s of trending?.services || []) {
      charts[s.key] = {};
      for (const t of ['tv', 'movie']) charts[s.key][t] = (s[t] || []).map((x, i) => { const it = add(x); it.on.add(s.key); return { ...it, rank: i + 1, mv: x.mv, on: it.on }; });
    }
    const img = browse?.img || 'https://image.tmdb.org/t/p/w342';
    const catalogue = (browse?.items || []).map((b) => {
      const it = add({ id: b.i, type: b.t, title: b.n, year: +(b.d || '').slice(0, 4) || null, rating: b.r, poster: b.img ? img + b.img : null });
      (b.s || []).forEach((s) => it.on.add(s));
      it.genres = (b.g || []).map((g) => browse.genres[g]).filter(Boolean);
      it.date = b.d; it.pop = b.p;
      return it;
    });
    const details = titles?.items || {};
    const providers = titles?.providers || {};
    return {
      generatedAt: trending?.generatedAt, sample: !!trending?.sample, charts, catalogue, all,
      genres: [...new Set(Object.values(browse?.genres || {}))],
      fresh: (fresh?.items || []).map((x) => ({ ...x, svc: svc(x.service) })),
      leaving: (fresh?.leaving || []).map((x) => ({ ...x, svc: svc(x.service) })),
      climbers: (week?.climbers || []).map((c) => ({ ...c, item: all.get(c.k) || week.items?.[c.k], svc: svc(c.c.split(':')[0]) })).filter((c) => c.item),
      cinema: cinema || { now: [], soon: [] },
      detail(k) {
        const it = all.get(k), d = details[k] || {};
        if (!it) return null;
        const names = (ids) => (ids || []).map((i) => providers[i]?.[0]).filter(Boolean);
        return { ...it, on: [...it.on], runtime: d.rt, seasons: d.se, cert: d.c, genres: d.g || it.genres || [], tagline: d.tl,
          stream: names(d.f), rent: names(d.re), buy: names(d.bu), next: d.nx, rankIn: rankings(charts, k) };
      },
      search(q) {
        q = q.trim().toLowerCase();
        if (!q) return [];
        return [...all.values()].map((x) => ({ x, i: x.title.toLowerCase().indexOf(q) })).filter((r) => r.i >= 0)
          .sort((a, b) => (a.i - b.i) || ((b.x.rating || 0) - (a.x.rating || 0))).slice(0, 24).map((r) => r.x);
      },
    };
  }));
}

function rankings(charts, k) {
  const out = [];
  for (const [s, c] of Object.entries(charts)) for (const t of ['tv', 'movie']) { const hit = c[t]?.find((x) => x.k === k); if (hit) out.push({ svc: s === 'all' ? { key: 'all', label: 'the UK' } : svc(s), rank: hit.rank }); }
  return out.sort((a, b) => a.rank - b.rank);
}

// Drawn artwork keeps to clean hues (blues, violets, pinks, reds, teals): never muddy greens or browns.
const TINTS = [250, 275, 300, 325, 350, 15, 200, 225, 185, 340];
// Poster art: the real poster when there is one, otherwise a drawn one in the title's own colour.
export function art(x, cls = 'art') {
  const h = TINTS[hue(x.title || '') % TINTS.length];
  if (x.poster) return `<img class="${cls}" src="${esc(x.poster)}" alt="" loading="lazy" decoding="async" style="--h:${h}">`;
  return `<span class="${cls} ph" style="--h:${h};--h2:${(h + 40) % 360}" aria-hidden="true"><span>${esc(x.title)}</span></span>`;
}
export const wide = (x) => x.backdrop || x.poster || null;

// Preferences, kept per concept on this device only.
export function prefs(name) {
  const key = 'tenner-concept-' + name;
  let p = {};
  try { p = JSON.parse(localStorage.getItem(key)) || {}; } catch {}
  p = { theme: 'system', services: SERVICES.map((s) => s.key), kind: 'tv', watchlist: [], ...p };
  return {
    get: (k) => p[k],
    set(k, v) { p[k] = v; try { localStorage.setItem(key, JSON.stringify(p)); } catch {} },
  };
}
export function applyTheme(theme) {
  const r = document.documentElement;
  if (theme === 'system') r.removeAttribute('data-theme'); else r.dataset.theme = theme;
}

export const when = (d) => {
  const t = new Date(d + 'T12:00:00'), now = new Date(); now.setHours(12, 0, 0, 0);
  const n = Math.round((t - now) / 864e5);
  if (n === 0) return 'Today'; if (n === -1) return 'Yesterday'; if (n === 1) return 'Tomorrow';
  return t.toLocaleDateString('en-GB', { weekday: n > -7 && n < 7 ? 'long' : undefined, day: 'numeric', month: 'short' });
};
export const page = () => document.body.dataset.page;
export const qs = (k) => new URLSearchParams(location.search).get(k);
export const share = (x) => {
  const url = new URL('/?t=' + x.k, location.href).href;
  if (navigator.share) navigator.share({ title: x.title, url }).catch(() => {});
  else navigator.clipboard?.writeText(url);
};
// Haptic tick where the device offers it.
export const buzz = () => navigator.vibrate?.(8);

// One stroked icon set (24px grid, currentColor), so every concept's icons are crisp and labelled by their buttons.
const P = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  browse: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  chart: 'M5 20V10M12 20V4M19 20v-7',
  gear: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5 10 17 19 7',
  share: 'M12 3v12M7.5 7.5 12 3l4.5 4.5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
  play: 'M7 4.5v15l12-7.5z',
  x: 'M6 6l12 12M18 6 6 18',
  right: 'M9 5l7 7-7 7',
  left: 'M15 5l-7 7 7 7',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  ticket: 'M4 7a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2v-3a2 2 0 0 0 0-4z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  heart: 'M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z',
  key: 'M15 9a4 4 0 1 0-3.9 4.9L11 14l-2 2H7v2H5v2H3v-3l7.1-7.1A4 4 0 0 0 15 9zM16 7.5h.01',
};
export const icon = (n, size = 20) => `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[n]}"/></svg>`;
