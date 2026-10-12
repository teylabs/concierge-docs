import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/*
 * The site uses VitePress's default theme. Theme changes go through the
 * stylesheets allow-listed here and VitePress's CSS variables; pages and
 * components carry no stylesheets, <style> blocks or style= attributes.
 *
 * Out of scope: the `--vp-layout-top-height` setProperty in
 * .vitepress/theme/index.ts. It reports the pre-1.0 notice's measured height
 * to the theme's layout, so it's layout measurement, not a style attribute.
 */
const allowedStylesheets = {
  '.vitepress/theme/custom.css': 'the theme overrides, on top of VitePress’s CSS variables',
}

const root = fileURLToPath(new URL('..', import.meta.url))

// Dependencies, build output and the brand kit's own tooling aren't site
// source; SVGs in docs/public are assets, not styles.
const ignored = ['node_modules', '.git', '.vitepress/dist', '.vitepress/cache', 'brand']

function files(dir = root) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    const rel = relative(root, path).split(sep).join('/')
    if (ignored.includes(rel)) return []
    return entry.isDirectory() ? files(path) : [rel]
  })
}

const all = files()
const pages = all.filter((file) => (file.startsWith('docs/') && file.endsWith('.md')) || (file.startsWith('.vitepress/') && file.endsWith('.vue')))

// Code samples on a page are content, not styling, so fenced and inline code
// is left out of the markdown before it's checked.
function source(file) {
  const text = readFileSync(join(root, file), 'utf8')
  if (!file.endsWith('.md')) return text
  return text.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '').replace(/`[^`\n]+`/g, '')
}

test('every stylesheet is on the allow-list', () => {
  const stray = all.filter((file) => file.endsWith('.css') && !(file in allowedStylesheets))
  assert.deepEqual(stray, [], 'Theme changes go in .vitepress/theme/custom.css; add a stylesheet to the allow-list in this test only with a reason.')
})

test('the allow-listed stylesheets exist', () => {
  for (const file of Object.keys(allowedStylesheets)) assert.ok(all.includes(file), `${file} is allow-listed but missing`)
})

test('pages and components have no <style> blocks', () => {
  const found = pages.filter((file) => /<style[\s>]/i.test(source(file)))
  assert.deepEqual(found, [], 'Move these styles to .vitepress/theme/custom.css.')
})

test('pages and components have no style= or :style= attributes', () => {
  const found = pages.filter((file) => /(?:^|[\s<])(?::|v-bind:)?style\s*=/im.test(source(file)))
  assert.deepEqual(found, [], 'Use a class styled in .vitepress/theme/custom.css instead.')
})
