# Vue Pages

Concierge includes optional Vue 3 pages for managing members and invitations, plus a local-login button that works without them. They ship inside the Composer package, in `vendor/tey/concierge/resources/js`. The PHP code never depends on them or on Inertia.

| Export | From | What it is |
| --- | --- | --- |
| `MembersPage`, `InviteMemberPage`, `MemberPage`, `AcceptInvitationPage` | `@tey/concierge` | Pages; each takes the matching generated `*PageProps` type as its props |
| `createConcierge({ adapter, labels?, locale? })` | `@tey/concierge` | The Vue plugin every page requires |
| `LocalLoginButton` | `@tey/concierge` | A plain form for one-click [local login](/features/local-login); needs no plugin and no Inertia |
| `Avatar` | `@tey/concierge` | A person's photo, or their initials on a stable colour; see [Avatars](/features/avatars) |
| `ConciergeAdapter`, `defaultLabels` and the generated contract types | `@tey/concierge` | Types for your own code |
| `createInertiaAdapter()` | `@tey/concierge/inertia` | The adapter for Inertia; the only module that imports `@inertiajs/vue3` |

Your app installs the peer dependencies: `vue ^3.5`, `tailwindcss ^4.1` and, for the Inertia adapter, `@inertiajs/vue3 ^3`.

## Adding the Pages to Your App

### 1. Vite

Alias the Composer-installed sources, and dedupe the framework packages so vendor files use your app's copies:

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

### 2. Tailwind

In your CSS entry, after `@import 'tailwindcss'`:

```css
/* resources/css/app.css */
@import '../../vendor/tey/concierge/resources/css/concierge.css';
```

This registers the package sources with `@source` and defines the `--concierge-*` variables. Override any variable in an unlayered `:root` rule to restyle the pages, including the [avatar colours](/features/avatars#colours).

### 3. The Plugin

Install it once, where your app creates the Vue app (in an Inertia app, `setup()` in `createInertiaApp`):

```ts
// resources/js/app.ts
import { createConcierge } from '@tey/concierge';
import { createInertiaAdapter } from '@tey/concierge/inertia';

app.use(createConcierge({ adapter: createInertiaAdapter() }));
```

### 4. Wrapper Pages

Your app keeps its layout, breadcrumbs and flash messages. Pass the server props straight through, and use slots for the surrounding chrome:

```vue
<AppLayout>
    <MembersPage v-bind="props">
        <template #breadcrumbs>…</template>
    </MembersPage>
</AppLayout>
```

Every page has the slots `header`, `breadcrumbs` and `aside`. `MembersPage` also has `empty`.

The members list and the member header show each person's [avatar](/features/avatars). Build each `UserSummary` with `UserSummary::for($user)`, and set `Concierge::avatarUsing()` if your app has photos.

## How the Pages Talk to Your Server

- The pages never build routes. They navigate and submit only to URLs from their props, and a `null` link hides the control. Your endpoints must still authorize every request: hidden UI is not security.
- Verbs: `POST` to invite, suspend, reinstate, transfer ownership, resend, accept and log out; `PUT` for role changes; `DELETE` to remove and revoke.
- The members search visits `metadata.refreshUrl` with the query parameters `search` and `status`. Empty values are left out.
- Validation errors keyed `email`, `roles` or `roles.N` show on their fields. Any other key, such as a policy denial, shows as a form-level alert.
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
