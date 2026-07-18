import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const files = [
  'app.js',
  'backend-client.js',
  'camera-controller.js',
  'cube-renderer.js',
  'dom.js',
  'move-utils.js',
  'timeline-view.js',
  'generated/cube-data.js',
];

for (const relativePath of files) {
  const expected = await readFile(resolve('build/web-check', relativePath));
  const committed = await readFile(resolve('web/dist', relativePath));
  if (!expected.equals(committed)) {
    throw new Error(
      `web/dist/${relativePath} is stale; run "npm run build" and commit the result.`,
    );
  }
}

const styleFiles = [
  'foundation.css',
  'cube-stage.css',
  'app-shell.css',
  'api-guide.css',
  'move-controls.css',
  'dialogs.css',
  'responsive.css',
];
const expectedStyleEntry = styleFiles
  .map((file) => `@import url('./styles/${file}');`)
  .join('\n') + '\n';
const styleEntry = await readFile(resolve('web/styles.css'), 'utf8');
if (styleEntry !== expectedStyleEntry) {
  throw new Error('web/styles.css must import each ordered CSS module exactly once.');
}
for (const file of styleFiles) {
  const contents = await readFile(resolve('web/styles', file), 'utf8');
  if (!contents.trim()) throw new Error(`web/styles/${file} cannot be empty.`);
}

console.log('Compiled browser JavaScript and modular styles are current.');
