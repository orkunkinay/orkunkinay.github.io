/* Markup builders. Each returns an HTML string; all data goes through esc(). */

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const LINK_LABELS = {
  paper: 'Paper', code: 'Code', repo: 'Repository', pypi: 'PyPI',
  demo: 'Demo', slides: 'Slides', poster: 'Poster', bibtex: 'BibTeX',
};

export const pad = (n) => String(n).padStart(2, '0');

export const kindLabel = (data, kind) =>
  `<span class="kind" data-kind="${esc(kind)}">${esc(data.kinds[kind] ?? kind)}</span>`;

export const tagList = (tags) =>
  tags.length
    ? `<div class="tags">${tags.map((t) => `<a class="tag" href="/tags/?t=${encodeURIComponent(t)}">${esc(t)}</a>`).join('')}</div>`
    : '';

export function linkList(links) {
  const items = Object.entries(links).filter(([, url]) => url);
  if (!items.length) return '';
  return `<div class="links">${items
    .map(([key, url]) => `<a href="${esc(url)}">${esc(LINK_LABELS[key] ?? key)}</a>`)
    .join('')}</div>`;
}

const figure = (e, n) =>
  e.image
    ? `<figure class="fig"><img src="${esc(e.image.src)}" alt="${esc(e.image.alt)}" loading="lazy"></figure>`
    : `<figure class="fig" aria-hidden="true"><span>fig. ${pad(n)} · pending</span></figure>`;

/* Numbered project entry. `feature` entries are sparse and carry a figure. */
export function projectEntry(data, e, n, { feature = false } = {}) {
  const meta = [kindLabel(data, e.kind), e.year && `<span>${e.year}</span>`, e.stat && `<span class="stat">${esc(e.stat)}</span>`]
    .filter(Boolean).join('');
  return `<li class="entry${feature ? ' entry--feature' : ''}">
    <span class="entry__no">${pad(n)}</span>
    <div class="entry__body">
      <h3 class="entry__title"><a href="${e.url}">${esc(e.title)}<span aria-hidden="true">→</span></a></h3>
      <p class="entry__summary">${esc(e.summary)}</p>
      ${tagList(e.tags)}
    </div>
    <p class="entry__meta">${meta}</p>
    ${feature ? figure(e, n) : ''}
  </li>`;
}

/* Publication: bibliographic, venue first. */
export function publication(e) {
  return `<li class="pub">
    <p class="pub__venue">${esc(e.venueShort ?? e.venue)}</p>
    <h3 class="pub__title"><a href="${e.url}">${esc(e.title)}</a></h3>
    <p class="pub__authors${e.authors ? '' : ' faint'}">${e.authors ? esc(e.authors.join(', ')) : 'Authors to be added'}</p>
    ${linkList(e.links)}
  </li>`;
}

/* Writing and archive rows. */
export function row(data, e, { when, showKind = false } = {}) {
  const draft = e.status === 'draft';
  const title = draft ? esc(e.title) : `<a href="${e.url}">${esc(e.title)}</a>`;
  return `<li class="row${draft ? ' row--draft' : ''}">
    <span class="row__when">${when ?? ''}</span>
    <span class="row__title">${title}</span>
    ${e.summary && !draft ? `<span class="row__summary">${esc(e.summary)}</span>` : ''}
    ${showKind || e.tags.length ? `<span class="row__sub">${showKind ? kindLabel(data, e.kind) : ''}${e.year && showKind ? `<span>${e.year}</span>` : ''}${e.tags.map((t) => `<a class="tag" href="/tags/?t=${encodeURIComponent(t)}">${esc(t)}</a>`).join('')}</span>` : ''}
  </li>`;
}

