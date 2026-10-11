# What Concierge Covers

Concierge is working toward 1.0 in public. This page is the plan: everything below is **planned and not yet released**, unless it is marked done. What ships today is in the [introduction](/guide/introduction).

> [!NOTE]
> This page describes plans, not features. Milestones and issues on GitHub are the source of truth: [teylabs/concierge milestones](https://github.com/teylabs/concierge/milestones).

## The End Goal

Concierge is planned as a starter kit extension: it extends the Laravel starter kit an app started with, so the starter kit story carries on from sign-in to user management. Install a starter kit, then install concierge:

```bash
composer require tey/concierge
php artisan concierge:install
```

`concierge:install` is planned for 0.8. When the plan is complete, concierge works with all four official starter kits (Vue, React, Svelte and Livewire, including their WorkOS AuthKit variants), with or without their teams:

- `concierge:install` detects the starter kit and scaffolds concierge's pages into the app, written with that kit's own components and layout ([#57](https://github.com/teylabs/concierge/issues/57)). The app owns the pages; the logic stays in the package and updates with `composer update`.
- When the kit was generated with teams, concierge builds on the kit's own teams, memberships and invitations, and its pages extend the kit's team screens ([#20](https://github.com/teylabs/concierge/issues/20)). Without teams, invitations and roles apply to the whole app ([#19](https://github.com/teylabs/concierge/issues/19)).
- The app's first owner signs in: one click in local development, created on deploy in production.
- An app without a starter kit has an option too: concierge's packaged Vue components, a standalone portal at its own URL, or headless use with the app's own pages.

[Issue #13](https://github.com/teylabs/concierge/issues/13) shows the same goal step by step: from a starter kit to working user management in two commands.

## Milestones

### 0.5: Ready for Everyone

[Milestone 0.5](https://github.com/teylabs/concierge/milestone/1): a newcomer can find, understand, install and trust concierge.

- Local login fails closed outside the local environment, under every cache combination ([#9](https://github.com/teylabs/concierge/issues/9), done)
- Published on Packagist ([#15](https://github.com/teylabs/concierge/issues/15), done)
- The repository follows Tey Labs conventions: issue forms, Discussions, private vulnerability reporting ([#16](https://github.com/teylabs/concierge/issues/16), done)
- A README rewritten for newcomers ([#10](https://github.com/teylabs/concierge/issues/10))
- This documentation site ([#11](https://github.com/teylabs/concierge/issues/11))
- A logo and wordmark ([#12](https://github.com/teylabs/concierge/issues/12))
- Discoverability: llms.txt, Composer keywords, GitHub description and topics ([#14](https://github.com/teylabs/concierge/issues/14))

### 0.6: Built on Mod

[Milestone 0.6](https://github.com/teylabs/concierge/milestone/2): concierge's routes, pages and providers run through [mod](https://mod.teylabs.com).

- Routes, pages and providers run through mod's host API ([#17](https://github.com/teylabs/concierge/issues/17))
- Require `tey/mod` ([#18](https://github.com/teylabs/concierge/issues/18))
- Plain action and data classes in place of laravel-actions and laravel-data ([#51](https://github.com/teylabs/concierge/issues/51))

### 0.7: Meets Any App Where It's At

[Milestone 0.7](https://github.com/teylabs/concierge/milestone/3): with or without workspaces, with or without existing sign-in, plus the user administration every app needs.

- App-wide mode: invitations and roles without workspaces ([#19](https://github.com/teylabs/concierge/issues/19))
- Use an app's existing team or organization model as the workspace, including a starter kit's own teams ([#20](https://github.com/teylabs/concierge/issues/20))
- Upgrade an app from app-wide mode to workspaces ([#21](https://github.com/teylabs/concierge/issues/21))
- Sign-in for apps that have no authentication ([#23](https://github.com/teylabs/concierge/issues/23))
- App-wide user admin: list, edit, change role, remove ([#43](https://github.com/teylabs/concierge/issues/43))
- Deactivate and restore users across the app ([#44](https://github.com/teylabs/concierge/issues/44))
- Registration gating: invite-only, allowed email domains, or closed ([#45](https://github.com/teylabs/concierge/issues/45))
- Impersonation with a visible "stop impersonating" banner ([#46](https://github.com/teylabs/concierge/issues/46))
- Admin-forced password reset that ends sessions ([#47](https://github.com/teylabs/concierge/issues/47))
- Initials avatars for people without a photo ([#48](https://github.com/teylabs/concierge/issues/48))
- A protected operator account, kept in sync on every deploy ([#49](https://github.com/teylabs/concierge/issues/49))

### 0.8: Install and Go

[Milestone 0.8](https://github.com/teylabs/concierge/milestone/4): one setup command handles the rest, for developers and their coding agents.

- `concierge:install`: detect the app, ask only what it can't detect, set everything up ([#24](https://github.com/teylabs/concierge/issues/24))
- Register nothing until setup has run ([#25](https://github.com/teylabs/concierge/issues/25))
- Create the first owner in production, safely on every deploy ([#26](https://github.com/teylabs/concierge/issues/26))
- The first local sign-in creates the first owner ([#27](https://github.com/teylabs/concierge/issues/27))
- Routes, controllers and policies by default, each overridable ([#28](https://github.com/teylabs/concierge/issues/28))
- Every command works without prompts, offers `--json`, and names the fix when it fails ([#29](https://github.com/teylabs/concierge/issues/29))
- Laravel Boost guidelines and skill ([#30](https://github.com/teylabs/concierge/issues/30))
- MCP tools for setting up and operating concierge ([#31](https://github.com/teylabs/concierge/issues/31))

### 0.9: Every Frontend

[Milestone 0.9](https://github.com/teylabs/concierge/milestone/5): native pages scaffolded into each starter kit, packaged components, a standalone portal, or headless use.

- Scaffold native pages for each starter kit, with options for apps without one ([#57](https://github.com/teylabs/concierge/issues/57))
- React starter kit pages, scaffolded with the kit's own components ([#40](https://github.com/teylabs/concierge/issues/40))
- Svelte starter kit pages, scaffolded with the kit's own components ([#58](https://github.com/teylabs/concierge/issues/58))
- Livewire starter kit pages, scaffolded with the kit's own components ([#41](https://github.com/teylabs/concierge/issues/41))
- A standalone portal served from a prebuilt bundle ([#32](https://github.com/teylabs/concierge/issues/32))
- A portal header with "return to app", the app's name and logo ([#33](https://github.com/teylabs/concierge/issues/33))
- A browser setup wizard, in the local environment only ([#34](https://github.com/teylabs/concierge/issues/34))
- Notification topics: choose who receives which alerts ([#50](https://github.com/teylabs/concierge/issues/50))
- A README hero: from a starter kit to working user management in two commands ([#13](https://github.com/teylabs/concierge/issues/13))

### 1.0: A Stable Promise

[Milestone 1.0](https://github.com/teylabs/concierge/milestone/6): a frozen PHP API and TypeScript contract, a support policy, complete docs and a release candidate.

- Decide the public API and mark the rest internal ([#35](https://github.com/teylabs/concierge/issues/35))
- Freeze the TypeScript contract, proven by a second frontend ([#36](https://github.com/teylabs/concierge/issues/36))
- A versioning and support policy ([#37](https://github.com/teylabs/concierge/issues/37))
- Complete documentation and an upgrade guide ([#38](https://github.com/teylabs/concierge/issues/38))
- A release candidate ([#39](https://github.com/teylabs/concierge/issues/39))

### After 1.0

[Milestone 1.x](https://github.com/teylabs/concierge/milestone/7), in no particular order:

- UUID and ULID keys ([#22](https://github.com/teylabs/concierge/issues/22))
- Magic-link sign-in ([#42](https://github.com/teylabs/concierge/issues/42))
