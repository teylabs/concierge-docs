# Installation

Concierge requires PHP 8.4 or 8.5 and Laravel 13.

```bash
composer require tey/concierge
```

The service provider is registered through Laravel package discovery. Composer also installs [spatie/laravel-permission](https://spatie.be/docs/laravel-permission) 8.x, which membership's roles build on.

Composer also installs [mod](https://mod.teylabs.com) (`tey/mod` ^0.6.1), which concierge uses to write files into your app. Your app needs no setup for it and no `config/mod.php`: it gains the `mod:*` Artisan commands, and `php artisan optimize` caches mod's discovery. [Vue pages](/features/vue-pages) shows how `mod:install inertia` wires concierge's frontend.

## Publishing the Configuration

```bash
php artisan vendor:publish --tag="concierge-config"
# -> config/concierge.php
```

Values in your `config/concierge.php` take precedence over the package defaults. [Configuration](/reference/configuration) lists every key, with its type and default.

## Choosing Features

Membership is on by default. Its migration reads your user and workspace models, so set those up before you run `php artisan migrate`. [Membership](/features/membership) gives the order. An app with one organization can set `'mode' => 'app'` instead and needs no workspace model; see [App-wide mode](/features/app-wide-mode).

An app that only wants [local login](/features/local-login) turns membership off first:

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
