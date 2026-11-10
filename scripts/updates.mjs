// The Update centre's list (site/updates.json): every release, newest first.
// Runs on every build (update.yml), so a new version shows up by itself: any version in the git history that isn't in the
// file yet is added from its commits. The subject gives the title ("2.59.0: what changed"), lines starting "- " in the
// body give the changes, and any other paragraph becomes the notes. Entries already in the file are never touched, so
// one can be edited by hand at any time (title, changes, notes) and stays as written.
//   node scripts/updates.mjs                 add what's missing, from this repository's history
//   node scripts/updates.mjs --git <dir>     the same, from another copy's history (used once, to bring in the old account's)
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const FILE = new URL('../site/updates.json', import.meta.url);
const gitDir = process.argv.includes('--git') ? process.argv[process.argv.indexOf('--git') + 1] : new URL('..', import.meta.url).pathname;

const VER = /^(?:Tenner\s+)?(\d+\.\d+\.\d+)\b[:\s]*/i;           // "2.58.2: …", "Tenner 1.1.0: …", "1.12.0 Apple …"
const TAIL = /\((?:v?)(\d+\.\d+\.\d+)\)/;                         // "… (2.50.3)"
const SKIP = /^(Temporary|Create |Merge |Revert )/i;              // never shown: probes, repo housekeeping
const TRAILER = /^(Co-Authored-By|Co-authored-by|Claude-Session|Signed-off-by):|^-{3,}$/i;
const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; };
const tidy = (s) => { s = s.replace(/\s*\(#\d+\)\s*$/, '').replace(/\s+/g, ' ').trim(); return s && s[0].toUpperCase() + s.slice(1); };

let list = [];
try { list = JSON.parse(readFileSync(FILE, 'utf8')); } catch { /* no file yet: start one */ }
const have = new Set(list.map((u) => u.version));

let log = '';
try { log = execFileSync('git', ['-C', gitDir, 'log', '--reverse', '--date=short', '--format=%ad%x1f%s%x1f%b%x1e'], { encoding: 'utf8', maxBuffer: 64 << 20 }); }
catch { console.log('updates: no git history here, so the list is left as it is'); process.exit(0); }

// oldest first: each versioned commit starts (or adds to) its version; commits without a version belong to the one before
const found = new Map();
let cur = null;
for (const rec of log.split('\x1e')) {
  const [date, subject = '', body = ''] = rec.replace(/^\n/, '').split('\x1f');
  if (!date || SKIP.test(subject)) continue;
  let v = (subject.match(VER) || subject.match(TAIL) || [])[1];
  let title = tidy((v ? subject.replace(VER, '').replace(TAIL, '') : subject).replace(/^[/:\s]+/, ''));
  if (!v && !cur) { v = '1.0.0'; title = 'The first Tenner'; }          // before version numbers began
  if (!v) v = cur;
  cur = cmp(v, cur || '0.0.0') > 0 ? v : cur;
  let u = found.get(v);
  if (!u) { u = { version: v, date, title, changes: [], notes: '' }; found.set(v, u); }
  else if (title && title !== u.title) u.changes.push(title);
  // the body: "- " lines (and their indented follow-on lines) are changes, "* x.y.z: …" (squashed commits) too; other prose is notes
  let last = null; const notes = [];
  for (const line of body.split('\n')) {
    if (!line.trim() || TRAILER.test(line.trim())) { last = null; continue; }
    const bullet = line.match(/^\s*[-•]\s+(.*)/), squashed = line.match(/^\*\s+(.*)/);
    if (bullet) { last = u.changes.push(tidy(bullet[1])) - 1; continue; }
    if (squashed) { const t = tidy(squashed[1].replace(VER, '')); if (t !== u.title) u.changes.push(t); last = null; continue; }
    if (last != null && /^\s{2,}/.test(line)) { u.changes[last] = tidy(`${u.changes[last]} ${line}`); continue; }
    notes.push(line.trim());
  }
  if (notes.length) u.notes = tidy(`${u.notes} ${notes.join(' ')}`);
}

let added = 0;
for (const u of found.values()) {
  if (have.has(u.version)) continue;
  u.changes = [...new Set(u.changes.filter((c) => c && c !== u.title))];
  list.push(u); added++;
}
list.sort((a, b) => cmp(b.version, a.version));
writeFileSync(FILE, `${JSON.stringify(list, null, 1)}\n`);
console.log(`updates: ${added} new, ${list.length} in all`);
