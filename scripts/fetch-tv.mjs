// Builds Tenner TV's listings (tv/public/data/): the main Freeview channels and the most popular Sky ones, a file per day
// for the week ahead. Freeview's come from the open Freeview XMLTV feed (github.com/dp247/Freeview-EPG, refreshed by its
// author twice a day); Sky's own (those in tv/channels.json with `sky` or `match`) from Sky's public TV guide, the one
// sky.com's guide reads. Run every three hours by .github/workflows/tv.yml before it deploys. If a source can't be read,
// the copy that's live now is carried over, so the guide never goes blank. Channel list and logos: tv/channels.json,
// tv/public/logos/.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), OUT = join(ROOT, 'tv', 'public', 'data');
const FEED = 'https://raw.githubusercontent.com/dp247/Freeview-EPG/master/epg.xml';
// Sky's guide: the channels on a London Sky box (bouquet 4101/1), then each day's schedule, up to 20 channels a request
const SKY = 'https://awk.epgsky.com/hawk/linear', SKY_REGION = '4101/1', SKY_HEAD = { 'x-skyott-territory': 'GB' };
const LIVE = 'https://tenner-tv.danseacroft.workers.dev';
const TZ = 'Europe/London';
const ukDay = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: TZ });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, tries = 3, headers = {}) {
  for (let i = 1; ; i++) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(60000), headers: { 'user-agent': 'TennerTV/1.0 (+https://tv.tenner.stream)', ...headers } }); if (r.ok) return r; throw new Error(`${r.status}`); }
    catch (e) { if (i >= tries) throw e; await sleep(3000 * i); }
  }
}
const unxml1 = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, '’');
const unxml = (s) => unxml1(unxml1(s || '')).replace(/\s+/g, ' ').replace(/&( &)+/g, '&').trim();   // twice: some text arrives encoded twice ("&amp;amp;")
// "20261024203500 +0100" → a time
const when = (s) => { const m = s.match(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)\s*([+-])(\d\d)(\d\d)$/); if (!m) return NaN;
  const [, y, mo, d, h, mi, se, sg, oh, om] = m; return Date.UTC(+y, mo - 1, +d, +h, +mi, +se) - (sg === '+' ? 1 : -1) * (oh * 3600e3 + om * 60e3); };

