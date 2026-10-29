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
  // Two pages plus the llms-full.txt link.
  assert.equal((index.match(/^- \[/gm) || []).length, 3);
});

test('fails the build for a sidebar page with no Markdown source', async () => {
  const { publishMarkdown } = await import('./llms.mjs');
  const root = await mkdtemp(join(tmpdir(), 'concierge-llms-'));
  await assert.rejects(publishMarkdown({ sidebar: [{ text: 'Missing', link: '/missing' }], srcDir: root, outDir: join(root, 'dist') }), /missing/i);
});

test('publishes llms-full.txt with every sidebar page in order, as clean Markdown', async () => {
  const { publishMarkdown } = await import('./llms.mjs');
  const root = await mkdtemp(join(tmpdir(), 'concierge-llms-'));
  const docs = join(root, 'docs');
  const out = join(root, 'dist');
  await mkdir(join(docs, 'guide'), { recursive: true });
  await writeFile(join(docs, 'guide/b.md'), '---\ntitle: B\n---\n# Second\n\n```php memo="app/Models/User.php" at="boot()"\n$x = 1;\n```\n');
  await writeFile(join(docs, 'guide/a.md'), '# First\n\nBody.\n');
  const sidebar = [{ text: 'Guide', items: [{ text: 'A', link: '/guide/a' }, { text: 'B', link: '/guide/b' }] }];
  await publishMarkdown({ sidebar, srcDir: docs, outDir: out });
  const index = await readFile(join(out, 'llms.txt'), 'utf8');
  assert.match(index, /\[Full documentation\]\(https:\/\/concierge.teylabs.com\/llms-full.txt\)/);
  const full = await readFile(join(out, 'llms-full.txt'), 'utf8');
  assert.match(full, /^# Concierge for Laravel: full documentation\n/);
  assert.ok(full.indexOf('# First') < full.indexOf('# Second'), 'sidebar order');
  assert.ok(full.includes('<!-- source: https://concierge.teylabs.com/guide/a.md -->\n\n# First\n\nBody.\n'));
  assert.ok(full.includes('```php\n$x = 1;\n```'));
  assert.doesNotMatch(full, /memo=|at="|title: B/);
  // The per-page copies stay byte-for-byte the source.
  assert.match(await readFile(join(out, 'guide/b.md'), 'utf8'), /memo="app\/Models\/User.php"/);
});

test('the agent surface check fails when a sidebar page is missing from llms.txt or llms-full.txt', async () => {
  const { publishMarkdown, checkAgentSurface } = await import('./llms.mjs');
  const root = await mkdtemp(join(tmpdir(), 'concierge-llms-'));
  const docs = join(root, 'docs');
  const out = join(root, 'dist');
  await mkdir(join(docs, 'guide'), { recursive: true });
  await writeFile(join(docs, 'guide/a.md'), '# First\n');
  await writeFile(join(docs, 'guide/b.md'), '# Second\n');
  const published = [{ text: 'A', link: '/guide/a' }];
  await publishMarkdown({ sidebar: published, srcDir: docs, outDir: out });
  await checkAgentSurface({ sidebar: published, srcDir: docs, outDir: out });
  const grown = [...published, { text: 'B', link: '/guide/b' }];
  await assert.rejects(checkAgentSurface({ sidebar: grown, srcDir: docs, outDir: out }), /llms\.txt: \/guide\/b[\s\S]*llms-full\.txt: \/guide\/b/);
  // A stale page body in llms-full.txt also fails.
  await writeFile(join(docs, 'guide/a.md'), '# First, edited\n');
  await assert.rejects(checkAgentSurface({ sidebar: published, srcDir: docs, outDir: out }), /llms-full\.txt: \/guide\/a/);
  // So does an llms.txt that no longer links llms-full.txt.
  await writeFile(join(out, 'llms.txt'), (await readFile(join(out, 'llms.txt'), 'utf8')).replace('/llms-full.txt', '/gone.txt'));
  await assert.rejects(checkAgentSurface({ sidebar: published, srcDir: docs, outDir: out }), /does not link llms-full/);
});
