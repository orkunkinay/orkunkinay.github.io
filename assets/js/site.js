import { mountShell } from './shell.js';
import { init } from './views.js';

if (new URLSearchParams(location.search).has('empty')) {
  document.documentElement.classList.add('show-empty');
}

mountShell();
init();
