import { test } from 'node:test'
import assert from 'node:assert/strict'
import { creditLine } from '../.vitepress/credit.mjs'

const lines = [...creditLine.matchAll(/<span class="credit-line__\w+">(.*?)<\/span>/g)]
  .map(([, html]) => html.replace(/<[^>]+>/g, ''))

test('the footer credit keeps the brand guide lines', () => {
  assert.deepEqual(lines, ['Concierge', 'Built by Tey Labs.'])
})

test('there is no copyright sign', () => {
  assert.doesNotMatch(creditLine, /©/)
})

test('Tey Labs links to teylabs.com in a new tab', () => {
  assert.match(creditLine, /<a href="https:\/\/teylabs\.com" target="_blank" rel="noopener">Tey Labs<\/a>/)
})
