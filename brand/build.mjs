// The Concierge brand kit's single source of truth.
//
// Every file in kit/ and review.html (and the copies deployed to
// ../docs/public/ once the docs site exists) is produced by this script: the
// mark's geometry, the Grey ramp, the outlined wordmark, the favicons,
// avatars, banners and the share card. Change the mark here, run
// `npm run build`, and commit what changes.
//
// The mark is "Nook": the app is the whole square, drawn as a frame left open
// at the bottom-right corner; concierge is the piece that sits in that corner,
// out of the way until needed. Its Tey orange shadow falls up and to the left,
// into the app.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import opentype from 'opentype.js'
import sharp from 'sharp'

const here = path.dirname(fileURLToPath(import.meta.url))
const KIT = path.join(here, 'kit')
const DOCS = path.join(here, '..', 'docs')
const PUBLIC = path.join(DOCS, 'public')

// Bump when a deployed file changes; the docs will reference these files with ?v=N.
export const ASSET_VERSION = 1

// The words on the banner and share card. Placeholders until the positioning
// line is settled: change them here and rebuild.
export const TAGLINE = 'A standard suite of essentials for every Laravel app you build.'
export const SITE = 'concierge.teylabs.com'
// The real install sequence, from concierge's README: the first line in orange
// on the share card, the rest faded under it.
const INSTALL = [
  'composer require tey/concierge',
  'php artisan vendor:publish --tag="concierge-config"',
  'php artisan migrate',
  'php artisan concierge:sync-roles',
]

// ─── Palette ────────────────────────────────────────────────────────────────

// No cream or paper anywhere: concierge's surfaces are white and a neutral dark.
export const ORANGE = '#B65326'
export const WHITE = '#FFFFFF'
export const DARK = '#0D1117'       // the dark surface the dark variants are drawn for
export const MUTED = '#59636E'      // secondary text on white
export const MUTED_DARK = '#9198A1' // secondary text on the dark surface

// Grey: three neutral steps, one ramp per surface. Index 0 is the strongest
// contrast with the surface (the corner piece and the wordmark); 2 is the
// quietest (the frame's far arm).
export const GREY = {
  light: ['#1F2328', '#4B535D', '#7D8590'],
  dark: ['#FFFFFF', '#C2C9D1', '#8D96A0'],
}

// Which step each part takes: a three-step ramp from the app's far corner to
// concierge's corner.
const TONE = { far: 2, near: 1, piece: 0 }

// ─── Geometry ───────────────────────────────────────────────────────────────

// Drawn on a 16-unit grid with one unit of clear space each side, so the
// square spans 1..15:
//   frame: 2 units wide, outer corners radius 2, inner corners square, open
//     at the bottom-right where it stops at 7 on the bottom and right edges;
//   far arm: the left and top edges round the top-left corner, up to 11;
//   near arms: the two ends that meet the corner piece (the colour changes
//     mid-edge, at 11);
//   corner piece: 9..15, its outer corner radius 2;
//   shadow: the corner piece moved 1 unit up and left, in Tey orange.
//
// At N pixels the square spans S = 14/16 N, and every coordinate is rounded to
// a whole pixel, so the mark is crisp at 16, 32 and 48 (exact multiples) and at
// 24 (the docs header), where the units fall on half pixels.
function grid(N) {
  const S = Math.round((14 * N) / 16)
  const o = Math.round((N - S) / 2)
  return {
    x: (v) => o + Math.round(((v - 1) * S) / 14),
    r: (v) => +((v * S) / 14).toFixed(3),
  }
}

