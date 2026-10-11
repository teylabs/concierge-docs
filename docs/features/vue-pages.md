# Vue Pages

Concierge includes optional Vue 3 pages for managing members, users and invitations, plus a local-login button that works without them. They ship inside the Composer package, in `vendor/tey/concierge/resources/js`. The PHP code never depends on them or on Inertia.

| Export | From | What it is |
| --- | --- | --- |
| `MembersPage`, `InviteMemberPage`, `MemberPage` | `@tey/concierge` | Workspace pages; each takes the matching generated `*PageProps` type as its props |
| `UsersPage`, `InviteUserPage`, `UserPage` | `@tey/concierge` | App-wide pages, for [app-wide mode](/features/app-wide-mode); see [Users](/features/users) |
| `AcceptInvitationPage` | `@tey/concierge` | Accepting an invitation, in either mode |
| `createConcierge({ adapter, labels?, locale? })` | `@tey/concierge` | The Vue plugin every page requires |
| `LocalLoginButton` | `@tey/concierge` | A plain form for one-click [local login](/features/local-login); needs no plugin and no Inertia |
| `Avatar` | `@tey/concierge` | A person's photo, or their initials on a stable colour; see [Avatars](/features/avatars) |
| `ConciergeAdapter`, `defaultLabels` and the generated contract types | `@tey/concierge` | Types for your own code |
| `createInertiaAdapter()` | `@tey/concierge/inertia` | The adapter for Inertia; the only module that imports `@inertiajs/vue3` |

Your app installs the peer dependencies: `vue ^3.5`, `tailwindcss ^4.1` and, for the Inertia adapter, `@inertiajs/vue3 ^3`.

## Adding the Pages to Your App

