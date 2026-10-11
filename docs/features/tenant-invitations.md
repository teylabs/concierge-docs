# Tenant Invitations

Tenant invitations are for an invite-only SaaS app: a platform owner invites an email, and accepting gives that person their own new workspace, which they own. There are no plans, quotas or billing.

They are separate from [membership](/features/membership) invitations, which bring someone into an existing workspace. Invitees can still use those inside their own workspace.

## Turning Them On

Tenant invitations are off by default: no table, rate limiter or Gate definition exists until you opt in. Set this in `config/concierge.php` before publishing migrations:

```php
// config/concierge.php
'features' => ['membership' => true, 'tenant_invitations' => true],

'tenant_invitations' => [
    'platform_owners' => ['owner@example.com'], // verified emails; or define the Gate ability yourself
],
```

Then publish the migration and migrate:

```bash
php artisan vendor:publish --tag="concierge-migrations"
php artisan migrate
```

The switch is read while the package provider registers, so it cannot be set at runtime.

## Actions

| Action | Who |
| --- | --- |
| `InviteTenant::run($actor, $email)` | platform owner |
| `ResendTenantInvitation::run($actor, $invitation)` | platform owner |
| `RevokeTenantInvitation::run($actor, $invitation)` | platform owner |
| `InspectTenantInvitation::run($user, $token)` | anyone holding the token |
| `AcceptTenantInvitation::run($user, $token)` | the invitee |

The actions live in `Tey\Concierge\Actions`. What each one returns, throws and dispatches, and the [invitation states](/reference/actions-and-events#invitation-states) the inspect action returns, are in [Actions and Events](/reference/actions-and-events#tenant-invitation-actions).

The `TenantInvitation` model has `outstanding()`, `lapsed()`, `accepted()` and `revoked()` scopes and `workspace` and `inviter` relations: enough for an admin page of tenants and pending, accepted and revoked invitations. `concierge.models.tenant_invitation` swaps the model.

`SignInRequired` and `RegisterRequired` reveal only whether the invited address has an account, only to someone holding a valid, pending token, and the inspect rate limiter bounds them. Invalid, expired, revoked and accepted tokens reveal nothing.

## Authorization

Platform ownership lives outside workspaces and permission teams. Every action that changes something checks one Gate ability, [`tenant_invitations.ability`](/reference/configuration#tenant-invitations) (default `concierge.manage-tenants`):

1. Define it yourself, for full control:

    ```php
    // app/Providers/AppServiceProvider.php → boot()
    use Illuminate\Support\Facades\Gate;

    Gate::define('concierge.manage-tenants', fn ($user) => $user->email === 'owner@example.com');
    ```

2. Otherwise Concierge defines it from `tenant_invitations.platform_owners`: a list of emails, compared case-insensitively. The signed-in account must also have a verified email.
3. With neither, everyone is denied.

Being a workspace owner or admin grants nothing here.

The check goes through the Gate, so a `Gate::before` callback that returns `true` (a super-admin bypass, Spatie's included) also grants this ability. To keep super-admins out of tenant management, return `null` for it:

```php
// app/Providers/AppServiceProvider.php → boot()
use Illuminate\Support\Facades\Gate;

Gate::before(function ($user, string $ability) {
    if ($ability === 'concierge.manage-tenants') {
        return null; // decided by the ability itself
    }

    // ...your super-admin check, returning true or null
});
```

## What Your App Provides

Concierge registers no routes for tenant invitations. Your app provides the following.

**The workspace.** Tell Concierge how to create it. The callback runs inside the acceptance transaction, and the invitee then becomes its owner through `EstablishWorkspace`. If the callback throws, nothing is written and the invitation stays pending.

```php
// app/Providers/AppServiceProvider.php → boot()
use App\Models\User;
use App\Models\Workspace;
use Tey\Concierge\Facades\Concierge;
use Tey\Concierge\Models\TenantInvitation;

Concierge::provisionWorkspaceUsing(fn (User $owner, TenantInvitation $invitation) => Workspace::create([
    'name' => $owner->name."'s workspace",
]));
```

**The link.** Without it nothing is emailed; you can still read the token from `InviteTenant`'s result.

```php
// app/Providers/AppServiceProvider.php → boot()
use Tey\Concierge\Facades\Concierge;
use Tey\Concierge\Models\TenantInvitation;

Concierge::tenantInvitationUrlUsing(fn (TenantInvitation $invitation, string $token) => url("/join/{$token}"));
```

**Register or sign in.** Call `InspectTenantInvitation` on the link, lock your register form to the invitation email, sign the user in, then call `AcceptTenantInvitation` and redirect into their new workspace. Accepting requires the account email to match the invitation and to be verified. Opening the invitation proves control of the inbox, so your registration may mark the email verified when it comes from a valid, pending invitation for that same email; Concierge does not do that for you.

**Routes outside the workspace.** The inspect and accept routes must sit outside any tenant or `concierge.member` middleware: there is no workspace yet.

**Throttling.** Concierge defines named rate limiters; apply them to your routes. The token limiters read a route parameter named `token`.

| Limiter | Applies per | Limit key |
| --- | --- | --- |
| `throttle:concierge-tenant-invitation-inspect` | IP and token | `tenant_invitations.throttle.inspect` |
| `throttle:concierge-tenant-invitation-accept` | IP, token and signed-in user | `tenant_invitations.throttle.accept` |
| `throttle:concierge-tenant-invitation-invite` | signed-in user (IP for a guest) | `tenant_invitations.throttle.invite` |

The limits and their defaults are in [Configuration](/reference/configuration#tenant-invitations).

## Multitenancy Packages

`Tey\Concierge\Jobs\DeliverTenantInvitation` is not tenant-aware, since an invitation exists before any workspace, and it resolves everything by id. An app using `spatie/laravel-multitenancy` with tenant-aware queues must list it, or the queue deletes the job for lacking a tenant and the email is never sent:

```php
// config/multitenancy.php
'not_tenant_aware_jobs' => [Tey\Concierge\Jobs\DeliverTenantInvitation::class],
```

The events (`TenantInvited`, `TenantInvitationResent`, `TenantInvitationRevoked`, `TenantInvitationAccepted`) are dispatched after commit and carry ids only, never a model or the current tenant. A listener that needs the workspace (`TenantInvitationAccepted::$workspaceId`) must enter its context itself.