function parts(N, { mono = false } = {}) {
  const { x, r } = grid(N)
  const R = r(2)
  const arc = (ex, ey) => `A${R} ${R} 0 0 1 ${x(ex)} ${x(ey)}`
  return {
    far: `M${x(1)} ${x(11)}V${x(3)}${arc(3, 1)}H${x(11)}V${x(3)}H${x(3)}V${x(11)}Z`,
    near: `M${x(7)} ${x(15)}H${x(3)}${arc(1, 13)}V${x(11)}H${x(3)}V${x(13)}H${x(7)}Z`
      + `M${x(11)} ${x(1)}H${x(13)}${arc(15, 3)}V${x(7)}H${x(13)}V${x(3)}H${x(11)}Z`,
    // In one colour the shadow would merge with the piece, so mono and
    // reversed draw only its visible L, half as thick, with a half-unit gap.
    shadow: mono
      ? `M${x(8)} ${x(8)}H${x(14)}V${x(8.5)}H${x(8.5)}V${x(14)}H${x(8)}Z`
      : `M${x(8)} ${x(8)}H${x(14)}V${x(12)}${arc(12, 14)}H${x(8)}Z`,
    piece: `M${x(9)} ${x(9)}H${x(15)}V${x(13)}${arc(13, 15)}H${x(9)}Z`,
  }
}

// Colour modes: 'light' and 'dark' use the Grey ramp for that surface;
// 'mono' is all the light ramp's step 0; 'reversed' is all white.
function fills(mode) {
  if (mode === 'mono') return { far: GREY.light[0], near: GREY.light[0], piece: GREY.light[0], shadow: GREY.light[0] }
  if (mode === 'reversed') return { far: WHITE, near: WHITE, piece: WHITE, shadow: WHITE }
  const ramp = GREY[mode]
  return { far: ramp[TONE.far], near: ramp[TONE.near], piece: ramp[TONE.piece], shadow: ORANGE }
}

// The mark's paths at N pixels, positioned at (dx, dy). The shadow is drawn
// before the piece, which covers it.
export function markPaths(N, mode, { dx = 0, dy = 0 } = {}) {
  const p = parts(N, { mono: mode === 'mono' || mode === 'reversed' })
  const f = fills(mode)
  const body = ['far', 'near', 'shadow', 'piece'].map((k) => `<path d="${p[k]}" fill="${f[k]}"/>`).join('')
  return dx || dy ? `<g transform="translate(${dx} ${dy})">${body}</g>` : body
}

export function markSvg(N, mode, { display } = {}) {
  const size = display ?? N
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${N} ${N}">`
    + `<title>Concierge</title>${markPaths(N, mode)}</svg>\n`
}

// favicon.svg follows the browser's colour scheme: the light-surface ramp by
// default, the dark-surface ramp in a dark tab. Drawn on the 16 px grid, so it
// is crisp at 16 and at 32 (a 2× tab).
function faviconSvg() {
  const p = parts(16)
  const rules = (ramp) => `.far{fill:${ramp[TONE.far]}}.near{fill:${ramp[TONE.near]}}.piece{fill:${ramp[TONE.piece]}}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><title>Concierge</title>`
    + `<style>${rules(GREY.light)}.shadow{fill:${ORANGE}}@media (prefers-color-scheme:dark){${rules(GREY.dark)}}</style>`
    + ['far', 'near', 'shadow', 'piece'].map((k) => `<path class="${k}" d="${p[k]}"/>`).join('')
    + `</svg>\n`
}

// ─── Type, as outlines ──────────────────────────────────────────────────────

const font = (file) => opentype.loadSync(path.join(here, 'fonts', file))
const TEXT = font('SchibstedGrotesk-Medium.woff')
const MONO = font('IBMPlexMono-Regular.woff')

// Text as one path: kerning on, with tracking in em. Returns the path data and
// its ink bounds, so lockups can align on real glyph edges.
function textPath(f, text, size, { x = 0, y = 0, tracking = 0 } = {}) {
  const scale = size / f.unitsPerEm
  const glyphs = f.stringToGlyphs(text)
  const p = new opentype.Path()
  let cx = x
  glyphs.forEach((gl, i) => {
    p.extend(gl.getPath(cx, y, size))
    cx += gl.advanceWidth * scale + tracking * size
    if (i < glyphs.length - 1) cx += f.getKerningValue(gl, glyphs[i + 1]) * scale
  })
  return { d: p.toPathData(2), box: p.getBoundingBox(), advance: cx - x }
}

const xHeight = (f, size) => (f.tables.os2.sxHeight / f.unitsPerEm) * size

// "concierge", lowercase, in Schibsted Grotesk Medium: quiet, like the voice.
const wordmark = (size, at = {}) => textPath(TEXT, 'concierge', size, at)

