# Local Login

Local login signs in as an account named in configuration with one click, and creates the account on the first click. It is for local development, where typing a password into a throwaway account is friction. It is off by default and works without [membership](/features/membership).

```php
// config/concierge.php
'local_login' => [
    'enabled' => true,
    'account' => ['email' => 'dev@example.test', 'name' => 'Local developer'],
],
```

Then render the button on your login page ([below](#showing-the-button)).

## When It Is Available

Local login is available only when all of these hold, checked on every request:

| Check | Must be | Read from |
| --- | --- | --- |
| Laravel's environment | exactly `local` | the configuration cache if there is one, otherwise `.env` or the process |
| `APP_ENV` of the process serving the request | exactly `local` | `getenv`, then `$_SERVER` only when the process has none; never `$_ENV` or a cache |
| `concierge.local_login.enabled` | `true` | configuration |
| `concierge.local_login.account.email` | not empty | configuration |

Exact means exact: `Local`, ` local ` and an empty value all fail. When any check fails there is no offer, and `POST /local-login` responds 404 before the session starts and before CSRF verification, the guest check and the throttle, even when the route came from a cache built in `local`. The route is registered only when both environments are `local`.

This holds under php-fpm, `php artisan serve`, long-running workers such as Octane (the check runs per request, not per boot) and the console.

### Cached Configuration

With `config:cache` or `optimize`, Laravel stops reading `.env`, so a local configuration cache alone is not enough. Set `APP_ENV=local` in the environment of the process that serves requests:

```bash
php artisan config:cache
APP_ENV=local php artisan serve # without APP_ENV here, local login is off
```

For php-fpm, set `env[APP_ENV] = local` in the pool. A non-local process value always wins over `$_SERVER`, and Concierge never changes the application's environment.

## What It Does

- It adds `POST /local-login` (route `concierge.local-login.store`), with CSRF protection, the `guest` middleware for the configured guard and a per-IP throttle (`local_login.throttle`, default 10 a minute).
- The identity comes from configuration only; anything the browser sends is ignored.
- A new account gets a random password nobody knows, a verified address if the table has `email_verified_at`, and a name if it has `name`. `account.attributes` can fill other required columns, but never the identity or password.
- An existing account is signed in exactly as it is: nothing is saved, and its password, name, verification and roles are untouched. A soft-deleted match is not restored, and sign-in fails.
- It bypasses the password and two-factor for that account, and nothing else: it grants no roles, memberships or workspace, and it does not mark the session as recently authenticated.
- It signs in on `local_login.guard` (default: the application's default guard), which must use an Eloquent user provider.
- After signing in it redirects to the intended URL, then `local_login.redirect`, then `/`.
- No remember token is set, and the session ID and CSRF token are regenerated.

## Showing the Button

Your app decides where the button appears. Pass the offer to your login page; it is `null` unless local login is available right now:

```php
use Tey\Concierge\LocalAuth\LocalLogin;

'localLogin' => app(LocalLogin::class)->offer(),
```

Then render `LocalLoginButton` from the [Vue pages](/features/vue-pages#local-login-button). It renders nothing when the offer is `null`.

## Without Membership

An app that wants only local login, with no workspaces or permission tables, turns membership off:

```php
// config/concierge.php
'features' => ['membership' => false],
```

With that set, Concierge registers no membership bindings, no `concierge.member` middleware alias and no `concierge:sync-roles` command, and does not load its migration, so `php artisan migrate` needs no workspace or permission setup.

The switch is read while the package provider registers, so set it in `config/concierge.php`, not at runtime.

## Configuration

| Key | Default | Purpose |
| --- | --- | --- |
| `local_login.enabled` | `false` | Turns local login on |
| `local_login.account.email` | `null` | The account to sign in as. Required |
| `local_login.account.name` | `null` | The name for an account the click creates |
| `local_login.account.attributes` | `[]` | Extra columns for a created account |
| `local_login.identity` | `'email'` | The column the account is looked up and created by |
| `local_login.guard` | `null` | The guard to sign in on; `null` is the default guard |
| `local_login.redirect` | `null` | Where to go when there is no intended URL; `null` is `/` |
| `local_login.throttle` | `10` | Requests per minute per IP |
