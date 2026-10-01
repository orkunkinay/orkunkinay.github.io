/* Site chrome: header, navigation, theme toggle, footer. Rendered once, shared by every page. */

import { esc } from './render.js';

const NAV = [
  ['Projects', '/projects/'],
  ['Research', '/research/'],
  ['Writing', '/writing/'],
  ['Archive', '/archive/'],
  ['About', '/about/'],
];

const REPO = 'https://github.com/orkunkinay/orkunkinay.github.io';

function navLink([label, href], extra = '') {
  const path = location.pathname;
  const current = path === href ? ' aria-current="page"' : path.startsWith(href) ? ' aria-current="true"' : '';
  return `<a href="${href}"${current}>${esc(label)}${extra}</a>`;
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('theme', theme); } catch (e) { /* storage unavailable: theme still applies for this page */ }
  const color = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}

export function mountShell() {
  const header = document.getElementById('site-header');
  if (header) {
    header.innerHTML = `<div class="wrap site-header__inner">
      <a class="wordmark" href="/" aria-label="Orkun Kınay, home">Orkun Kınay</a>
      <nav class="nav" aria-label="Main">
        ${NAV.map((n) => navLink(n)).join('')}
        ${navLink(['Search', '/search/'], '<kbd aria-hidden="true">/</kbd>')}
        <button class="theme-toggle" type="button" aria-pressed="false"><span class="theme-toggle__icon" aria-hidden="true"></span>Dark</button>
      </nav>
    </div>`;

    const button = header.querySelector('.theme-toggle');
    const sync = () => button.setAttribute('aria-pressed', String(document.documentElement.dataset.theme === 'dark'));
    sync();
    button.addEventListener('click', () => {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
      sync();
    });
  }

  const footer = document.getElementById('site-footer');
  if (footer) {
    footer.innerHTML = `<div class="wrap"><hr class="rule"><div class="site-footer__inner">
      <p>© ${new Date().getFullYear()} Orkun Kınay</p>
      <ul>
        <li><a href="/feed.xml">RSS</a></li>
        <li><a href="/tags/">Tags</a></li>
        <li><a href="${REPO}">Source</a></li>
      </ul>
    </div></div>`;
  }

  /* "/" jumps to search, unless the user is typing somewhere. */
  addEventListener('keydown', (ev) => {
    if (ev.key !== '/' || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.target.closest('input, textarea, select, [contenteditable]')) return;
    ev.preventDefault();
    const field = document.querySelector('[data-search] input');
    if (field) field.focus();
    else location.assign('/search/');
  });
}
