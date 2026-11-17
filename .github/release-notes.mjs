// The daily release's version and Update centre entry, from the commits since the last release.
//   node .github/release-notes.mjs <current version> <YYYY-MM-DD> <log file>
// The log holds "subject \x1f body \x1e" records. A commit whose subject starts "Feature:" is a major new feature: its
// title and "- " lines are listed (anything else that day is a fix, covered by the standard lines the page adds).
// Prints the new version, then the release commit message; also adds the entry to site/updates.json.
import { readFileSync, writeFileSync } from 'node:fs';

const [cur, day, file] = process.argv.slice(2);
const feats = [];
for (const rec of readFileSync(file, 'utf8').split('\x1e')) {
  const [subject = '', body = ''] = rec.replace(/^\n/, '').split('\x1f');
  const m = subject.match(/^\s*Feature:\s*(.+)/i);
  if (!m) continue;
  const lines = body.split('\n').map((l) => l.match(/^\s*[-•]\s+(.*)/)?.[1]?.trim()).filter(Boolean);
  feats.push({ title: m[1].trim(), lines });
}
const [a, b, c] = cur.split('.').map(Number);
const version = feats.length ? `${a}.${b + 1}.0` : `${a}.${b}.${c + 1}`;
const title = feats.length ? feats.map((f) => f.title).join(', ') : 'Bug fixes and improvements';
const changes = [...new Set(feats.flatMap((f) => (f.lines.length ? f.lines : [f.title])))];

const FILE = new URL('../site/updates.json', import.meta.url);
let list = [];
try { list = JSON.parse(readFileSync(FILE, 'utf8')); } catch { /* start a new list */ }
list = list.filter((u) => u.version !== version);
list.unshift({ version, date: day, title, changes, notes: '' });
writeFileSync(FILE, `${JSON.stringify(list, null, 1)}\n`);

console.log(version);
console.log(`${version}: ${title}`);
if (changes.length) console.log(`\n${changes.map((l) => `- ${l}`).join('\n')}`);
