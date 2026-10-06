import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(new URL('../../../telegram-bot/webapp/package.json', import.meta.url));
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const lucide = require('lucide-react');
const directory = fileURLToPath(new URL('../../../telegram-bot/webapp/public/assets/pureplay/home-reference-v1/icons/', import.meta.url));
mkdirSync(directory, { recursive: true });
const names = { 'book-open': 'BookOpen', streak: 'Flame', accuracy: 'Target', tests: 'NotepadText', sound: 'Volume2', 'arrow-right': 'ArrowRight', help: 'CircleHelp' };
for (const [filename, component] of Object.entries(names)) {
  if (!lucide[component]) throw new Error('Missing icon: ' + component);
  const svg = renderToStaticMarkup(React.createElement(lucide[component], { size: 32, strokeWidth: 1.8, color: 'currentColor', 'aria-hidden': true }));
  writeFileSync(directory + filename + '.svg', svg + '\n', 'utf8');
}
writeFileSync(directory + 'progress.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="2 37 10 23 17 29 24 14 31 18 39 3"/></svg>\n', 'utf8');
console.log('Exported 7 Lucide icons and reference progress polyline.');
