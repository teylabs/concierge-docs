# App-Wide Mode

App-wide mode is for an app with one organization. Invitations and roles apply to the whole app: there is no workspace model or table, and Spatie teams stay off.

> [!TIP]
> App-wide mode is an early feature. It is opt-in, and it completes in 0.8, which adds the upgrade from app-wide mode to workspaces ([#19](https://github.com/teylabs/concierge/issues/19)). Until then, its API may change.

## Choosing the Mode

The `mode` key in `config/concierge.php` says where invitations and roles apply:

| Value | Invitations and roles apply to | Spatie teams |
| --- | --- | --- |
| `'app'` | The whole app | Off (`permission.teams = false`) |
| `'workspaces'` | One workspace at a time, as in [membership](/features/membership) | On, except with [starter kit teams](/features/starter-kit-teams) |

Set it in the file itself, never from `.env`: it describes your schema, which every environment shares. Any other value throws `UnsupportedConfiguration` when the app boots.

Leaving the key unset changes nothing for an existing app. A config with no `mode` (or `null`) is app-wide, except for this transition rule: when `models.workspace` is set, the mode is `'workspaces'`. So an app set up for membership before 0.7 stays in workspace mode. `php artisan about` shows the mode, and flags one that came from the transition rule. The rule is removed at 1.0, so set `'mode' => 'workspaces'` before then.

## Setting Up

1. Implement `Tey\Concierge\Contracts\Member` on your user model, with Spatie's `HasRoles`, as in [Implementing the Contracts](/features/membership#implementing-the-contracts). The users table needs an incrementing integer key.
2. Publish the [spatie/laravel-permission](https://spatie.be/docs/laravel-permission) config and migrations, and leave `permission.teams` set to `false`.
3. Set the mode and the user model, and leave `models.workspace` empty:

    ```php
    // config/concierge.php
    'mode' => 'app',

    'models' => [
        'user' => App\Models\User::class,
        'workspace' => null,
    ],
    ```

4. Migrate, then create the configured roles:

    ```bash
    php artisan migrate
    php artisan concierge:sync-roles
    ```

5. Make the first owner:

    ```php
    use App\Models\User;
    use Tey\Concierge\Actions\EstablishOwner;

    EstablishOwner::run(User::where('email', 'owner@example.com')->firstOrFail());
    ```

With `permission.teams = true`, `concierge:sync-roles` and `EstablishOwner` throw `UnsupportedConfiguration`. [Tenant invitations](/features/tenant-invitations) give each invitee a workspace, so they need workspace mode: turning them on in app-wide mode fails at boot.

## The Accounts Table

The users table is the roster. Concierge keeps its own state for each user in a `concierge_accounts` row beside it, in both modes:

| Column | What it holds |
| --- | --- |
| `user_id` | The user's key, and the primary key. Deleting the user is restricted while the row exists; see [Deleting Accounts](#deleting-accounts) |
| `status` | `active` or `deactivated` ([Users](/features/users#deactivating-and-restoring)) |
| `invitation_id` | The invitation the user accepted, if any |
| `joined_at` | When they became an owner or accepted an invitation |
| `deactivated_at`, `deactivated_by_id`, `deactivation_reason` | Set while the account is deactivated |

In app-wide mode the migration creates `concierge_invitations` and `concierge_accounts`, with no membership or ownership tables. An app that installed an earlier release gets `concierge_accounts` on its next `php artisan migrate`.

A user without a row is an active account. Concierge creates the row when it first acts on that user, so your existing users need no backfill. `Concierge::account($user)` returns the row, or an unsaved active one. The model is `Tey\Concierge\Models\Account`; swap it for a subclass with `models.account`.

## Actions

Each is in `Tey\Concierge\Actions` and called with `::run()`. [Actions and Events](/reference/actions-and-events#app-wide-actions) lists their exceptions and events.

| Action | What it does |
| --- | --- |
| `EstablishOwner::run($user)` | Makes `$user` an active owner. It replaces their other roles with the owner role. It takes no actor, so call it from your own code, a command or a deploy script. Calling it again changes nothing. |
| `InviteUser::run($actor, $email, $grants)` | Invites an email into the app with the roles in a `GrantSet`. An email that already has an account is refused: change that user's roles instead, or restore them if they are deactivated. |
| `ChangeUserRoles::run($actor, $user, $grants)` | Replaces the user's roles. |
| `RemoveUser::run($actor, $user)` | Clears the user's roles and direct permissions, deletes their account row, then calls `delete()` on the user model. A model with `SoftDeletes` is soft deleted. |

`AcceptInvitation` and `InspectInvitation` work in both modes. In app-wide mode, accepting grants the invitation's roles to the whole app and records the invitation on the account row. `ResendInvitation` and `RevokeInvitation` are for workspace invitations only for now ([#79](https://github.com/teylabs/concierge/issues/79)).

The workspace actions (`EstablishWorkspace`, `InviteMember`, `ChangeMemberRoles` and the rest) throw `UnsupportedConfiguration` in app-wide mode, naming the app-wide action to use. The app-wide actions do the same in workspace mode.

The [Users pages](/features/users) and `UpdateUser`, `DeactivateUser` and `RestoreUser` build on the same rules.

## Who May Manage Whom

The default `Tey\Concierge\Contracts\AccountPolicy` reads the same `roles`, `managers` and ranks as the [grant policy](/reference/actions-and-events#who-may-call-them):

- The actor must have an active account and hold one of the `managers` roles.
- Nobody manages their own account.
- The actor must outrank the user, except that an owner may manage another owner.
- A role can be granted only by the roles in its `grantable_by`. An owner may also grant the owner role to another user.
- Your [account guard](/reference/actions-and-events#account-guard) is asked with `AccountGuard::MANAGE_ACCOUNT` and may refuse.

Owner is the top role, and several owners are allowed. Granting the owner role with `ChangeUserRoles` is how ownership passes on: there is no `TransferOwnership` in app-wide mode.

Bind your own class to `AccountPolicy` in a service provider to change these rules.

### The Last Owner

The last owner can never be removed or demoted. When an owner acts on another owner, and no other active owner would remain, the policy refuses with the code `last_owner`. Owners your account guard shields from management, such as an operator account, are not counted, so such an account is never left as the only owner.

Every app-wide write locks the account rows of every owner, the actor and the user before it checks, so two requests that could each remove an owner can't both succeed.

## Protecting Routes

The `concierge.member` middleware works in both modes. In app-wide mode it allows a request from any user whose account is active, and responds 403 otherwise.

## Deleting Accounts

Your app's own "delete account" form keeps working. When a user model is deleted, concierge deletes their account row first. A soft delete keeps the row, so restoring the user keeps their state.

In app-wide mode, deleting the last active owner is refused with a `ValidationException` on the `password` key: "This account is the last owner; make someone else an owner before deleting it." A starter kit's delete-account form shows errors on its password field, so the person sees the message instead of an error page.