// sky: Sky's own channels' programmes, by channel name, as Sky's guide gives them (see skyGuide)
export function build(xml, channels, now = Date.now(), sky = {}) {
  const byId = new Map(channels.map((c, i) => [c.id, { ...c, k: i.toString(36) }])), days = new Map(), seen = new Set();
  const re = /<programme channel="([^"]+)" start="([^"]+)" stop="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/g;
  const from = now - 864e5, to = now + 8 * 864e5;
  const add = (c, item) => {
    if (seen.has(item.id)) return; seen.add(item.id);   // a feed sometimes lists a programme twice
    const d = ukDay(item.at);
    if (!days.has(d)) days.set(d, new Map());
    const day = days.get(d); if (!day.has(c.name)) day.set(c.name, []); day.get(c.name).push(item);
  };
  const trim = (desc) => (desc.length > 420 ? desc.slice(0, 400).replace(/\s+\S*$/, '') + '…' : desc);
  channels.forEach((c, i) => {
    for (const e of sky[c.name] || []) {
      const at = e.st * 1000, rt = Math.round((e.d || 0) / 60), t = unxml(e.t || '').replace(/^New:\s*/i, '');
      if (!t || !(rt > 0) || at + rt * 6e4 < from || at > to) continue;
      // Sky's synopses end with the episode and the access services ("(S2, ep 4) [AD,S]"), shown separately here
      const desc = unxml(e.sy || '').replace(/(\s*(\[[A-Z,]+\]|\((S\d+,? ?)?ep ?\d+\)|\(\d{4}\)))+$/i, '').replace(/^(New series|New|Series \d+)\.\s*/i, '').trim();
      const item = { id: `${i.toString(36)}.${Math.round(at / 6e4).toString(36)}`, t, at, rt };
      if (+e.seasonnumber > 0) item.s = +e.seasonnumber;
      if (+e.episodenumber > 0) item.n = +e.episodenumber;
      if (desc) item.sum = trim(desc);
      if (/^[0-9a-f-]{36}$/.test(e.programmeuuid || '')) item.sky = e.programmeuuid;
      if (e.new) item.isNew = true;
      add(c, item);
    }
  });
  for (const m of xml.matchAll(re)) {
    const c = byId.get(m[1]); if (!c) continue;
    const at = when(m[2]), end = when(m[3]); if (!(end > at) || end < from || at > to) continue;
    const body = m[4], tag = (t) => body.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1];
    const ep = body.match(/<episode-num system="onscreen">\s*(?:S(\d+))?\s*E(\d+)/i);
    // "New: The Voice UK" → "The Voice UK", marked new; a description's "6/8." (the episode, shown separately) goes
    const raw = unxml(tag('title')), t = raw.replace(/^New:\s*/i, ''); if (!t) continue;
    const desc = (unxml(tag('desc')) || '').replace(/^\d+\/\d+\.\s*/, '').replace(/^(New series|New|Series \d+)\.\s*/i, '');
    // compact: a short id (the channel, then the start in minutes), and only the fields a programme has. Sky's pictures
    // (nearly all of them) are kept as just their id; the page puts the address back together
    const item = { id: `${c.k}.${Math.round(at / 6e4).toString(36)}`, t, at, rt: Math.round((end - at) / 6e4) };
    if (ep?.[1]) item.s = +ep[1];
    if (ep?.[2]) item.n = +ep[2];
    if (desc) item.sum = trim(desc);
    const icon = body.match(/<icon src="(https:\/\/[^"]+)"/)?.[1], sky = icon?.match(/^https:\/\/images\.metadata\.sky\.com\/pd-image\/([0-9a-f-]{36})\/cover$/)?.[1];
    if (sky) item.sky = sky; else if (icon) item.wide = icon;
    if (/<premiere/.test(body) || /^New:/i.test(raw)) item.isNew = true;
    add(c, item);
  }
  const logos = Object.fromEntries(channels.map((c) => [c.name, c.logo]));
  const out = {};
  for (const [d, chans] of [...days].sort()) {
    out[d] = { date: d, source: 'freeview', logos,
      channels: channels.filter((c) => chans.has(c.name)).map((c) => ({ name: c.name, items: chans.get(c.name).sort((a, b) => a.at - b.at) })) };
  }
  return out;
}

// Sky's channels: which of Sky's services each one is (found by its name on a London Sky box, preferring HD; else the id
// it had when it was added, as Sky sometimes renames one for a promotion), then the week's schedules, a request a day
export function skyIds(channels, services) {
  const ids = {}, list = services || [];
  for (const c of channels) {
    if (!c.sky && !c.match) continue;
    const re = c.match && new RegExp(c.match, 'i'), hits = re ? list.filter((s) => re.test(String(s.t || '')) && !/uhd|\+1/i.test(s.t)) : [];
    const sid = (hits.find((s) => /hd/i.test(s.t)) || hits[0])?.sid ?? c.sky;
    if (sid) ids[c.name] = String(sid);
  }
  return ids;
}
export async function skyGuide(channels, now = Date.now(), fetchJSON = async (u) => (await get(u, 3, SKY_HEAD)).json()) {
  const services = (await fetchJSON(`${SKY}/services/${SKY_REGION}`).catch(() => null))?.services;
  const ids = skyIds(channels, services), names = Object.keys(ids), out = Object.fromEntries(names.map((n) => [n, []]));
  if (!names.length) return out;
  const bySid = new Map(names.map((n) => [ids[n], n])), sids = [...bySid.keys()], seen = new Set();
  let ok = 0;
  for (let d = -1; d <= 7; d++) {
    const day = new Date(now + d * 864e5).toISOString().slice(0, 10).replace(/-/g, '');
    for (let i = 0; i < sids.length; i += 20) {
      let j; try { j = await fetchJSON(`${SKY}/schedule/${day}/${sids.slice(i, i + 20).join(',')}`); } catch { continue; }
      ok++;
      for (const s of j?.schedule || []) for (const e of s.events || []) {
        const n = bySid.get(String(s.sid)), k = `${s.sid}:${e.eid ?? e.st}`;
        if (n && !seen.has(k)) { seen.add(k); out[n].push(e); }
      }
    }
  }
  if (!ok) throw new Error("Sky's guide didn't answer");
  return out;
}

