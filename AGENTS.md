# Working on concierge-docs

This repository is the source of [concierge.teylabs.com](https://concierge.teylabs.com), the documentation for [tey/concierge](https://github.com/teylabs/concierge), a Laravel package for users, roles and workspaces. The site is built with [VitePress](https://vitepress.dev) on its default theme. Pages live in `docs/`; the theme lives in `.vitepress/`. Read `README.md`, the package's README and the issue you're working on before changing anything.

## Gates

Run these before opening or updating a pull request:

- `npm run build`: runs `npm test` (the `scripts/*.test.mjs` suite, including the styling guard), then builds `.vitepress/dist` with `/llms.txt` and each page's Markdown source.
- `npm run preview`, then `node scripts/verify-served.mjs` in another terminal: checks that the served `/llms.txt` and every sidebar page's Markdown match the build.

Look at the pages you changed in the preview, on a desktop and a phone width, in light and dark mode.

## Conventions

- The docs describe **released** behaviour of tey/concierge only. Document a feature when the release that ships it is out, and name the version where it matters. Plans belong in `docs/roadmap.md`.
- Prose uses Canadian spelling ("behaviour", "colour"; "-ize" is fine) in the house voice: plain, short sentences, second person, no marketing.
- Code samples must run against the documented release. Give a sample a `memo="path/to/File.php"` when it says where the code lives.
- Every page in the sidebar ships its Markdown source beside its HTML for coding agents; don't break that (the tests in `scripts/` check it).

## Styling

The site uses VitePress's default theme, with no Tailwind. Don't add stylesheets, `<style>` blocks or `style=` / `:style=` attributes to pages or Vue components. Theme changes go in `.vitepress/theme/custom.css`, built on VitePress's CSS variables (`--vp-c-*` and friends); give markup a class and style the class there.

`scripts/styling.test.mjs` enforces this, so `npm test` and the build fail on a stray `.css` file, a `<style>` block or a `style=` attribute. Fenced and inline code in a page is content, so examples may contain them. The test's allow-list holds the genuine exceptions, each with a reason. Add one only when the theme can't do it another way, and say why in the PR.

## Git and pull requests

- Work on a branch from the latest `origin/main`; never commit to `main`.
- Commit with imperative, sentence-case subjects (e.g. "Document app-wide invitations").
- **No attribution of any kind:** no `Co-authored-by`, no agent thread IDs, no "Generated with" lines, no links to agent sessions, in commits, PR titles or PR bodies.
- Open pull requests as **drafts**. Title them like a commit subject; the body says what changed, how it was verified, and `Closes #N` where there's an issue.
- **Merging deploys the site**: every push to `main` publishes concierge.teylabs.com. Never merge or push to `main`; maintainers do that.
- This is a public repository: never include secrets, local absolute paths, private app names or internal notes.
