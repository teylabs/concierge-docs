# Installation

Concierge requires PHP 8.4 or 8.5 and Laravel 13.

```bash
composer require tey/concierge
```

The service provider is registered through Laravel package discovery. Composer also installs Concierge's dependencies:

- [spatie/laravel-permission](https://spatie.be/docs/laravel-permission) 8.x
- [lorisleiva/laravel-actions](https://laravelactions.com) 2.x
- [spatie/laravel-data](https://spatie.be/docs/laravel-data) 4.x

## Publishing the Configuration

```bash
php artisan vendor:publish --tag="concierge-config"
# -> config/concierge.php
```

Values in your `config/concierge.php` take precedence over the package defaults. The published file lists every key, with a comment on each.

## Choosing Features

Membership is on by default. Its migration reads your user and workspace models, so set those up before you run `php artisan migrate`. [Membership](/features/membership) gives the order.

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

The feature switches are read while the package provider registers, so set them in `config/concierge.php`, not at runtime.
