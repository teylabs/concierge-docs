import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const origin = process.argv[2] || 'http://127.0.0.1:5299';
const index = await readFile('.vitepress/dist/llms.txt', 'utf8');
const response = await fetch(`${origin}/llms.txt`);
assert.equal(response.status, 200);
assert.equal(await response.text(), index);
const paths = [...index.matchAll(/https:\/\/concierge.teylabs.com(\/[^)]+\.md)\)/g)].map((m) => m[1]);
assert.ok(paths.length > 0);
for (const path of paths) {
  const page = await fetch(origin + path);
  assert.equal(page.status, 200, path);
  assert.equal(await page.text(), await readFile('docs' + path, 'utf8'), path);
}
const full = await fetch(`${origin}/llms-full.txt`);
assert.equal(full.status, 200);
assert.equal(await full.text(), await readFile('.vitepress/dist/llms-full.txt', 'utf8'));
console.log(`${paths.length} sidebar pages served as exact Markdown; llms.txt and llms-full.txt HTTP 200`);
