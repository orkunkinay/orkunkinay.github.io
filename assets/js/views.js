/* Page behaviours, switched on by data attributes in the HTML.
   [data-list]      project / research / writing / drafts / archive lists
   [data-tags]      tag index and per-tag listing (?t=tag)
   [data-search]    client-side search (?q=query)
   [data-entry]     entry pages: meta strip, links, pager
   [data-interests] [data-links]   small lists from content.json
   [data-toc]       table of contents built from headings in [data-toc-source] */

import { load, projects, inCollection, posts, drafts, everything, tagCounts, sortKey } from './data.js';
import { esc, row, projectEntry, publication, kindLabel, tagList, linkList } from './render.js';

const $$ = (sel) => [...document.querySelectorAll(sel)];

export async function init() {
  buildToc();
  const needsData = document.querySelector('[data-list],[data-tags],[data-search],[data-entry],[data-interests],[data-links]');
  if (!needsData) return;
  try {
    const data = await load();
    $$('[data-list]').forEach((el) => renderList(data, el));
    $$('[data-interests]').forEach((el) => renderInterests(data, el));
    $$('[data-links]').forEach((el) => renderLinks(data, el));
    $$('[data-tags]').forEach((el) => renderTags(data, el));
    $$('[data-search]').forEach((el) => renderSearch(data, el));
    $$('[data-entry]').forEach((el) => renderEntry(data, el));
    buildToc();
  } catch (err) {
    console.error(err);
    $$('[data-list],[data-tags],[data-search]').forEach((el) => {
      el.innerHTML = '<p class="empty">Could not load content. If you opened this file directly, serve the folder over HTTP instead (see the README).</p>';
    });
  }
}

/* ---- lists ---------------------------------------------------------------- */

function renderList(data, el) {
  const { list, variant, limit, featured, empty } = el.dataset;
  let html = '';
  let count = 0;

  if (list === 'projects') {
    let items = projects(data);
    if (featured !== undefined) items = items.filter((e) => e.featured);
    if (limit) items = items.slice(0, Number(limit));
    count = items.length;
    html = `<ol class="entries">${items.map((e, i) => projectEntry(data, e, i + 1, { feature: variant !== 'compact' && e.feature })).join('')}</ol>`;
  } else if (list === 'research') {
    let items = inCollection(data, 'research');
    if (featured !== undefined) items = items.filter((e) => e.featured);
    if (limit) items = items.slice(0, Number(limit));
    count = items.length;
    html = `<ol>${items.map(publication).join('')}</ol>`;
  } else if (list === 'writing') {
    let items = posts(data);
    if (limit) items = items.slice(0, Number(limit));
    count = items.length;
    html = `<ol>${items.map((e) => row(data, e, { when: e.date })).join('')}</ol>`;
  } else if (list === 'drafts') {
    const items = drafts(data);
    count = items.length;
    html = `<ol>${items.map((e) => row(data, e, { when: 'draft' })).join('')}</ol>`;
  } else if (list === 'archive') {
    const items = everything(data).sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
    count = items.length;
    html = groupByYear(data, items);
  }

  el.innerHTML = count ? html : `<p class="empty">${empty ?? 'Nothing here yet.'}</p>`;
}

function groupByYear(data, items) {
  const groups = new Map();
  for (const e of items) {
    const year = sortKey(e).slice(0, 4) || 'Undated';
    groups.set(year, [...(groups.get(year) ?? []), e]);
  }
  /* Entries without a year sort last, under a plain label. */
  return [...groups]
    .map(([year, list]) => `<h2 class="year-head">${year}</h2>${list.map((e) => row(data, e, { when: e.date ?? '', showKind: true })).join('')}`)
    .join('');
}

function renderInterests(data, el) {
  el.innerHTML = data.interests
    .map((i) => `<li><a href="/tags/?t=${encodeURIComponent(i.tag)}">${esc(i.label)}</a></li>`)
    .join('');
}

function renderLinks(data, el) {
  el.innerHTML = data.links
    .map((l) => (l.url
      ? `<a href="${esc(l.url)}">${esc(l.label)} ↗</a>`
      : `<span class="pending" title="Link to be added">${esc(l.label)}</span>`))
    .join('');
}

/* ---- tags ------------------------------------------------------------------ */