// ─── Lockup ─────────────────────────────────────────────────────────────────

// Mark + wordmark. The wordmark's size is 15/16 of the mark's, its x-height
// centred on the mark, its ink edge a third of the mark's height away.
function lockupSvg(mode) {
  const H = 240
  const size = H * 0.9375
  const gapX = Math.round(H * 0.34)
  const baseline = Math.round(H / 2 + xHeight(TEXT, size) / 2)
  const probe = wordmark(size, { y: baseline })
  const word = wordmark(size, { x: H + gapX - probe.box.x1, y: baseline })
  const W = Math.ceil(H + gapX + probe.box.x2 - probe.box.x1)
  const Hh = Math.max(H, Math.ceil(probe.box.y2 + 2)) // room for the g's descender
  const color = mode === 'dark' || mode === 'reversed' ? GREY.dark[0] : GREY.light[0]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}"><title>Concierge</title>`
    + markPaths(H, mode)
    + `<path d="${word.d}" fill="${color}"/></svg>\n`
}

// ─── Banner, 1200 × 320, drawn at 2× ───────────────────────────────────────

function bannerSvg(mode, { transparent = false } = {}) {
  const W = 2400, Hh = 640
  const bg = mode === 'dark' ? DARK : WHITE
  const fg = GREY[mode][0]
  const M = 384
  const mx = 176, my = (Hh - M) / 2
  const nameSize = 250
  const tx = mx + M + 96
  // No tagline on the banner: the README writes its text beside the image,
  // so the banner carries only the mark and the name, centred on the mark.
  const name = wordmark(nameSize, { x: tx, y: my + M / 2 + 65 })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}">`
    + (transparent ? '' : `<rect width="${W}" height="${Hh}" fill="${bg}"/>`)
    + markPaths(M, mode, { dx: mx, dy: my })
    + `<path d="${name.d}" fill="${fg}"/></svg>\n`
}

// ─── Share card, 2400 × 1200 ────────────────────────────────────────────────

// The mark and name, large, over concierge's real install sequence, faded.
function cardSvg() {
  const W = 2400, H = 1200
  const faded = 0.52 // faded, but still visible in print and on projectors
  const M = 416, mx = 120, my = 120
  const name = wordmark(300, { x: mx + M + 72, y: my + 262 })
  const tag = textPath(TEXT, TAGLINE, 66, { x: mx + 26, y: 680 })
  const install = textPath(MONO, INSTALL[0], 44, { x: mx + 26, y: 790 })
  const site = textPath(TEXT, SITE, 38, { x: 0, y: 0 })
  const siteD = textPath(TEXT, SITE, 38, { x: W - 120 - site.advance, y: H - 64 }).d
  const y0 = 900, lh = 56, cx = mx + 26
  const rest = INSTALL.slice(1)
  const prompt = rest.map((_, i) => textPath(MONO, '$', 34, { x: cx, y: y0 + i * lh }).d).join('')
  const cmds = rest.map((c, i) => textPath(MONO, c, 34, { x: cx + 42, y: y0 + i * lh }).d).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<rect width="${W}" height="${H}" fill="${WHITE}"/>`
    + `<path d="${cmds}" fill="${GREY.light[0]}" opacity="${faded}"/>`
    + `<path d="${prompt}" fill="${ORANGE}" opacity="0.85"/>`
    + markPaths(M, 'light', { dx: mx, dy: my })
    + `<path d="${name.d}" fill="${GREY.light[0]}"/>`
    + `<path d="${tag.d}" fill="${GREY.light[0]}"/>`
    + `<path d="${install.d}" fill="${ORANGE}"/>`
    + `<path d="${siteD}" fill="${MUTED}"/></svg>\n`
}

// ─── Tiles and rasters ──────────────────────────────────────────────────────

// An opaque white tile with the mark centred. No baked corner radius: GitHub,
// social sites and iOS apply their own mask. Mark sizes are multiples of 16, so
// every edge lands on a whole pixel.
function tileSvg(N, markSize) {
  const off = Math.round((N - markSize) / 2)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${N}" height="${N}" viewBox="0 0 ${N} ${N}">`
    + `<rect width="${N}" height="${N}" fill="${WHITE}"/>${markPaths(markSize, 'light', { dx: off, dy: off })}</svg>\n`
}

