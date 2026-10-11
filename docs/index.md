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

## Install

```bash
composer require tey/concierge
```

Start with the [introduction](/guide/introduction), or see [what concierge covers](/roadmap) on the way to 1.0.
