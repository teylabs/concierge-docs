# Configuration

Every key in `config/concierge.php`, with its type, default and what it does, grouped by feature.

Publish the file to change any of them:

```bash
php artisan vendor:publish --tag="concierge-config"
# -> config/concierge.php
```

Only the two `registration` keys read environment variables, `CONCIERGE_REGISTRATION` and `CONCIERGE_REGISTRATION_DOMAINS`. Set every other value in the file itself. Local login also checks `APP_ENV` directly; see [When It Is Available](/features/local-login#when-it-is-available).

## Mode

| Key | Type | Default | What it does |
| --- | --- | --- | --- |
| `mode` | `'app'`, `'workspaces'` or `null` | `null` | Where invitations and roles apply. `'app'` is the whole app, with Spatie teams off and no workspace model ([App-Wide Mode](/features/app-wide-mode)). `'workspaces'` is one workspace at a time ([Membership](/features/membership)). `null` is `'app'`, except that while `models.workspace` is set it is `'workspaces'`: that transition rule is removed at 1.0. Any other value throws `UnsupportedConfiguration` at boot. |
| `workspaces.engine` | `'concierge'`, `'kit'` or `null` | `'concierge'` | Read in workspace mode only. `'concierge'` keeps members in concierge's own tables, with Spatie teams on. `'kit'` reads a starter kit's teams and never writes them, with Spatie teams off ([Starter Kit Teams](/features/starter-kit-teams)). `null` is `'concierge'`. |

Both describe your schema, so set them in `config/concierge.php`, never from the environment. `php artisan about` shows the mode and the engine.

## Features

| Key | Type | Default | What it does |
| --- | --- | --- | --- |
| `features.membership` | `bool` | `true` | Turns [membership](/features/membership) on. Only `false` turns it off. When off, Concierge registers no membership bindings, no `concierge.member` or `concierge.active` middleware alias and no `concierge:sync-roles` command, and does not run its migrations. |
| `features.tenant_invitations` | `bool` | `false` | Turns [tenant invitations](/features/tenant-invitations) on. Only `true` turns it on, and only while membership is on. When off, there is no tenant invitations migration, rate limiter or Gate definition. Workspace mode only: with `'mode' => 'app'` it fails at boot. |

Both switches are read while the package provider registers, so set them in `config/concierge.php`, not at runtime. Set `features.tenant_invitations` before publishing migrations.

## Models

| Key | Type | Default | What it does |
| --- | --- | --- | --- |
| `models.user` | `class-string` or `null` | `null` | Your user model. Required for membership. It must be an Eloquent model implementing `Tey\Concierge\Contracts\Member`, use Spatie's `HasRoles` and have an incrementing integer key. |
| `models.workspace` | `class-string` or `null` | `null` | Your workspace model. Required in workspace mode, and left `null` in app-wide mode. It must be an Eloquent model implementing `Tey\Concierge\Contracts\Workspace`, with an incrementing integer key. |
| `models.membership` | `class-string` | `Tey\Concierge\Models\Membership` | The membership model. Swap it for a subclass. |
| `models.ownership` | `class-string` | `Tey\Concierge\Models\Ownership` | The ownership model. Swap it for a subclass. |
| `models.invitation` | `class-string` | `Tey\Concierge\Models\Invitation` | The workspace invitation model. Swap it for a subclass. |
| `models.tenant_invitation` | `class-string` | `Tey\Concierge\Models\TenantInvitation` | The tenant invitation model. Swap it for a subclass. |
| `models.account` | `class-string` | `Tey\Concierge\Models\Account` | The [account](/features/app-wide-mode#the-accounts-table) model, one row per user in `concierge_accounts`. Swap it for a subclass. |

The package migrations read `models.user` and, in workspace mode, `models.workspace` to find your tables. With a required one missing or invalid, Concierge throws `Tey\Concierge\Exceptions\UnsupportedConfiguration` naming the key. [Membership](/features/membership#setting-up-in-order) gives the setup order.

## Roles

| Key | Type | Default | What it does |
| --- | --- | --- | --- |
| `guard` | `string` or `null` | `null` | The guard name of Concierge's Spatie roles, used when `concierge:sync-roles` creates them and when Concierge looks them up. `null` is `auth.defaults.guard`. |
| `roles` | `array<string, array>` | `owner`, `admin`, `presenter` | The roles, keyed by name, ordered highest rank first. A member outranks another when their highest role comes earlier in this list. |
| `roles.*.label` | `string` | `'Owner'`, `'Admin'`, `'Presenter'` | A display name for your app's UI. Concierge itself does not read it. |
| `roles.*.grantable_by` | `list<string>` | see below | The roles whose holders may grant this role. The owner role is never grantable, whatever this says. |
| `owner_role` | `string` | `'owner'` | The role a workspace's owner holds. `EstablishWorkspace` and `TransferOwnership` assign it. |
| `transfer_demotes_to` | `string` | `'admin'` | The role the previous owner holds after `TransferOwnership`. |
| `managers` | `list<string>` | `['owner', 'admin']` | Roles whose holders may manage members: invite, resend and revoke invitations, change roles, suspend, reinstate and remove. |

The default roles:

```php
// config/concierge.php
'roles' => [
    'owner' => ['label' => 'Owner', 'grantable_by' => []],
    'admin' => ['label' => 'Admin', 'grantable_by' => ['owner']],
    'presenter' => ['label' => 'Presenter', 'grantable_by' => ['owner', 'admin']],
],
```

Each role is a global Spatie role (team `null`). In workspace mode every assignment is scoped to a workspace; in app-wide mode it applies to the whole app, and the owner role may be held by several owners. Run `php artisan concierge:sync-roles` after changing the list: it creates missing roles and deletes none. An action that assigns a role that does not exist throws `UnsupportedConfiguration`.

The rules these keys feed are listed under [Who May Call Them](/reference/actions-and-events#who-may-call-them).

## Invitations

| Key | Type | Default | What it does |
| --- | --- | --- | --- |
| `invitations.expires_after_days` | `int` | `7` | Days an invitation link works, counted from when it is created or resent. Applies to workspace and tenant invitations. |
| `invitations.resend_cooldown_seconds` | `int` | `60` | Minimum seconds between creating or resending an invitation and resending it again. Applies to workspace and tenant invitations. |
| `invitations.deliver` | `bool` | `true` | Whether invitation emails are sent. Set `false` to create invitations without emailing them. Emails also need an invitation URL: see [What Your App Provides](/features/membership#what-your-app-provides). |

## Tenant Invitations

Read only when `features.tenant_invitations` is `true`.

| Key | Type | Default | What it does |
| --- | --- | --- | --- |
| `tenant_invitations.ability` | `string` | `'concierge.manage-tenants'` | The Gate ability every changing tenant invitation action checks. Define it yourself, or let Concierge define it from `platform_owners`. |
| `tenant_invitations.platform_owners` | `list<string>` | `[]` | Emails allowed to manage tenant invitations, compared case-insensitively. The account's email must also be verified. Used only when your app does not define the ability itself. |
| `tenant_invitations.allow_reinvite_after_accept` | `bool` | `false` | When `true`, an email whose invitation was already accepted can be invited again, and accepting creates an additional workspace. When `false`, `InviteTenant` fails validation with "That email already has a workspace." |
| `tenant_invitations.throttle.inspect` | `int` | `30` | Requests per minute for the `concierge-tenant-invitation-inspect` limiter. |
| `tenant_invitations.throttle.accept` | `int` | `10` | Requests per minute for the `concierge-tenant-invitation-accept` limiter. |
| `tenant_invitations.throttle.invite` | `int` | `20` | Requests per minute for the `concierge-tenant-invitation-invite` limiter. |

[Tenant Invitations](/features/tenant-invitations#what-your-app-provides) shows how to apply the limiters to your routes.

## Recent Authentication

| Key | Type | Default | What it does |
| --- | --- | --- | --- |
| `recent_authentication_seconds` | `int` or `null` | `null` | How long after confirming their password the owner may call `TransferOwnership`. `null` is `auth.password_timeout`, or 10800 seconds (three hours) when that is not set. When it is set, `ForcePasswordReset` also requires the manager to have confirmed their password within it; when `null`, `ForcePasswordReset` does not check. |

The default check reads the `auth.password_confirmed_at` session value that Laravel's password confirmation sets, for the signed-in user only.

## Registration

| Key | Type | Default | What it does |
| --- | --- | --- | --- |
| `registration.mode` | `string` | `'open'`, from `CONCIERGE_REGISTRATION` | Who may [register](/features/registration): `open`, `domains`, `invitation` or `closed`. Any other value, including an empty one, counts as `closed`. |
| `registration.domains` | `string` or `list<string>` | `''`, from `CONCIERGE_REGISTRATION_DOMAINS` | The email domains allowed in `domains` mode, comma-separated or as an array. Compared case-insensitively; a subdomain matches only when listed. With none, `domains` mode counts as `closed`. |

The mode is read on each request. With Fortify installed it takes effect with no app code; otherwise add the `MayRegister` rule ([Without Fortify](/features/registration#without-fortify)).

## Forced Password Reset

| Key | Type | Default | What it does |
| --- | --- | --- | --- |
| `forced_password_reset.broker` | `string` or `null` | `null` | The password broker (`auth.passwords`) that issues the reset link. `null` is the default broker. |
| `forced_password_reset.two_factor_columns` | `list<string>` | `['two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at']` | The user columns set to `null` when a reset asks for two-factor to be reset. Only those on the user table are cleared; with none present, asking throws `UnsupportedConfiguration`. |

[Forced Password Reset](/features/forced-password-reset) explains sessions and the account guard.

## Local Login

| Key | Type | Default | What it does |
| --- | --- | --- | --- |
| `local_login.enabled` | `bool` | `false` | Turns [local login](/features/local-login) on. Only `true` turns it on, and only in the `local` environment. |
| `local_login.account.email` | `string` or `null` | `null` | The identity value of the account to sign in as. Required: local login is unavailable while it is empty. |
| `local_login.account.name` | `string` or `null` | `null` | The name for an account the click creates. `null` derives one from the email, so `dev@example.test` becomes `Dev`. |
| `local_login.account.attributes` | `array<string, mixed>` | `[]` | Extra columns for an account the click creates. The identity and password columns are ignored here. |
| `local_login.identity` | `string` | `'email'` | The column the account is looked up and created by. |
| `local_login.guard` | `string` or `null` | `null` | The guard to sign in on; it must use an Eloquent user provider. `null` is `auth.defaults.guard`. |
| `local_login.redirect` | `string` or `null` | `null` | Where to go after signing in when there is no intended URL. `null` is `/`. |
| `local_login.throttle` | `int` | `10` | Requests per minute per IP for `POST /local-login`. |