const png = (svg) => sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()

// ICO with real PNGs embedded at each size.
function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length)
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4)
  let offset = head.length
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i
    head.writeUInt8(size >= 256 ? 0 : size, e); head.writeUInt8(size >= 256 ? 0 : size, e + 1)
    head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3)
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6)
    head.writeUInt32LE(data.length, e + 8); head.writeUInt32LE(offset, e + 12)
    offset += data.length
  })
  return Buffer.concat([head, ...images.map((im) => im.data)])
}

// ─── Build ──────────────────────────────────────────────────────────────────

async function build() {
  fs.rmSync(KIT, { recursive: true, force: true })
  fs.mkdirSync(KIT, { recursive: true })
  const out = (name, data) => fs.writeFileSync(path.join(KIT, name), data)

  // Marks: scalable files are laid out on a 480 px grid (30 px per unit).
  out('mark-light.svg', markSvg(480, 'light'))
  out('mark-dark.svg', markSvg(480, 'dark'))
  out('mark-mono.svg', markSvg(480, 'mono'))
  out('mark-reversed.svg', markSvg(480, 'reversed'))
  out('lockup-light.svg', lockupSvg('light'))
  out('lockup-dark.svg', lockupSvg('dark'))

  // The docs header shows the logo at 24 px: draw it on the 24 px grid.
  out('logo-light.svg', markSvg(24, 'light'))
  out('logo-dark.svg', markSvg(24, 'dark'))

  // Favicons: the full mark at every size. At 16 px the shadow is a 1 px
  // orange L and still reads on light and dark tabs (kit/favicon-check.png).
  out('favicon.svg', faviconSvg())
  const icoImages = []
  for (const N of [16, 32, 48]) {
    const data = await png(markSvg(N, 'light'))
    out(`favicon-${N}.png`, data)
    icoImages.push({ size: N, data })
  }
  out('favicon.ico', ico(icoImages))

  // Opaque tiles
  out('apple-touch-icon.png', await png(tileSvg(180, 144)))
  out('avatar-512.png', await png(tileSvg(512, 368)))
  out('avatar-1000.png', await png(tileSvg(1000, 720)))

  // README banners and the share card
  out('banner-light@2x.png', await png(bannerSvg('light')))
  out('banner-dark@2x.png', await png(bannerSvg('dark')))
  // Transparent banners for READMEs: no background box on GitHub's white or
  // dark page, trimmed to the artwork. 'light' is for light pages, 'dark' for dark.
  for (const mode of ['light', 'dark']) {
    out(`banner-${mode}-transparent@2x.png`, await sharp(await png(bannerSvg(mode, { transparent: true })))
      .trim({ threshold: 0 }).png().toBuffer())
  }
  out('og-image.jpg', await sharp(Buffer.from(cardSvg())).flatten({ background: WHITE })
    .jpeg({ quality: 72, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer())

  // Favicon check: the mark at 16 and 32 px on light and dark tabs, at 8×.
  out('favicon-check.png', await faviconCheck())

  // The review page: every export at 16/24/32/48 and large, light and dark.
  fs.writeFileSync(path.join(here, 'review.html'), reviewHtml())

  // Deploy copies (outputs, not sources), once the docs site exists.
  if (fs.existsSync(DOCS)) {
    fs.mkdirSync(PUBLIC, { recursive: true })
    for (const f of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'og-image.jpg', 'logo-light.svg', 'logo-dark.svg']) {
      fs.copyFileSync(path.join(KIT, f), path.join(PUBLIC, f))
    }
  }

  const sizes = fs.readdirSync(KIT).sort().map((f) => `${f}  ${fs.statSync(path.join(KIT, f)).size} B`)
  console.log(sizes.join('\n'))
}

async function faviconCheck() {
  const tabs = [['#FFFFFF', 'light'], ['#DFE1E5', 'light'], ['#35363A', 'dark'], ['#202124', 'dark']]
  const Z = 8, pad = 8
  const tiles = []
  let x = 0
  for (const N of [16, 32]) for (const [bg, mode] of tabs) {
    const raw = await sharp(Buffer.from(markSvg(N, mode))).flatten({ background: bg }).png().toBuffer()
    const big = await sharp(raw).resize(N * Z, N * Z, { kernel: 'nearest' }).png().toBuffer()
    tiles.push({ input: big, left: x, top: 0 })
    x += N * Z + pad
  }
  return sharp({ create: { width: x - pad, height: 32 * Z, channels: 4, background: '#F6F8FA' } }).composite(tiles).png().toBuffer()
}

// ─── Review page ────────────────────────────────────────────────────────────

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return ((x + 0.05) / (y + 0.05)).toFixed(2) + ':1'
}

