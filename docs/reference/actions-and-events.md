# Actions and Events

Every public action Concierge ships, what it takes, who may call it, what it returns and throws, and every event it dispatches. Your controllers, commands and jobs call the actions; your listeners handle the events.

```php
// app/Http/Controllers/MemberController.php → destroy()
use Tey\Concierge\Actions\RemoveMembership;

RemoveMembership::run($request->user(), $membership);
```

Each action in `Tey\Concierge\Actions` is called with `::run(...)`, which resolves it from the container and passes the arguments to its `handle()` method. Each action that changes a membership, ownership or invitation runs in one database transaction: when it throws, nothing is written.

## Membership Actions

### EstablishWorkspace

```php
EstablishWorkspace::run(Workspace $workspace, Member $owner): Membership
```

Makes `$owner` an active member and the owner of `$workspace`, and gives them the `owner_role`.

- **Who may call it:** your own code. It checks no permission; call it when your app creates a workspace.
- **Returns:** the owner's `Membership`. Calling it again for the same owner returns the existing membership and changes nothing.
- **Throws:** `WorkspaceAlreadyEstablished` when the workspace already has a different owner. `UnsupportedConfiguration` when `permission.teams` is not `true` or the owner role does not exist.
- **Dispatches:** `WorkspaceEstablished`.

### InviteMember

```php
InviteMember::run(Member $actor, Workspace $workspace, string $email, GrantSet $grants): IssuedInvitation
```

