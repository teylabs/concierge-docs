---
layout: home
title: 'Concierge: Front of House for Laravel'
titleTemplate: false

hero:
  name: Concierge
  text: Front of House for Laravel
  tagline: A standard suite of essentials for every Laravel app you build.
  image:
    light: /logo-light.svg?v=1
    dark: /logo-dark.svg?v=1
    alt: Concierge
  actions:
    - theme: brand
      text: Get started
      link: /guide/introduction
    - theme: alt
      text: What concierge covers
      link: /roadmap
    - theme: alt
      text: GitHub
      link: https://github.com/teylabs/concierge

features:
  - title: Membership
    details: Invitations, memberships, ownership and role grants scoped to a workspace.
    link: /features/membership
  - title: Tenant invitations
    details: A platform owner invites an email, and accepting gives that person their own new workspace.
    link: /features/tenant-invitations
  - title: Local login
    details: One-click sign-in as a configured account, in the local environment only.
    link: /features/local-login
  - title: Vue pages
    details: Optional Vue 3 pages for members, invitations and accepting an invitation.
    link: /features/vue-pages
---

Concierge adds a standard suite of essentials and plumbing beyond Laravel's starter kits, so every app you build has a consistent foundation between `laravel new` and the product you're building.

## Glue, With the Decisions Made

Concierge doesn't reinvent the parts. It builds on the packages you'd choose anyway, such as spatie/laravel-permission for roles, and on your starter kit's own sign-in. What it adds is carefully crafted glue between them, with the decisions already figured out for you:

- who may invite whom, and at what role
- that the last owner can't be removed or demoted
- that an invitation belongs to one email, expires and can be revoked
- that local login can never reach production

Each decision is tested, and each one fires an event or reads a setting, so your app can react or choose differently when it needs to.

## Install

```bash
composer require tey/concierge
```

Start with the [introduction](/guide/introduction), or see [what concierge covers](/roadmap) on the way to 1.0.