function reviewHtml() {
  const k = (f) => `kit/${f}`
  const sizes = (file, list = [16, 24, 32, 48, 128]) => list.map((px) => `<figure><img src="${k(file)}" width="${px}" height="${px}" alt=""><figcaption>${px}</figcaption></figure>`).join('')
  const half = (mode) => {
    const bg = mode === 'dark' ? DARK : WHITE
    return `<div class="half ${mode}" style="background:${bg}">
        <h3>${mode === 'dark' ? 'On #0D1117' : 'On white'}</h3>
        <div class="row">${sizes(`mark-${mode}.svg`)}</div>
        <div class="row">${sizes(`logo-${mode}.svg`, [24])}<span class="cap">logo-${mode}.svg, drawn on the 24 px grid</span></div>
        <img class="large" src="${k(`mark-${mode}.svg`)}" width="320" height="320" alt="">
        <img class="lock" src="${k(`lockup-${mode}.svg`)}" alt="">
        <div class="tabbar ${mode}"><div class="tab"><img src="${k('favicon.svg')}" width="16" height="16" alt=""><span>concierge</span></div></div>
        <p class="cap">favicon.svg follows the colour scheme of the page viewing it; the 16 / 32 / 48 PNGs are the light ramp.</p>
        <div class="row">${[16, 32, 48].map((px) => `<figure><img src="${k(`favicon-${px}.png`)}" width="${px}" height="${px}" alt=""><figcaption>${px}</figcaption></figure>`).join('')}</div>
        <img class="banner" src="${k(`banner-${mode}-transparent@2x.png`)}" alt="">
      </div>`
  }
  const swatch = (hex, bg) => `<i style="background:${hex}"></i><code>${hex}</code> <span>${contrast(hex, bg)}</span>`
  const role = { far: 'the frame’s far arm (left and top)', near: 'the frame’s near arms (the ends that meet the corner piece)', piece: 'the corner piece, and the wordmark' }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Concierge brand kit</title>
<link rel="icon" href="kit/favicon.svg" type="image/svg+xml">
<style>
  :root { --text: #1F2328; --muted: ${MUTED}; --line: #D1D9E0; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #FFFFFF; color: var(--text); font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; }
  main { max-width: 1180px; margin: 0 auto; padding: 40px 16px 64px; }
  h1 { font-size: 24px; margin: 0 0 6px; font-weight: 600; }
  h2 { font-size: 13px; margin: 40px 0 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
  h3 { margin: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
  .half.dark h3, .half.dark .cap, .half.dark figcaption { color: ${MUTED_DARK}; }
  .lede { color: var(--muted); max-width: 820px; margin: 0; }
  .halves { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  .half { padding: 24px; display: grid; gap: 20px; align-content: start; }
  .row { display: flex; align-items: flex-end; gap: 18px; flex-wrap: wrap; }
  figure { margin: 0; display: grid; justify-items: center; gap: 6px; }
  figure img { display: block; }
  figcaption, .cap { font-size: 12px; color: var(--muted); margin: 0; }
  .large { display: block; width: min(320px, 100%); height: auto; }
  .lock, .banner { display: block; max-width: 100%; height: auto; }
  .lock { max-height: 64px; }
  .tabbar { display: flex; padding: 8px 8px 0; border-radius: 8px 8px 0 0; }
  .tabbar.light { background: #DEE1E6; } .tabbar.dark { background: #202124; }
  .tab { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px 8px 0 0; font-size: 12px; min-width: 160px; }
  .tabbar.light .tab { background: #FFFFFF; color: #1F1F1F; } .tabbar.dark .tab { background: #35363A; color: #E8EAED; }
  .mono { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  .mono > div { padding: 24px; display: grid; gap: 14px; }
  table { border-collapse: collapse; font-size: 13px; width: 100%; max-width: 860px; }
  th { text-align: left; font-weight: 500; color: var(--muted); padding: 6px 8px 6px 0; }
  td { padding: 8px 8px 8px 0; border-top: 1px solid var(--line); vertical-align: top; }
  td i { display: inline-block; width: 14px; height: 14px; border-radius: 3px; vertical-align: -2px; margin-right: 5px; border: 1px solid rgba(0,0,0,.12); }
  td span { color: var(--muted); }
  .tiles { display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-end; }
  .tiles img { display: block; border: 1px solid var(--line); }
  .tiles .round { border-radius: 50%; }
  .wide { display: block; width: 100%; height: auto; border: 1px solid var(--line); border-radius: 8px; }
  .pix { display: block; max-width: 100%; height: auto; image-rendering: pixelated; }
  code { font: 12px ui-monospace, SFMono-Regular, monospace; }
  @media (max-width: 720px) { .halves, .mono { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<main>
  <h1>Concierge brand kit</h1>
  <p class="lede">Nook: the app is the whole square; concierge keeps to one corner of it, out of the way until needed, and its Tey orange shadow falls into the app. Grey ramp on white and #0D1117; no cream. Every file below is generated by <code>build.mjs</code>.</p>

  <h2>Mark, logo, lockup, favicon, banner</h2>
  <div class="halves">${half('light')}${half('dark')}
  </div>

  <h2>Mono and reversed</h2>
  <div class="mono">
    <div style="background:${WHITE}"><div class="row">${sizes('mark-mono.svg')}</div><p class="cap">mark-mono.svg: one ink, for print, stamps and embroidery. The shadow becomes a thinner L with a gap, so it stays separate from the piece.</p></div>
    <div style="background:${ORANGE}"><div class="row">${sizes('mark-reversed.svg')}</div><p class="cap" style="color:#fff">mark-reversed.svg: all white, for dark or orange fields.</p></div>
  </div>

  <h2>Palette</h2>
  <table>
    <tr><th>part</th><th>on white</th><th>on #0D1117</th></tr>
    ${Object.entries(TONE).map(([part, i]) => `<tr><td><b>${part}</b><br><span>${role[part]}</span></td><td>${swatch(GREY.light[i], WHITE)}</td><td>${swatch(GREY.dark[i], DARK)}</td></tr>`).join('')}
    <tr><td><b>shadow</b><br><span>Tey orange, one value on both surfaces</span></td><td>${swatch(ORANGE, WHITE)}</td><td>${swatch(ORANGE, DARK)}</td></tr>
    <tr><td><b>muted</b><br><span>taglines and secondary text</span></td><td>${swatch(MUTED, WHITE)}</td><td>${swatch(MUTED_DARK, DARK)}</td></tr>
  </table>

  <h2>Opaque tiles (no baked corner radius)</h2>
  <div class="tiles">
    <figure><img src="kit/apple-touch-icon.png" width="90" height="90" alt=""><figcaption>apple-touch-icon 180</figcaption></figure>
    <figure><img src="kit/avatar-512.png" width="128" height="128" alt=""><figcaption>avatar-512</figcaption></figure>
    <figure><img class="round" src="kit/avatar-512.png" width="128" height="128" alt=""><figcaption>under a round mask</figcaption></figure>
    <figure><img src="kit/avatar-1000.png" width="200" height="200" alt=""><figcaption>avatar-1000</figcaption></figure>
  </div>

  <h2>Banners on their own background</h2>
  <img class="wide" src="kit/banner-light@2x.png" alt="">
  <p></p>
  <img class="wide" src="kit/banner-dark@2x.png" alt="">

  <h2>Share card (og:image, 2400 × 1200)</h2>
  <img class="wide" src="kit/og-image.jpg" alt="">

  <h2>Favicon check: 16 and 32 px on four tab colours, at 8×</h2>
  <img class="pix" src="kit/favicon-check.png" alt="">
</main>
</body>
</html>
`
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await build()
