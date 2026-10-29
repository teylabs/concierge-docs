# Installation

Concierge requires PHP 8.4 or 8.5 and Laravel 13.

```bash
composer require tey/concierge
```

The service provider is registered through Laravel package discovery. Composer also installs [spatie/laravel-permission](https://spatie.be/docs/laravel-permission) 8.x, which membership's roles build on.

Composer also installs [mod](https://mod.teylabs.com) (`tey/mod` ^0.6.1), which concierge uses to write files into your app. Your app needs no setup for it and no `config/mod.php`: it gains the `mod:*` Artisan commands, and `php artisan optimize` caches mod's discovery. [Vue pages](/features/vue-pages) shows how `mod:install inertia` wires concierge's frontend.

## Setting Up

```bash
php artisan concierge:install
```

`concierge:install` detects your starter kit (Vue, React, Svelte, Livewire or none, and WorkOS AuthKit), your sign-in, your user model and any team or organization model. It asks only what it can't detect:

- whether to use a team model it found as workspaces (`--workspace-model=`);
- app-wide or workspace mode, app-wide by default (`--mode=`);
- whether to turn on [local login](/features/local-login) when the app has no sign-in (`--local-login`).

`--no-interaction` takes the defaults, and `--dry-run --json` shows the plan without changing anything. The command then publishes and configures Spatie permission (teams on only for workspace mode on concierge's own engine), writes `config/concierge.php`, migrates and creates the configured roles. It prints one line per step:

```text
permission-config: done (published config/permission.php)
permission-teams: done (teams off)
permission-migrations: done (published create_permission_tables)
concierge-config: done (wrote config/concierge.php, mode app)
user-model: already (App\Models\User implements Member)
migrate: done (migrated)
roles: done (owner, admin, member)
first-owner: manual (set CONCIERGE_OWNERS and run php artisan concierge:owners)
```

It never edits your models. If the user or workspace model is missing concierge's contract, it prints the exact lines to add and stops before migrating; add them and run it again. Running it again changes nothing that is already set up. [Membership](/features/membership) explains the contract methods, and [App-wide mode](/features/app-wide-mode) the mode with one organization.

## Before Setup

`composer require tey/concierge` alone doesn't change your app. Until `config/concierge.php` exists, concierge registers no migrations, routes, middleware, listeners or commands other than `concierge:install`, so `php artisan migrate` creates no concierge tables. `php artisan about` shows whether concierge is set up and, when it isn't, the command to run.

To keep concierge unregistered while the file exists, set `'setup' => false` in it.

## Choosing Features

An app that only wants [local login](/features/local-login) turns membership off in `config/concierge.php`:

```php
// config/concierge.php
'features' => ['membership' => false],
```

With membership off, `php artisan migrate` needs no workspace or permission setup.

| Feature | Switch | Default |
| --- | --- | --- |
| [Membership](/features/membership) | `features.membership` | `true` |
| [Tenant invitations](/features/tenant-invitations) | `features.tenant_invitations` | `false` |
| [Local login](/features/local-login) | `local_login.enabled` | `false` |

[Registration](/features/registration) is not a switch but a mode, `CONCIERGE_REGISTRATION`, and it defaults to `open`.

The feature switches are read while the package provider registers, so set them in `config/concierge.php`, not at runtime.

## Upgrading from 0.9

Nothing to do. An app that already uses concierge has its own `config/concierge.php`, so it counts as set up and behaves as before. `concierge:install` on such an app reads its mode and models from the config, reports what is in place, and changes nothing it finds set up.
