import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const files = ['app.js', 'generated/cube-data.js'];

for (const relativePath of files) {
  const expected = await readFile(resolve('build/web-check', relativePath));
  const committed = await readFile(resolve('web/dist', relativePath));
  if (!expected.equals(committed)) {
    throw new Error(
      `web/dist/${relativePath} is stale; run "npm run build" and commit the result.`,
    );
  }
}

console.log('Compiled browser JavaScript is current.');
