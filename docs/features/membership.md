# Membership

Membership gives an app invitations, memberships, ownership and role grants, each scoped to a workspace: the team or organization a user belongs to. It is on by default and builds on [spatie/laravel-permission](https://spatie.be/docs/laravel-permission) teams.

## Requirements

- Spatie permission **teams enabled** (`permission.teams = true`). Concierge throws `UnsupportedConfiguration` otherwise.
- Incrementing integer keys on the user and workspace tables. The package migration uses `foreignId`.
- A workspace model, even for a single-organization app: create exactly one workspace and use it everywhere.

## Setting Up, in Order

The package registers its migration automatically, and that migration reads your user and workspace models and tables. Any `php artisan migrate` after installing the package runs it, so put everything it reads in place first:

1. Define your user and workspace models and their migrations, and implement the [contracts](#implementing-the-contracts).
2. Publish the Spatie permission config and migrations, and set `permission.teams` to `true`.
3. Publish `config/concierge.php` and set the two models:

    ```php
    // config/concierge.php
    'models' => [
        'user' => App\Models\User::class,
        'workspace' => App\Models\Workspace::class,
    ],
    ```

4. Migrate, then create the configured roles:

    ```bash
    php artisan migrate
    php artisan concierge:sync-roles
    ```

If `migrate` runs before step 3, the Concierge migration fails with an `UnsupportedConfiguration` error naming the missing model setting.

## Implementing the Contracts

The user model implements `Tey\Concierge\Contracts\Member` and uses Spatie's `HasRoles`:

```php
// app/Models/User.php
<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Spatie\Permission\Traits\HasRoles;
use Tey\Concierge\Contracts\Member;

class User extends Authenticatable implements Member
{
    use HasRoles;

    public function conciergeEmail(): string
    {
        return $this->email;
    }

    public function conciergeHasVerifiedEmail(): bool
    {
        return $this->email_verified_at !== null;
    }

    public function conciergeDisplayName(): string
    {
        return $this->name;
    }
}
```

The workspace model implements `Tey\Concierge\Contracts\Workspace`:

```php
// app/Models/Workspace.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Tey\Concierge\Contracts\Workspace as ConciergeWorkspace;

class Workspace extends Model implements ConciergeWorkspace
{
    protected $fillable = ['name'];

    public function conciergeName(): string
    {
        return $this->name;
    }

    public function conciergeAcceptsMembers(): bool
    {
        return true;
    }
}
```

## Roles

Roles are listed in `config/concierge.php`, highest rank first. Each role names the roles allowed to grant it:

```php
// config/concierge.php
'roles' => [
    'owner' => ['label' => 'Owner', 'grantable_by' => []],
    'admin' => ['label' => 'Admin', 'grantable_by' => ['owner']],
    'presenter' => ['label' => 'Presenter', 'grantable_by' => ['owner', 'admin']],
],
```

Each role is a global Spatie role, and every assignment is scoped to a workspace. Run `php artisan concierge:sync-roles` after changing the list.

| Key | Default | Purpose |
| --- | --- | --- |
| `owner_role` | `'owner'` | The role held by a workspace's owner |
| `transfer_demotes_to` | `'admin'` | The role the previous owner keeps after a transfer |
| `managers` | `['owner', 'admin']` | Roles that may invite and manage members |
| `invitations.expires_after_days` | `7` | How long an invitation link works |
| `invitations.resend_cooldown_seconds` | `60` | Minimum time between resends |

## Actions

Every operation is an action class in `Tey\Concierge\Actions`, called with `::run()`. Actions that change a membership take the acting user first and check the grant rules before writing.

| Action | What it does |
| --- | --- |
| `EstablishWorkspace::run($workspace, $owner)` | Makes `$owner` the owner of a new workspace |
| `InviteMember::run($actor, $workspace, $email, $grants)` | Creates an invitation with the roles in `$grants` (a `Tey\Concierge\Support\GrantSet`) |
| `ResendInvitation::run($actor, $invitation)` | Rotates the token (the old link stops working) and renews the expiry |
| `RevokeInvitation::run($actor, $invitation)` | Revokes a pending invitation |
| `InspectInvitation::run($user, $token)` | Read-only state of an invitation, for the acceptance page |
| `AcceptInvitation::run($user, $token)` | Accepts the invitation and creates the membership |
| `ChangeMemberRoles::run($actor, $membership, $grants)` | Replaces a member's roles |
| `SuspendMembership::run($actor, $membership, $reason)` | Suspends a membership; `$reason` is optional |
| `ReinstateMembership::run($actor, $membership)` | Restores a suspended membership with the roles it held |
| `RemoveMembership::run($actor, $membership)` | Ends membership in that workspace only |
| `TransferOwnership::run($actor, $recipient)` | Makes another member the owner |

```php
use App\Models\User;
use App\Models\Workspace;
use Tey\Concierge\Actions\EstablishWorkspace;

$owner = User::where('email', 'owner@example.com')->firstOrFail();
$workspace = Workspace::create(['name' => 'Acme']);

EstablishWorkspace::run($workspace, $owner);
```

Actions that change something dispatch an event from `Tey\Concierge\Events`, such as `MemberInvited` and `OwnershipTransferred`.

## Protecting Routes

The `concierge.member` middleware allows a request only from an active member of the current workspace. With no current workspace it responds 404; for anyone else it responds 403.

```php
// routes/web.php
Route::middleware(['auth', 'concierge.member'])->group(function () {
    // ...
});
```

The current workspace defaults to the current Spatie permission team.

## What Your App Provides

Concierge provides the domain actions, events, models and optional [Vue pages](/features/vue-pages). Your app provides:

- controllers, routes and policies that call the actions
- authentication (login, Fortify, password setup and confirmation)
- the workspace context, and creating the first workspace and its owner
- the invitation URL. Without it, no invitation email is sent:

```php
// app/Providers/AppServiceProvider.php → boot()
use Tey\Concierge\Facades\Concierge;

Concierge::invitationUrlUsing(fn ($invitation, string $token) => url("/invitations/{$token}"));
```

Hiding a control in the UI is not authorization: enforce every action on the server.
