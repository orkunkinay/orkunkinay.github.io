#!/usr/bin/env node
/* Maintenance script. Node built-ins only; the site itself needs no build step.

   node scripts/site.mjs new project <slug> "Title"     scaffold a project page (+ data entry)
   node scripts/site.mjs new research <slug> "Title"    scaffold a publication page
   node scripts/site.mjs new post <slug> "Title"        scaffold an article page (as a draft)
   node scripts/site.mjs build                          regenerate sitemap.xml and feed.xml
   node scripts/site.mjs check                          validate pages, data and internal links
*/

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = join(root, 'data/content.json');
const readData = () => JSON.parse(readFileSync(dataPath, 'utf8'));
const write = (path, text) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); };

const TYPES = {
  project: { collection: 'projects', template: 'project.html', ogtype: 'website', kind: 'systems', status: 'placeholder' },
  research: { collection: 'research', template: 'publication.html', ogtype: 'article', kind: 'research', status: 'placeholder' },
  post: { collection: 'writing', template: 'post.html', ogtype: 'article', kind: 'writing', status: 'draft' },
};

const STATIC_PAGES = ['/', '/projects/', '/research/', '/writing/', '/archive/', '/about/', '/tags/'];

const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const escXml = escHtml;
const isPublic = (e) => e.status !== 'draft';

function scaffold(type, slug, title) {
  const t = TYPES[type];
  if (!t || !slug || !title) die('usage: new <project|research|post> <slug> "Title"');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) die('slug must be lowercase letters, digits and hyphens');

  const data = readData();
  let entry = data.entries.find((e) => e.collection === t.collection && e.slug === slug);
  if (!entry) {
    entry = { collection: t.collection, slug, title, kind: t.kind, year: new Date().getFullYear(), status: t.status, summary: null, tags: [], links: {} };
    if (type === 'post') { delete entry.year; entry.date = null; }
    if (type === 'research') Object.assign(entry, { venue: null, venueShort: null, authors: null });
    data.entries.push(entry);
    write(dataPath, JSON.stringify(data, null, 2) + '\n');
    console.log(`added entry to data/content.json: ${t.collection}/${slug}`);
  }

  const page = join(root, t.collection, slug, 'index.html');
  if (existsSync(page)) die(`${relative(root, page)} already exists`);

  const values = {
    title: escHtml(entry.title),
    title_json: JSON.stringify(entry.title).slice(1, -1).replace(/</g, '\\u003c'),
    description: escHtml(entry.summary ?? ''),
    url: `/${t.collection}/${slug}/`,
    id: `${t.collection}/${slug}`,
    ogtype: t.ogtype,
    date: entry.date ?? '',
  };
  const html = readFileSync(join(root, 'templates', t.template), 'utf8')
    .replace(/\{\{(\w+)\}\}/g, (_, k) => values[k] ?? '');
  write(page, html);
  console.log(`created ${relative(root, page)}`);
}

function build() {
  const data = readData();
  const base = data.site.url;
  const entries = data.entries.filter(isPublic);

  const urls = [...STATIC_PAGES, ...entries.map((e) => `/${e.collection}/${e.slug}/`)];
  write(join(root, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n')}\n</urlset>\n`);

  const posts = entries.filter((e) => e.collection === 'writing' && e.date).sort((a, b) => b.date.localeCompare(a.date));
  const items = posts.map((p) => `    <item>
      <title>${escXml(p.title)}</title>
      <link>${base}/writing/${p.slug}/</link>
      <guid isPermaLink="true">${base}/writing/${p.slug}/</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>${p.summary ? `\n      <description>${escXml(p.summary)}</description>` : ''}
    </item>`).join('\n');
  write(join(root, 'feed.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>${escXml(data.site.title)}</title>\n    <link>${base}/writing/</link>\n    <description>Technical writing by ${escXml(data.site.title)}</description>\n    <language>en</language>\n    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml"/>${posts[0] ? `\n    <lastBuildDate>${new Date(posts[0].date).toUTCString()}</lastBuildDate>` : ''}${items ? '\n' + items : ''}\n  </channel>\n</rss>\n`);
  console.log(`sitemap.xml: ${urls.length} urls · feed.xml: ${posts.length} posts`);
}

function htmlFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (['.git', 'node_modules', 'templates', '_site', '.github'].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) htmlFiles(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

function check() {
  const data = readData();
  const problems = [];
  const seen = new Set();

  for (const e of data.entries) {
    const id = `${e.collection}/${e.slug}`;
    if (seen.has(id)) problems.push(`duplicate entry ${id}`);
    seen.add(id);
    if (!data.kinds[e.kind]) problems.push(`${id}: unknown kind "${e.kind}"`);
    if (e.collection === 'writing' && e.status === 'published' && !e.date) problems.push(`${id}: published post needs a date`);
    if (!isPublic(e)) continue;
    const file = join(root, id, 'index.html');
    if (!existsSync(file)) { problems.push(`${id}: missing page ${relative(root, file)}`); continue; }
    const html = readFileSync(file, 'utf8');
    if (!html.includes(`data-entry="${id}"`)) problems.push(`${id}: page has no matching data-entry`);
    if (!html.includes(`href="${data.site.url}/${id}/"`)) problems.push(`${id}: canonical URL does not match`);
  }

  for (const file of htmlFiles(root)) {
    const html = readFileSync(file, 'utf8');
    for (const [, href] of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
      const target = join(root, href.endsWith('/') ? join(href, 'index.html') : href);
      if (!existsSync(target)) problems.push(`${relative(root, file)}: broken link ${href}`);
    }
  }

  if (problems.length) { console.error(problems.map((p) => `✗ ${p}`).join('\n')); process.exit(1); }
  console.log(`ok · ${data.entries.length} entries, ${htmlFiles(root).length} pages`);
}

function die(msg) { console.error(msg); process.exit(1); }

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'new') scaffold(...args);
else if (cmd === 'build') build();
else if (cmd === 'check') check();
else die(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace('#!/usr/bin/env node\n/*', '').trim());