// On TV this week, for tenner.stream's title sheets (onair.json): every title still to come, folded the way both pages
// fold names, with its next three showings as [channel, start, film, minutes]. A showing with no episode number that runs 75
// minutes or more counts as a film, so a film and a show of the same name don't get mixed up.
export const fold = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, ' ').trim().replace(/^the /, '');
export function onAir(days, now = Date.now()) {
  const all = new Map();
  for (const day of Object.values(days)) for (const c of day.channels) for (const x of c.items) {
    if (x.at + (x.rt || 30) * 6e4 <= now) continue;
    const k = fold(x.t); if (!k) continue;
    if (!all.has(k)) all.set(k, []);
    all.get(k).push([c.name, x.at, !x.s && !x.n && x.rt >= 75 ? 1 : 0, x.rt || 30]);
  }
  const titles = {};
  for (const [k, l] of all) titles[k] = l.sort((a, b) => a[1] - b[1]).slice(0, 3);
  return { generatedAt: new Date(now).toISOString(), titles };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const channels = JSON.parse(await readFile(join(ROOT, 'tv', 'channels.json'), 'utf8'));
  const skyNames = new Set(channels.filter((c) => c.sky || c.match).map((c) => c.name));
  await mkdir(OUT, { recursive: true });
  const write = async (name, obj) => writeFile(join(OUT, name), JSON.stringify(obj));
  try {
    const [xml, sky] = await Promise.all([get(FEED).then((r) => r.text()),
      skyGuide(channels).catch((e) => { console.log(`::warning title=Tenner TV listings::Sky's guide didn't load (${e.message}); keeping the live Sky channels`); return null; })]);
    const days = build(xml, channels, Date.now(), sky || {});
    const full = Object.values(days).filter((d) => d.channels.length >= 20);
    if (full.length < 5) throw new Error(`only ${full.length} full days in the feed`);
    // Sky's guide down: each day keeps the Sky channels from the copy that's live now
    if (!sky) for (const [d, v] of Object.entries(days)) {
      try {
        const live = await (await get(`${LIVE}/data/${d}.json`, 2)).json(), keep = new Map((live.channels || []).filter((c) => skyNames.has(c.name)).map((c) => [c.name, c]));
        if (keep.size) v.channels = channels.map((c) => v.channels.find((x) => x.name === c.name) || keep.get(c.name)).filter(Boolean);
      } catch {}
    }
    for (const [d, v] of Object.entries(days)) await write(`${d}.json`, v);
    await write('meta.json', { generatedAt: new Date().toISOString(), source: 'freeview', days: Object.keys(days) });
    await write('onair.json', onAir(days));
    const skyN = Object.values(days)[1]?.channels.filter((c) => skyNames.has(c.name)).length || 0;
    console.log(`Tenner TV: ${Object.keys(days).length} days, ${channels.length} channels (${skyN} of ${skyNames.size} Sky ones), ${Object.values(days).reduce((n, d) => n + d.channels.reduce((m, c) => m + c.items.length, 0), 0)} programmes`);
  } catch (err) {
    // carry the live listings over rather than going blank (the Worker falls back to TVmaze for anything missing)
    console.log(`::warning title=Tenner TV listings::the Freeview feed didn't load (${err.message}); keeping the live copy`);
    try {
      const meta = await (await get(`${LIVE}/data/meta.json`, 2)).json();
      for (const d of meta.days || []) { try { await write(`${d}.json`, await (await get(`${LIVE}/data/${d}.json`, 2)).json()); } catch {} }
      await write('meta.json', meta);
      try { await write('onair.json', await (await get(`${LIVE}/data/onair.json`, 2)).json()); } catch {}
    } catch { console.log('::warning title=Tenner TV listings::no live copy either; the guide uses TVmaze until the feed is back'); }
  }
}
