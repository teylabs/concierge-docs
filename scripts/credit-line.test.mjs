import { test } from 'node:test'
import assert from 'node:assert/strict'
import { creditLine } from '../.vitepress/credit.mjs'

const text = (html) => html.replace(/<[^>]+>/g, '')

test('the footer credit line keeps the brand guide words', () => {
  assert.equal(text(creditLine), '© 2026 Concierge · Built by Tey Labs, for fellow Laravel developers.')
})

test('Tey Labs links to teylabs.com in a new tab', () => {
  assert.match(creditLine, /<a href="https:\/\/teylabs\.com" target="_blank" rel="noopener">Tey Labs<\/a>/)
})

test('the line breaks at the middle dot, which narrow screens hide', () => {
  assert.match(creditLine, /<span class="credit-line__dot"> · <\/span>/)
})
