# Forced Password Reset

A forced password reset locks an account down when it may be compromised. A manager calls one action, and the person's password is replaced with one nobody knows, their remember-me token and [sessions](#sessions) end, two-factor is cleared when asked, and they receive a password reset link. It is part of [membership](/features/membership).

```php
// app/Http/Controllers/MemberController.php → forcePasswordReset()
use Tey\Concierge\Actions\ForcePasswordReset;

ForcePasswordReset::run($request->user(), $membership, resetTwoFactor: true);
```

## Who May Call It

The target is a `Membership`, because a manager's authority comes from a workspace. The same rules apply as for suspending or removing a member:

- The actor is an active manager of the membership's workspace and outranks the member.
- Not on their own membership, and not on the workspace owner's.
- Not on a removed membership.
- When `recent_authentication_seconds` is set, the actor confirmed their password within it.
- Your app's [account guard](#protecting-accounts) allows it.

Each failure is an `AuthorizationException` with a [code](/reference/actions-and-events#who-may-call-them), and nothing about the account changes.

## What It Does

In one database transaction:

1. The password column becomes the hash of a random 64-character string that is never stored or returned. No known password is ever set.
2. The remember-me token is replaced.
3. With the `database` session driver, the person's rows in the sessions table are deleted.
4. With `resetTwoFactor: true`, the two-factor columns in [`forced_password_reset.two_factor_columns`](/reference/configuration#forced-password-reset) that exist on the user table are set to `null`. Fortify's three are the default.
5. A token is created on the password broker and sent with the user's own `sendPasswordResetNotification()`, so `ResetPassword::createUrlUsing()` and your own notification apply. The broker's throttle does not apply: this is an admin action.

After the transaction commits, it dispatches `PasswordResetForced`. The action returns a `ForcedPasswordReset` with `$membership`, `$twoFactorReset` and `$sessionsEnded`.

## Sessions

Only the `database` session driver can list a person's sessions, so only there does concierge delete them, and `sessionsEnded` is the number of rows deleted. With any other driver, `sessionsEnded` is `null`: add Laravel's `AuthenticateSession` middleware to your authenticated routes, and it signs out any session whose stored password hash no longer matches.

API tokens (Sanctum, Passport) are not touched. Listen to `PasswordResetForced` to revoke them.

## Protecting Accounts

`Tey\Concierge\Contracts\AccountGuard` lets your app veto a forced reset for particular accounts, such as a platform operator's. It is checked after the workspace rules pass. The default allows everything. Bind your own in a service provider:

```php
// app/Providers/AppServiceProvider.php → register()
use Tey\Concierge\Contracts\AccountGuard;

$this->app->bind(AccountGuard::class, OperatorAccountGuard::class);
```

```php
// app/Auth/OperatorAccountGuard.php
<?php

namespace App\Auth;

use Illuminate\Auth\Access\Response;
use Tey\Concierge\Contracts\AccountGuard;
use Tey\Concierge\Contracts\Member;

class OperatorAccountGuard implements AccountGuard
{
    public function authorize(string $operation, Member $actor, Member $target): Response
    {
        return $target->conciergeEmail() === config('app.operator_email')
            ? Response::deny('The operator account is protected.', 'operator_protected')
            : Response::allow();
    }
}
```

`$operation` is `AccountGuard::FORCE_PASSWORD_RESET` for this action.

## Requirements

- A user model that is `Authenticatable` and `CanResetPassword`, as Laravel's default `User` is.
- Laravel's password broker. Set `forced_password_reset.broker` to use a broker other than the default.

Otherwise the action throws `UnsupportedConfiguration` and nothing is written. Asking for `resetTwoFactor` when none of the configured columns exist also throws `UnsupportedConfiguration`, rather than reporting a reset that did not happen.

## What Your App Provides

- The route, controller and policy that call the action, and the button in your UI.
- The password reset page the link leads to. A starter kit already has one.
- `AuthenticateSession` on your routes, unless sessions are stored in the database.

## Configuration

Both `forced_password_reset` keys are in [Configuration](/reference/configuration#forced-password-reset). The action's full signature and event are in [Actions and Events](/reference/actions-and-events#forcepasswordreset).
