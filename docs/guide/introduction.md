# Introduction

Concierge adds a standard suite of essentials and plumbing beyond Laravel's starter kits, so every app you build has a consistent foundation between `laravel new` and the product you're building.

```bash
composer require tey/concierge
```

> [!NOTE]
> Concierge is pre-1.0. Minor releases may change the API until 1.0.

## What Ships Today

Each feature is set in `config/concierge.php`.

| Feature | What you get | Default |
| --- | --- | --- |
| [Membership](/features/membership) | Invitations, memberships, ownership and role grants scoped to a workspace | On |
| [Tenant invitations](/features/tenant-invitations) | A platform owner invites an email; accepting gives that person their own new workspace | Off |
| [Registration](/features/registration) | Who may create an account: anyone, allowed email domains, invitation only, or no one | `open` |
| [Forced password reset](/features/forced-password-reset) | A manager locks an account down and the person receives a reset link | With membership |
| [Local login](/features/local-login) | One-click sign-in as a configured account, in the `local` environment only | Off |

[Vue pages](/features/vue-pages) for membership and a local-login button are included as optional Vue 3 components, with [avatars](/features/avatars) for people without a photo. The PHP code never depends on them.

Local login and registration work without membership, so an app can use either alone.

## What Your App Provides

Concierge provides the [actions and events](/reference/actions-and-events), models and optional Vue pages. Your app keeps its own:

- routes, controllers and policies that call the actions
- authentication: login, registration, password confirmation (a starter kit or Fortify)
- layout, navigation and flash messages

Each feature page lists exactly what it expects from the app.

## What Comes Next

The road to 1.0 is planned in public: concierge as a starter kit extension, built on mod, with app-wide user management, setup in one command, and pages scaffolded into each starter kit with its own components. See [What concierge covers](/roadmap).
