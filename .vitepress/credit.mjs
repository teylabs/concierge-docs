/*
 * The footer's credit line, as the Tey Labs brand guide words it for every
 * product: `© {year} Tey Labs Inc. · Built by Tey Labs.` The © names the legal
 * owner, not the product.
 * scripts/credit-line.test.mjs pins these words, so a tidy-up can't reword
 * this product's line away from the others'.
 *
 * Each half is its own span so a narrow screen can break the line at the
 * middle dot and hide the dot (see .credit-line in theme/custom.css).
 */
export const CREDIT_COPY = '© 2026 Tey Labs Inc.'
export const CREDIT_BUILT = 'Built by <a href="https://teylabs.com" target="_blank" rel="noopener">Tey Labs</a>.'

export const creditLine = '<span class="credit-line">'
  + `<span class="credit-line__copy">${CREDIT_COPY}</span>`
  + '<span class="credit-line__dot"> · </span>'
  + `<span class="credit-line__built">${CREDIT_BUILT}</span>`
  + '</span>'
