import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('publishes every sidebar page as unchanged Markdown and a canonical index', async () => {
  const { publishMarkdown } = await import('./llms.mjs');
  const root = await mkdtemp(join(tmpdir(), 'concierge-llms-'));
  const docs = join(root, 'docs');
  const out = join(root, 'dist');
  await mkdir(join(docs, 'guide'), { recursive: true });
  const source = '# Start\n\n```vue\n{{ member.name }}\n```\n';
  await writeFile(join(docs, 'guide/start.md'), source);
  await writeFile(join(docs, 'index.md'), '# Home\n');
  const sidebar = [{ text: 'Guide', items: [{ text: 'Start', link: '/guide/start' }, { text: 'Home', link: '/' }] }];
  await publishMarkdown({ sidebar, srcDir: docs, outDir: out });
  assert.equal(await readFile(join(out, 'guide/start.md'), 'utf8'), source);
  assert.equal(await readFile(join(out, 'index.md'), 'utf8'), '# Home\n');
  const index = await readFile(join(out, 'llms.txt'), 'utf8');
  assert.match(index, /^# Concierge for Laravel\n\n> /);
  assert.match(index, /\[Start\]\(https:\/\/concierge.teylabs.com\/guide\/start.md\)/);
  assert.match(index, /\[Home\]\(https:\/\/concierge.teylabs.com\/index.md\)/);
  assert.equal((index.match(/^- \[/gm) || []).length, 2);
});

test('fails the build for a sidebar page with no Markdown source', async () => {
  const { publishMarkdown } = await import('./llms.mjs');
  const root = await mkdtemp(join(tmpdir(), 'concierge-llms-'));
  await assert.rejects(publishMarkdown({ sidebar: [{ text: 'Missing', link: '/missing' }], srcDir: root, outDir: join(root, 'dist') }), /missing/i);
});
