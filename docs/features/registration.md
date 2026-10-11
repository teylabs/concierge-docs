# Registration

Registration gating decides who may create an account through your app's registration form. It is one setting, read from the environment, and concierge enforces it where the app creates accounts. With Fortify, which the starter kits use, `open`, `closed` and domain-only registration take effect with no app code; letting invited people in takes one hidden field. It works with or without [membership](/features/membership).

```dotenv
CONCIERGE_REGISTRATION=domains
CONCIERGE_REGISTRATION_DOMAINS=acme.com,acme.io
```

## Modes

| Mode | Who may register |
| --- | --- |
| `open` | Anyone. The default, so an app that upgrades keeps the registration it had. |
| `domains` | Anyone whose email is on one of `CONCIERGE_REGISTRATION_DOMAINS`, or who holds a valid invitation. |
| `invitation` | Only someone with a valid invitation, for the email the invitation was sent to. |
| `closed` | No one. The register page and the register request are a 404. Accounts come from your own code or a command. |

The published `config/concierge.php` reads both settings under `registration`:

```php
// config/concierge.php
'registration' => [
    'mode' => env('CONCIERGE_REGISTRATION', 'open'),
    'domains' => env('CONCIERGE_REGISTRATION_DOMAINS', ''),
],
```

`domains` takes a comma-separated string or an array. A leading `@` and surrounding spaces are ignored, and case does not matter.

## Fails Closed

Registration closes whenever the setting cannot be trusted:

- A mode that isn't one of the four (a typo, an empty value, `null`) counts as `closed`. Only a mode that is not set at all counts as `open`.
- `domains` mode with no domains counts as `closed`, and a warning in the log names `CONCIERGE_REGISTRATION_DOMAINS`.
- In `closed` mode a valid invitation does not open the door.

## Domains

The domain is the part of the email after the last `@`, compared case-insensitively, so `Jane@ACME.COM` matches `acme.com`. A subdomain matches only when it is listed itself: with `acme.com` alone, `jane@mail.acme.com` is refused. Someone on another domain can still register with a valid invitation.

## Invitations

In `invitation` and `domains` modes, a valid invitation admits the person it was sent to. A valid invitation is a pending, unexpired membership invitation, or [tenant invitation](/features/tenant-invitations) when that feature is on, whose email matches the one being registered, case-insensitively. With membership off, no invitation admits anyone.

The token is read from the request that creates the account, under `invitation`. It is the same token as in the invitation link, so a register page reached from `/register?invitation=TOKEN` should send it back in a hidden field named `invitation` ([With Fortify](#with-fortify) shows how). The token is checked on that request, not when the page is shown. Expired, revoked, already accepted and forged tokens, and a token for another email, are refused with a message that says what to do.

Registering does not accept the invitation. The person still verifies their email and accepts through your accept route, as before. Once accepted, the token no longer admits anyone.

## With Fortify

When `laravel/fortify` is installed, concierge wraps the user creator the app binds with `Fortify::createUsersUsing()` and the register view it binds with `Fortify::registerView()`. The gate runs without changes to your app's actions or routes:

- A refusal is a validation error on the email field, shown by your kit's own form. The kit's own validation still runs after the gate.
- In `closed` mode the register page and `POST /register` are a 404.
- The wrapping works whichever service provider boots first.
- The mode is read on each request, so changing it needs no route rebuild. With a cached configuration, run `php artisan config:cache` again after changing it.
- In `invitation` mode, and for invitees outside your domains in `domains` mode, the kit's register form has to send the invitation token back. Add a hidden `invitation` field, filled from `?invitation=` on the register page. Concierge will carry it for you once [#67](https://github.com/teylabs/concierge/issues/67) lands.

In the Vue starter kit, add the field to the register form in `resources/js/pages/auth/Register.vue`:

```vue
<script setup lang="ts">
import { usePage } from '@inertiajs/vue3';

// ...the kit's existing imports

const invitation = new URL(usePage().url, 'http://localhost').searchParams.get('invitation') ?? '';
</script>

<template>
    <!-- inside the kit's existing register <Form> -->
    <input type="hidden" name="invitation" :value="invitation" />
</template>
```

Reading the query from the Inertia page URL rather than `window.location` keeps it working with server-side rendering. A form built with `useForm()` instead of `<Form>` adds `invitation` to its data rather than an input.

## Without Fortify

Add the rule where your app validates registration:

```php
use Tey\Concierge\Rules\MayRegister;

Validator::make($input, [
    'email' => ['required', 'email', 'unique:users', new MayRegister],
    // ...
])->validate();
```

The rule reads the token from the validated data, then from the current request, under `invitation`. To read it from somewhere else, pass it in: `new MayRegister($token)`.

To decide without validating, call `Tey\Concierge\Registration\Registration`:

| Method | Returns |
| --- | --- |
| `Registration::decide($email, $token = null)` | A decision with `allowed`, a `refusal` reason and `message()` |
| `Registration::open()` | `true` only in `open` mode: whether a sign-in page should link to registration |
| `Registration::closed()` | `true` in `closed` mode and in every misconfigured state |

## Messages

| Refusal | Shown to the person |
| --- | --- |
| Closed or misconfigured | Registration is closed. |
| No invitation, `invitation` mode | Registration is by invitation. Use the link in your invitation. |
| Domain not allowed, no invitation | Registration is limited to approved email domains. Use your work email address, or the link in your invitation. |
| Unknown, forged or already accepted token | That invitation link is not valid. Use the link in your invitation, or ask to be invited again. |
| Expired | Your invitation has expired. Ask to be invited again. |
| Revoked | Your invitation was revoked. Ask to be invited again. |
| Another email | Register with the email address your invitation was sent to. |

Every message goes through `__()`, so a JSON language file can override it. The allowed domains are never shown.

## What Your App Still Decides

- Where a registered person lands. Registering creates the account; membership comes from accepting an invitation, or from your own code. In `domains` mode a matching person has an account and no workspace until they are invited or your app places them.
- Whether the sign-in page links to registration: read `Registration::open()` in the view, or share it as an Inertia prop.
- Captcha and rate limiting on the register route.

## Configuration

Both `registration` keys, with their types and defaults, are in [Configuration](/reference/configuration#registration).
