/*
 * The footer's two credit lines, as the Tey Labs brand guide words them:
 * the product's name, then `Built by Tey Labs.` No ©: the lines say who
 * made what. scripts/credit-line.test.mjs pins these words, so a tidy-up
 * can't reword this product's footer away from the guide's table.
 *
 * Each line is its own block, so a narrow screen wraps a line as a whole.
 */
export const CREDIT_PRODUCT = 'Concierge'
export const CREDIT_BUILT = 'Built by <a href="https://teylabs.com" target="_blank" rel="noopener">Tey Labs</a>.'

export const creditLine = '<span class="credit-line">'
  + `<span class="credit-line__product">${CREDIT_PRODUCT}</span>`
  + `<span class="credit-line__built">${CREDIT_BUILT}</span>`
  + '</span>'