Concierge declares its frontend to [mod](https://mod.teylabs.com), which Composer installs with it (`tey/mod` ^0.6.1). In a Vue starter kit app, mod wires it in for you.

### 1. Wire the Frontend with Mod

Preview the edits first. Nothing is written:

```bash
php artisan mod:install inertia --dry-run
```

Then apply them:

```bash
php artisan mod:install inertia
```

This adds:

- the `@tey/concierge` alias to `resolve.alias` in `vite.config.ts`, pointing at `vendor/tey/concierge/resources/js`;
- the matching `compilerOptions.paths` in `tsconfig.json`, for both `@tey/concierge` and `@tey/concierge/*`, and the package sources to `include`;
- `@source '../../vendor/tey/concierge/resources/js';` to `resources/css/app.css`, so Tailwind sees the classes the pages use.

When mod can't recognize one of these files, it prints the line to add by hand instead of editing it.

### 2. Import the Stylesheet

Mod does not import concierge's stylesheet, which defines the `--concierge-*` variables the pages are coloured with. In your CSS entry, after `@import 'tailwindcss'`:

```css
/* resources/css/app.css */
@import '../../vendor/tey/concierge/resources/css/concierge.css';
```

Override any variable in an unlayered `:root` rule to restyle the pages, including the [avatar colours](/features/avatars#colours).

### 3. The Plugin

Install it once, where your app creates the Vue app (in an Inertia app, `setup()` in `createInertiaApp`):

```ts
// resources/js/app.ts
import { createConcierge } from '@tey/concierge';
import { createInertiaAdapter } from '@tey/concierge/inertia';

app.use(createConcierge({ adapter: createInertiaAdapter() }));
```

### 4. Wrapper Pages

Your app keeps its layout, breadcrumbs and flash messages. Write the four workspace wrapper pages into your app with one command:

```bash
php artisan concierge:pages --dry-run
php artisan concierge:pages
```

It writes `Members.vue`, `InviteMember.vue`, `Member.vue` and `AcceptInvitation.vue` to `resources/js/pages/Concierge`. The three member pages use the starter kit's `@/layouts/AppLayout.vue`. They are yours to edit; render them with `Inertia::render('Concierge/Members')` and so on.

- `concierge:pages Admin` puts them in `resources/js/pages/Admin` instead, and `--in=<module>` places them in a module of your app's mod layout.
- A page that already exists stops the command and nothing is written. Pass `--skip-existing` to keep your copies, or `--force` to overwrite them.
- `--json` prints the plan or the result as JSON.

Mod lists the same recipe as `mod:concierge/pages`. The stubs are Vue only for now, and the Users pages have no stub yet.

To write a wrapper by hand, pass the server props straight through and use slots for the surrounding chrome:

```vue
<AppLayout>
    <MembersPage v-bind="props">
        <template #breadcrumbs>…</template>
    </MembersPage>
</AppLayout>
```

Every page has the slots `header`, `breadcrumbs` and `aside`. `MembersPage` and `UsersPage` also have `empty`, and `UsersPage` has `column` for [your own columns](/features/users#your-own-columns).

The members list and the member header show each person's [avatar](/features/avatars). Build each `UserSummary` with `UserSummary::for($user)`, and set `Concierge::avatarUsing()` if your app has photos.

## Wiring by Hand

Without mod's installer, or in an app it can't recognize, make the same edits yourself.

Alias the Composer-installed sources in Vite, and dedupe the framework packages so vendor files use your app's copies:

```ts
// vite.config.ts
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    // ...your existing plugins
    resolve: {
        alias: { '@tey/concierge': path.resolve('vendor/tey/concierge/resources/js') },
        dedupe: ['vue', '@inertiajs/vue3'],
    },
});
```

Mirror the alias in `tsconfig.json` `paths`: `@tey/concierge` → `index.ts`, and `@tey/concierge/*` → `*`.

Then import the stylesheet as in [step 2](#_2-import-the-stylesheet). It also registers the package sources with `@source`, so a hand-wired app needs no separate `@source` line. Install the [plugin](#_3-the-plugin) as above.

## How the Pages Talk to Your Server

- The pages never build routes. They navigate and submit only to URLs from their props, and a `null` link hides the control. Your endpoints must still authorize every request: hidden UI is not security.
- Verbs: `POST` to invite, suspend, reinstate, deactivate, restore, transfer ownership, resend, accept and log out; `PUT` for role and profile changes; `DELETE` to remove and revoke.
- The members search visits `metadata.refreshUrl` with the query parameters `search` and `status`. The users search adds `role`, and leaves `status` out while it is `active`. Empty values are left out.
- Validation errors keyed `name`, `email`, `roles` or `roles.N` show on their fields. Any other key, such as a policy denial, shows as a form-level alert.
- Repeated submits are ignored while a request is pending. Retry resends the identical request, so the endpoint must be idempotent.
- Ownership transfer requires typing the recipient's name. The server is expected to redirect through password confirmation.

## Local Login Button

`LocalLoginButton` renders a native `<form method="post">` to the URL in the offer. It does not need `createConcierge` or Inertia, only the Vite alias, the TypeScript paths and the CSS import from steps 1 and 2.

```vue
<script setup lang="ts">
import { LocalLoginButton, type LocalLoginOffer } from '@tey/concierge';

defineProps<{ localLogin: LocalLoginOffer | null; csrfToken: string }>();
</script>

<template>
    <LocalLoginButton :offer="localLogin" :csrf-token="csrfToken" />
</template>
```

On the server, pass the offer as the `localLogin` page prop ([Local login](/features/local-login#showing-the-button)).

| Prop | Type | Purpose |
| --- | --- | --- |
| `offer` | `LocalLoginOffer \| null` | `{ url, email }`. The button renders nothing when it is `null` or missing |
| `csrfToken` | `string`, required | The session's CSRF token: shared from the server with Inertia, or `csrf_token()` in Blade. Sent as the hidden `_token` field |
| `label` | `string` | Defaults to `Sign in as <email>` |
| `hint` | `string` | Defaults to a line saying it is for local development only and skips the password and two-factor |

The form sends the token and nothing else: the server signs in as the account in its own configuration. While the request is in flight the button is disabled and shows a spinner. Errors, such as a soft-deleted account, come back in the session error bag under `local_login`; your page decides whether to show them.