function renderTags(data, el) {
  const tag = new URLSearchParams(location.search).get('t');
  const title = document.querySelector('[data-tags-title]');
  const lede = document.querySelector('[data-tags-lede]');

  if (!tag) {
    el.innerHTML = `<div class="tag-index">${tagCounts(data)
      .map(([t, n]) => `<a href="/tags/?t=${encodeURIComponent(t)}">${esc(t)}<span>${n}</span></a>`).join('')}</div>`;
    return;
  }

  const items = everything(data).filter((e) => e.tags.includes(tag)).sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  document.title = `#${tag} · Tags · Orkun Kınay`;
  if (title) title.textContent = `#${tag}`;
  if (lede) lede.innerHTML = `${items.length} ${items.length === 1 ? 'entry' : 'entries'} · <a href="/tags/">all tags</a>`;
  el.innerHTML = items.length
    ? `<ol>${items.map((e) => row(data, e, { when: e.date ?? e.year ?? '', showKind: true })).join('')}</ol>`
    : '<p class="empty">Nothing is tagged this way yet.</p>';
}

/* ---- search ---------------------------------------------------------------- */

const tokens = (s) => (s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);

function renderSearch(data, el) {
  const input = el.querySelector('input');
  const out = el.querySelector('[data-search-results]');
  const count = el.querySelector('[data-search-count]');
  const index = everything(data).map((e) => ({
    e,
    title: e.title.toLowerCase(),
    tags: e.tags.join(' ').toLowerCase(),
    rest: [e.summary, e.venue, e.kind, e.year].filter(Boolean).join(' ').toLowerCase(),
  }));

  const run = () => {
    const terms = tokens(input.value);
    if (!terms.length) {
      out.innerHTML = '';
      count.textContent = `${index.length} entries indexed`;
      return;
    }
    const hits = index
      .map((x) => {
        let score = 0;
        for (const t of terms) {
          const s = (x.title.includes(t) ? 3 : 0) + (x.tags.includes(t) ? 2 : 0) + (x.rest.includes(t) ? 1 : 0);
          if (!s) return null;
          score += s;
        }
        return { e: x.e, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
    out.innerHTML = `<ol>${hits.map(({ e }) => row(data, e, { when: e.date ?? e.year ?? '', showKind: true })).join('')}</ol>`;
    count.textContent = `${hits.length} ${hits.length === 1 ? 'result' : 'results'}`;
  };

  input.value = new URLSearchParams(location.search).get('q') ?? '';
  input.addEventListener('input', () => {
    const url = new URL(location);
    input.value ? url.searchParams.set('q', input.value) : url.searchParams.delete('q');
    history.replaceState(null, '', url);
    run();
  });
  run();
}

/* ---- entry pages ---------------------------------------------------------------- */

function renderEntry(data, el) {
  const entry = data.entries.find((e) => e.id === el.dataset.entry);
  if (!entry) return;

  const meta = el.querySelector('[data-slot="meta"]');
  if (meta) {
    meta.innerHTML = [
      kindLabel(data, entry.kind),
      entry.date && `<span>${esc(entry.date)}</span>`,
      entry.year && `<span>${entry.year}</span>`,
      entry.venue && `<span>${esc(entry.venue)}</span>`,
      entry.stat && `<span class="stat">${esc(entry.stat)}</span>`,
      tagList(entry.tags),
    ].filter(Boolean).join('');
  }

  const authors = el.querySelector('[data-slot="authors"]');
  if (authors) {
    authors.textContent = entry.authors ? entry.authors.join(', ') : 'Authors to be added';
    authors.classList.toggle('faint', !entry.authors);
  }

  const links = el.querySelector('[data-slot="links"]');
  if (links) links.innerHTML = linkList(entry.links);

  const pager = el.querySelector('[data-slot="pager"]');
  if (pager) {
    const siblings = entry.collection === 'projects' ? projects(data)
      : entry.collection === 'writing' ? posts(data)
      : inCollection(data, entry.collection);
    const i = siblings.findIndex((e) => e.id === entry.id);
    const side = (e, cls, label) => (e ? `<a class="${cls}" href="${e.url}"><small>${label}</small>${esc(e.title)}</a>` : '');
    pager.innerHTML = side(siblings[i - 1], 'prev', '← Previous') + side(siblings[i + 1], 'next', 'Next →');
  }
}

/* ---- table of contents -------------------------------------------------------------- */

function buildToc() {
  const toc = document.querySelector('[data-toc]');
  const source = document.querySelector('[data-toc-source]');
  if (!toc || !source) return;
  const headings = [...source.querySelectorAll('h2')].filter((h) => h.offsetParent !== null);
  if (headings.length < 2) {
    toc.replaceChildren();
    return;
  }
  for (const h of headings) {
    const target = h.closest('section') ?? h;
    if (!target.id) target.id = tokens(h.textContent).join('-');
  }
  toc.innerHTML = `<p>Contents</p><ol>${headings
    .map((h) => `<li><a href="#${(h.closest('section') ?? h).id}">${esc(h.textContent)}</a></li>`).join('')}</ol>`;
}