Creates a pending invitation to `$workspace` for `$email` (trimmed and lowercased) with the roles in `$grants`, and queues its email when [delivery](/reference/configuration#invitations) is set up.

- **Who may call it:** a manager who may grant every role in `$grants` (see [Who May Call Them](#who-may-call-them)).
- **Returns:** `IssuedInvitation`, with `$invitation` and the one-time `$token`. Only the token's hash is stored.
- **Throws:** `AuthorizationException` from the grant policy. `ValidationException` when the email is invalid, the person is already an active or suspended member, an unexpired invitation is already pending for that email, or a role is not in the database yet (run `concierge:sync-roles`). An expired pending invitation for the same email is marked expired and replaced.
- **Dispatches:** `MemberInvited`.

`$grants` is a `Tey\Concierge\Support\GrantSet`, built from role names:

```php
use Tey\Concierge\Actions\InviteMember;
use Tey\Concierge\Support\GrantSet;

$issued = InviteMember::run($request->user(), $workspace, 'ada@example.com', new GrantSet(['presenter']));
```

### ResendInvitation

```php
ResendInvitation::run(Member $actor, Invitation $invitation): IssuedInvitation
```

Rotates the token (the old link stops working), renews the expiry, captures the roles again under the resender's current authority, records the resender as the inviter, and queues the email.

- **Who may call it:** a manager who may grant the invitation's roles.
- **Returns:** `IssuedInvitation` with the new token.
- **Throws:** `AuthorizationException` from the grant policy, or with code `cooldown` within `invitations.resend_cooldown_seconds` of the last send. `ValidationException` when the invitation is not pending or one of its roles no longer exists.
- **Dispatches:** `InvitationResent`.

### RevokeInvitation

```php
RevokeInvitation::run(Member $actor, Invitation $invitation): Invitation
```

Revokes an invitation so its link stops working.

- **Who may call it:** a manager of the invitation's workspace.
- **Returns:** the `Invitation`. Revoking a revoked invitation returns it unchanged.
- **Throws:** `AuthorizationException` from the grant policy. `ValidationException` when the invitation was already accepted.
- **Dispatches:** `InvitationRevoked`, unless it was already revoked.

### InspectInvitation

```php
InspectInvitation::run(?Member $user, string $token): InvitationInspection
```

Reads an invitation's state for your acceptance page. It writes nothing, and `AcceptInvitation` checks everything again.

- **Who may call it:** anyone holding the token, signed in or not (`$user` is `null` for a guest).
- **Returns:** `InvitationInspection`, with `$state` (an [`InvitationState`](#invitation-states)) and `$invitation` (`null` when the token matches nothing).
- **Throws:** nothing for an unknown token; the state is `Invalid`.

### AcceptInvitation

```php
AcceptInvitation::run(Member $user, string $token): Acceptance
```

Makes `$user` an active member of the invitation's workspace with the invitation's roles. A removed member who accepts a new invitation becomes active again. In app-wide mode it grants the roles to the whole app instead, and records the invitation on the user's account row.

- **Who may call it:** the signed-in invitee. Their email must match the invitation, and be verified.
- **Returns:** `Acceptance`, with `$membership` (`null` in app-wide mode, where `$account` holds the account row) and `$outcome`: `AcceptanceOutcome::Joined`, or `AcceptanceOutcome::AlreadyMember` when the user was already an active member (their roles are not changed) or already accepted this invitation.
- **Throws:** `InvitationRejected`, whose `$state` is the [`InvitationState`](#invitation-states) that stopped it.
- **Dispatches:** `InvitationAccepted`, except when the same user accepts the same invitation again.

`ResendInvitation` and `RevokeInvitation` are for workspace invitations only.

### ChangeMemberRoles

```php
ChangeMemberRoles::run(Member $actor, Membership $membership, GrantSet $grants): Membership
```

Replaces the member's roles in that workspace with the roles in `$grants`.

- **Who may call it:** a manager who outranks the member and may grant every role in `$grants`. Not on their own membership or the owner's.
- **Returns:** the `Membership`.
- **Throws:** `AuthorizationException` from the grant policy, or with code `not_member` when the membership was removed.
- **Dispatches:** `MemberRolesChanged`.

### SuspendMembership

```php
SuspendMembership::run(Member $actor, Membership $membership, ?string $reason = null): Membership
```

Suspends the membership. The member keeps their roles but is no longer active. `$reason` is stored, cut to 500 characters.

- **Who may call it:** a manager who outranks the member. Not on their own membership or the owner's.
- **Returns:** the `Membership`. Suspending a suspended membership returns it unchanged.
- **Throws:** `AuthorizationException` from the grant policy, or with code `not_member` when the membership was removed.
- **Dispatches:** `MembershipSuspended`, unless it was already suspended.

### ReinstateMembership

```php
ReinstateMembership::run(Member $actor, Membership $membership): Membership
```

Makes a suspended membership active again, with the roles it held.

- **Who may call it:** a manager who outranks the member. Not on their own membership or the owner's.
- **Returns:** the `Membership`. Reinstating an active membership returns it unchanged.
- **Throws:** `AuthorizationException` from the grant policy, or with code `not_member` when the membership was removed: a removed member must be invited again.
- **Dispatches:** `MembershipReinstated`, unless it was already active.

### RemoveMembership

```php
RemoveMembership::run(Member $actor, Membership $membership): Membership
```

Ends the membership in that workspace, and clears the member's roles and direct permissions there. The user, their content and their roles in other workspaces are untouched.

- **Who may call it:** a manager who outranks the member. Not on their own membership or the owner's.
- **Returns:** the `Membership`. Removing a removed membership returns it unchanged.
- **Throws:** `AuthorizationException` from the grant policy.
- **Dispatches:** `MembershipRemoved`, unless it was already removed.

### TransferOwnership

```php
TransferOwnership::run(Member $actor, Membership $recipient): Membership
```

Makes `$recipient` the workspace owner. The recipient gets the `owner_role`; the previous owner keeps their membership with the `transfer_demotes_to` role.

- **Who may call it:** the workspace's active owner, who confirmed their password within `recent_authentication_seconds`. The grant policy is not consulted.
- **Returns:** the recipient's `Membership`.
- **Throws:** `AuthorizationException` with code `not_owner` when `$actor` is not the active owner, `recent_auth_required` when the password was not confirmed recently, or `recipient_invalid` when the recipient is not another active member of the same workspace with a verified email.
- **Dispatches:** `OwnershipTransferred`.

### ForcePasswordReset

```php
ForcePasswordReset::run(Member $actor, Membership $membership, bool $resetTwoFactor = false): ForcedPasswordReset
```

Locks the member's account down: replaces the password with the hash of a random value nobody knows, replaces the remember-me token, deletes the person's sessions when the session driver is `database`, clears the configured two-factor columns when `$resetTwoFactor` is `true`, and sends a reset link through the user's own `sendPasswordResetNotification()`. See [Forced Password Reset](/features/forced-password-reset).

- **Who may call it:** a manager who outranks the member. Not on their own membership or the owner's. When `recent_authentication_seconds` is set, the actor must have confirmed their password within it. The [`AccountGuard`](#account-guard) must allow it.
- **Returns:** `Tey\Concierge\Support\ForcedPasswordReset`, with `$membership`, `bool $twoFactorReset` and `?int $sessionsEnded` (database session rows deleted, or `null` with any other session driver).
- **Throws:** `AuthorizationException` from the grant policy, with code `not_member` when the membership was removed, `recent_auth_required` when the password was not confirmed recently, or the denial your `AccountGuard` returns. `UnsupportedConfiguration` when the user model is not `Authenticatable` and `CanResetPassword`, the broker is not Laravel's, or `$resetTwoFactor` is `true` and none of `forced_password_reset.two_factor_columns` exist on the user table.
- **Dispatches:** `PasswordResetForced`.

### SyncRoleDefinitions

```php
SyncRoleDefinitions::run(): void
```

Creates each role in `roles` that does not exist yet, as a global Spatie role on the configured `guard`, then clears Spatie's permission cache. It deletes nothing.

- **Who may call it:** your own code, or the console as `php artisan concierge:sync-roles` (registered while membership is on).
- **Throws:** `UnsupportedConfiguration` when `permission.teams` is not `true`.

## App-Wide Actions

These need `'mode' => 'app'`; see [App-Wide Mode](/features/app-wide-mode). In workspace mode each throws `UnsupportedConfiguration` naming the workspace action to use. They check the [account policy](#account-policy) rather than the grant policy, and each runs in one database transaction that locks the account rows of every owner, the actor and the user.

### EstablishOwner

```php
EstablishOwner::run(Member $user): Account
```

Makes `$user` an active owner of the app: their roles are replaced with the `owner_role`, and their account row is created or made active.

- **Who may call it:** your own code. It takes no actor and checks no permission.
- **Returns:** the user's `Tey\Concierge\Models\Account`. Calling it again for an owner changes nothing. Several owners are allowed.
- **Throws:** `UnsupportedConfiguration` in workspace mode, or when `permission.teams` is `true`.
- **Dispatches:** `OwnerEstablished`, unless the user was already an owner.

### InviteUser

```php
InviteUser::run(Member $actor, string $email, GrantSet $grants): IssuedInvitation
```

Creates a pending app-wide invitation for `$email` (trimmed and lowercased) with the roles in `$grants`, and queues its email when [delivery](/reference/configuration#invitations) is set up. Accept it with [`AcceptInvitation`](#acceptinvitation).

- **Who may call it:** an active manager who may grant every role in `$grants`.
- **Returns:** `IssuedInvitation`, with `$invitation` and the one-time `$token`.
- **Throws:** `AuthorizationException` from the account policy. `ValidationException` when the email is invalid, a user with that email already exists ("change their roles instead", or "restore it instead" when deactivated), an unexpired invitation is already pending for it, or a role does not exist. An expired pending invitation for the same email is marked expired and replaced.
- **Dispatches:** `UserInvited`.

### ChangeUserRoles

```php
ChangeUserRoles::run(Member $actor, Member $user, GrantSet $grants): Account
```

Replaces the user's app-wide roles with the roles in `$grants`. Granting the owner role is how ownership passes on.

- **Who may call it:** an active manager who outranks the user and may grant every role in `$grants`. An owner may manage another owner, and grant or take away the owner role. Not on themselves, and never leaving no owner.
- **Returns:** the user's `Account`.
- **Throws:** `AuthorizationException` from the account policy.
- **Dispatches:** `UserRolesChanged`.

### RemoveUser

```php
RemoveUser::run(Member $actor, Member $user): Member
```

Clears the user's roles and direct permissions, deletes their account row, then calls `delete()` on the user model. A model with `SoftDeletes` is soft deleted. Content the user wrote and your other tables are yours to handle; listen to `UserRemoved`.

- **Who may call it:** the same as `ChangeUserRoles`, without the grant check.
- **Returns:** the user model.
- **Throws:** `AuthorizationException` from the account policy. `UnsupportedConfiguration` when the user model is not an Eloquent model.
- **Dispatches:** `UserRemoved`.

### UpdateUser

```php
UpdateUser::run(Member $actor, Member $user, ?string $name = null, ?string $email = null): Member
```

Writes another user's `name` and `email` attributes. A `null` argument leaves that field alone. See [Editing a User](/features/users#editing-a-user).

- **Who may call it:** the same as `RemoveUser`.
- **Returns:** the user model. Nothing is written when neither field changes.
- **Throws:** `AuthorizationException` from the account policy. `ValidationException` keyed `name` when the name is empty or longer than 255 characters, or `email` when the email is invalid, longer than 255 characters or used by another user (ignoring case). `UnsupportedConfiguration` when the user model is not an Eloquent model.
- **Dispatches:** `UserUpdated`, when a field changed.

## Account Actions

These work in both modes; see [Deactivating and Restoring](/features/users#deactivating-and-restoring). They check the [account policy](#account-policy). In workspace mode, bind your own policy to say who may call them.

### DeactivateUser

```php
DeactivateUser::run(Member $actor, Member $user, ?string $reason = null): Account
```

Marks the user's account row deactivated, replaces their remember-me token and, with the `database` session driver, deletes their sessions. Roles, memberships and API tokens are kept. `$reason` is trimmed and cut to 500 characters.

- **Who may call it:** the same as `RemoveUser`: not themselves, not the last owner, not someone of equal or higher rank.
- **Returns:** the user's `Account`.
- **Throws:** `AuthorizationException` from the account policy, or with code `already_deactivated`. `UnsupportedConfiguration` when the user model is not `Authenticatable`.
- **Dispatches:** `UserDeactivated`.

### RestoreUser

```php
RestoreUser::run(Member $actor, Member $user): Account
```

Makes a deactivated account active again, with the roles it had. No invitation is sent.

- **Who may call it:** the same as `DeactivateUser`.
- **Returns:** the user's `Account`.
- **Throws:** `AuthorizationException` from the account policy, or with code `not_deactivated`.
- **Dispatches:** `UserRestored`.

## Tenant Invitation Actions

These need `features.tenant_invitations` to be `true`. See [Tenant Invitations](/features/tenant-invitations).

### InviteTenant

```php
InviteTenant::run(Member $actor, string $email): IssuedTenantInvitation
```

Creates a pending tenant invitation for `$email` (trimmed and lowercased) and queues its email when [delivery](/reference/configuration#invitations) is set up.

- **Who may call it:** a platform owner (the `tenant_invitations.ability` Gate ability).
- **Returns:** `IssuedTenantInvitation`, with `$invitation` and the one-time `$token`.
- **Throws:** `AuthorizationException` when `$actor` is not a platform owner. `ValidationException` when the email is invalid, an unexpired invitation is already pending for it, or an invitation for it was already accepted and `tenant_invitations.allow_reinvite_after_accept` is `false`. An expired pending invitation for the same email is marked expired and replaced.
- **Dispatches:** `TenantInvited`.

### ResendTenantInvitation

```php
ResendTenantInvitation::run(Member $actor, TenantInvitation $invitation): IssuedTenantInvitation
```

Rotates the token (the old link stops working), renews the expiry and queues the email. The original inviter is kept. An invitation that lapsed without being accepted can be resent.

- **Who may call it:** a platform owner.
- **Returns:** `IssuedTenantInvitation` with the new token.
- **Throws:** `AuthorizationException` when `$actor` is not a platform owner, or with code `cooldown` within `invitations.resend_cooldown_seconds` of the last send. `ValidationException` when the invitation is not pending: accepted, revoked, or replaced by a newer invitation for the same email.
- **Dispatches:** `TenantInvitationResent`.

### RevokeTenantInvitation

```php
RevokeTenantInvitation::run(Member $actor, TenantInvitation $invitation): TenantInvitation
```

Revokes a tenant invitation so its link stops working.

- **Who may call it:** a platform owner.
- **Returns:** the `TenantInvitation`. Revoking a revoked invitation returns it unchanged.
- **Throws:** `AuthorizationException` when `$actor` is not a platform owner. `ValidationException` when the invitation was already accepted.
- **Dispatches:** `TenantInvitationRevoked`, unless it was already revoked.

### InspectTenantInvitation

```php
InspectTenantInvitation::run(?Member $user, string $token): TenantInvitationInspection
```

Reads a tenant invitation's state for your register or sign-in page. It writes nothing, and `AcceptTenantInvitation` checks everything again.

- **Who may call it:** anyone holding the token, signed in or not.
- **Returns:** `TenantInvitationInspection`, with `$state` (an [`InvitationState`](#invitation-states)) and `$invitation`, whose `email` is the address to lock your register form to (`null` when the token matches nothing).

### AcceptTenantInvitation

```php
AcceptTenantInvitation::run(Member $user, string $token): TenantAcceptance
```

Creates a workspace through your `Concierge::provisionWorkspaceUsing()` callback and makes `$user` its owner through `EstablishWorkspace`.

- **Who may call it:** the signed-in invitee. Their email must match the invitation, and be verified.
- **Returns:** `TenantAcceptance`, with `$invitation`, `$workspace`, `$membership` and `$outcome`: `TenantAcceptanceOutcome::Provisioned`, or `TenantAcceptanceOutcome::AlreadyProvisioned` when the same user accepts again (nothing changes).
- **Throws:** `InvitationRejected` with the [`InvitationState`](#invitation-states) that stopped it. `UnsupportedConfiguration` when no provisioner is set or it does not return a saved workspace model. `WorkspaceAlreadyEstablished` when the provisioner returns a workspace that already has another owner. Anything the provisioner throws. In every case the invitation stays pending.
- **Dispatches:** `WorkspaceEstablished`, then `TenantInvitationAccepted`.

## Local Login Action

### ResolveLocalAccount

```php
app(ResolveLocalAccount::class)(string $guard, string $identity, string $value, ?string $name, array $attributes): Authenticatable
```

In `Tey\Concierge\LocalAuth\Actions`. Finds the account whose `identity` column equals `value` through the guard's Eloquent user provider, or creates it the way [local login](/features/local-login#what-it-does) does. It is invokable rather than called with `::run()`. The `POST /local-login` route calls it with the `local_login` settings.

- **Who may call it:** your own code. It does not check the environment or `local_login.enabled`; `Tey\Concierge\LocalAuth\LocalLogin::isAvailable()` does.
- **Returns:** the existing account unchanged, or the new one.
- **Throws:** `Tey\Concierge\LocalAuth\Exceptions\LocalLoginRefused` when the guard does not use an Eloquent user provider, or the matching account is soft-deleted.

## Who May Call Them

The membership actions that manage other members ask the grant policy, `Tey\Concierge\Contracts\GrantPolicy`, before writing. The default policy reads `roles`, `managers` and the ranks from [configuration](/reference/configuration#roles). It denies with an `AuthorizationException` whose code is:

| Code | When |
| --- | --- |
| `not_member` | The actor is not an active member of the workspace, or the membership belongs to another workspace |
| `not_manager` | The actor holds none of the `managers` roles |
| `self` | The actor is acting on their own membership |
| `owner_protected` | The membership is the workspace owner's |
| `rank` | The member's highest role is equal to or above the actor's |
| `not_grantable` | A role is not grantable by any role the actor holds, or is the owner role |

Bind your own class to `Tey\Concierge\Contracts\GrantPolicy` in a service provider to change these rules. The tenant invitation actions check the `tenant_invitations.ability` Gate ability instead; see [Authorization](/features/tenant-invitations#authorization).

### Account Policy

The app-wide and account actions ask `Tey\Concierge\Contracts\AccountPolicy` instead. The default, `Tey\Concierge\Support\ConfiguredAccountPolicy`, reads the same configuration with the app-wide [ownership rules](/features/app-wide-mode#who-may-manage-whom), and denies with these codes:

| Code | When |
| --- | --- |
| `not_member` | The actor's account is deactivated |
| `not_manager` | The actor holds none of the `managers` roles |
| `self` | The actor is acting on their own account |
| `rank` | The user's highest role is equal to or above the actor's, and they are not both owners |
| `last_owner` | No other active owner would remain |
| `not_grantable` | A role is not grantable by any role the actor holds |

Bind your own class to `AccountPolicy` in a service provider to change these rules.

### Account Guard

`Tey\Concierge\Contracts\AccountGuard` is a veto your app can place on operations on particular accounts. `ForcePasswordReset` asks it with the operation `AccountGuard::FORCE_PASSWORD_RESET`, after the grant policy passes. The account policy asks it with `AccountGuard::MANAGE_ACCOUNT` before its rank rules, and an owner it shields is not counted as another owner for the last-owner rule:

```php
public function authorize(string $operation, Member $actor, Member $target): Response;
```

The default, `Tey\Concierge\Support\OpenAccountGuard`, allows everything. Bind your own class to `AccountGuard` in a service provider to protect an account; [Protecting Accounts](/features/forced-password-reset#protecting-accounts) has an example.

## Invitation States

`Tey\Concierge\Enums\InvitationState` is what the inspect actions return and what `InvitationRejected::$state` holds.

| State | Meaning | Workspace | Tenant |
| --- | --- | --- | --- |
| `Ready` | The signed-in user can accept | ✓ | ✓ |
| `RegisterRequired` | Valid and pending; no account exists for the invited email | ✓ | ✓ |
| `SignInRequired` | Valid and pending; an account exists for the invited email | ✓ | ✓ |
| `WrongAccount` | The signed-in user's email is not the invited email | ✓ | ✓ |
| `Unverified` | The signed-in user's email is not verified | ✓ | ✓ |
| `Expired` | The invitation lapsed | ✓ | ✓ |
| `Revoked` | The invitation was revoked | ✓ | ✓ |
| `Accepted` | The invitation was already accepted, by someone else or by a user who is no longer an active member | ✓ | ✓ |
| `AlreadyMember` | The signed-in user already accepted this invitation; for a workspace invitation, also when they are already an active member | ✓ | ✓ |
| `Invalid` | The token matches no invitation | ✓ | ✓ |
| `Suspended` | The signed-in user's membership of the workspace is suspended | ✓ | |
| `WorkspaceUnavailable` | The workspace's `conciergeAcceptsMembers()` returns `false` | ✓ | |
| `AuthorityLapsed` | The inviter may no longer grant the invitation's roles | ✓ | |
| `GrantsChanged` | A role was recreated or gained permissions since the invitation was sent | ✓ | |

App-wide invitations use the workspace column. For them, `Suspended` means the signed-in user's account is deactivated, and `WorkspaceUnavailable` does not apply.

`RegisterRequired` and `SignInRequired` are returned only to a guest. `AlreadyMember` for an active member is not a rejection: `AcceptInvitation` consumes the invitation and returns `AcceptanceOutcome::AlreadyMember`.

## Events

Every event is in `Tey\Concierge\Events`, is dispatched only after the transaction commits, and carries ids, never models. A listener that needs a workspace's tenant context must enter it itself. `actorId` is the user who called the action.

| Event | Dispatched when | Properties |
| --- | --- | --- |
| `WorkspaceEstablished` | `EstablishWorkspace` makes a user the owner of a workspace | `int $workspaceId`, `int $membershipId`, `int $userId` |
| `MemberInvited` | `InviteMember` creates an invitation | `int $workspaceId`, `int $invitationId`, `?int $actorId` |
| `InvitationResent` | `ResendInvitation` rotates a token | `int $workspaceId`, `int $invitationId`, `int $generation`, `?int $actorId` |
| `InvitationRevoked` | `RevokeInvitation` revokes an invitation | `int $workspaceId`, `int $invitationId`, `?int $actorId` |
| `InvitationAccepted` | `AcceptInvitation` consumes an invitation | `?int $workspaceId`, `int $invitationId`, `?int $membershipId` (both `null` for an app-wide invitation), `int $userId`, `string $outcome` (`joined` or `already_member`) |
| `MemberRolesChanged` | `ChangeMemberRoles` replaces a member's roles | `int $workspaceId`, `int $membershipId`, `list<string> $roles` (the new roles), `?int $actorId` |
| `MembershipSuspended` | `SuspendMembership` suspends a membership | `int $workspaceId`, `int $membershipId`, `?int $actorId` |
| `MembershipReinstated` | `ReinstateMembership` reinstates a membership | `int $workspaceId`, `int $membershipId`, `?int $actorId` |
| `MembershipRemoved` | `RemoveMembership` removes a membership | `int $workspaceId`, `int $membershipId`, `?int $actorId` |
| `OwnershipTransferred` | `TransferOwnership` changes the owner | `int $workspaceId`, `int $fromMembershipId`, `int $toMembershipId`, `?int $actorId` |
| `PasswordResetForced` | `ForcePasswordReset` locks an account down | `int $workspaceId`, `int $membershipId`, `int $userId`, `?int $actorId`, `bool $twoFactorReset`, `?int $sessionsEnded` |
| `OwnerEstablished` | `EstablishOwner` makes a user an owner | `int $userId` |
| `UserInvited` | `InviteUser` creates an app-wide invitation | `int $invitationId`, `?int $actorId` |
| `UserRolesChanged` | `ChangeUserRoles` replaces a user's roles | `int $userId`, `list<string> $roles` (the new roles), `?int $actorId` |
| `UserRemoved` | `RemoveUser` removes a user | `int $userId`, `?int $actorId` |
| `UserUpdated` | `UpdateUser` changes a name or email | `int $userId`, `?int $actorId`, `array $changes`: each changed field (`name` or `email`) with its `old` and `new` value |
| `UserDeactivated` | `DeactivateUser` deactivates an account | `int $userId`, `?int $actorId`, `?string $reason`, `?int $sessionsEnded` (database session rows deleted, or `null` with any other session driver) |
| `UserRestored` | `RestoreUser` restores an account | `int $userId`, `?int $actorId` |
| `TenantInvited` | `InviteTenant` creates a tenant invitation | `int $invitationId`, `?int $actorId` |
| `TenantInvitationResent` | `ResendTenantInvitation` rotates a token | `int $invitationId`, `int $generation`, `?int $actorId` |
| `TenantInvitationRevoked` | `RevokeTenantInvitation` revokes a tenant invitation | `int $invitationId`, `?int $actorId` |
| `TenantInvitationAccepted` | `AcceptTenantInvitation` provisions a workspace | `int $invitationId`, `int $workspaceId`, `int $membershipId`, `int $userId`, `string $outcome` (`provisioned`) |

`generation` counts sends: `1` for the first, plus one for each resend.

```php
// app/Listeners/WelcomeNewMember.php
<?php

namespace App\Listeners;

use Tey\Concierge\Events\InvitationAccepted;

class WelcomeNewMember
{
    public function handle(InvitationAccepted $event): void
    {
        if ($event->outcome !== 'joined') {
            return;
        }

        // ...look up the membership by $event->membershipId
    }
}
```
