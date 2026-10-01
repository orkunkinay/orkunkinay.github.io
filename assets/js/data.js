/* Loads data/content.json once and exposes small query helpers. */

let pending;

export function load() {
  pending ??= fetch('/data/content.json')
    .then((r) => {
      if (!r.ok) throw new Error(`content.json: ${r.status}`);
      return r.json();
    })
    .then(prepare);
  return pending;
}

function prepare(data) {
  for (const e of data.entries) {
    e.id = `${e.collection}/${e.slug}`;
    e.url = `/${e.id}/`;
    e.tags ??= [];
    e.links ??= {};
  }
  return data;
}

/* Drafts are listed on /writing/ only. They have no page and are never indexed. */
export const isPublic = (e) => e.status !== 'draft';

export const inCollection = (data, name) =>
  data.entries.filter((e) => e.collection === name && isPublic(e));

/* A research entry can also appear in the project index via `inProjects`. */
export const projects = (data) =>
  data.entries.filter((e) => (e.collection === 'projects' || e.inProjects) && isPublic(e));

export const posts = (data) =>
  inCollection(data, 'writing').sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

export const drafts = (data) => data.entries.filter((e) => e.collection === 'writing' && !isPublic(e));

export const everything = (data) => data.entries.filter(isPublic);

export function tagCounts(data) {
  const counts = new Map();
  for (const e of everything(data)) for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export const sortKey = (e) => e.date ?? (e.year ? String(e.year) : '');
