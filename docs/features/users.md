# Users

The Users pages list, invite and edit everyone in an app-wide app, and deactivation takes a person's access away without deleting anything. The pages and `UpdateUser` are for [app-wide mode](/features/app-wide-mode). Deactivation works in both modes.

> [!TIP]
> The Users pages and deactivation are early features. They are opt-in, and the user administration completes in 0.8 ([#43](https://github.com/teylabs/concierge/issues/43)). Until then, the API may change. Concierge ships no routes yet ([#28](https://github.com/teylabs/concierge/issues/28)), so your app supplies every link.

## The Users Pages

Three [Vue pages](/features/vue-pages) ship in `@tey/concierge`. They never say "workspace".

| Page | Props | What it shows |
| --- | --- | --- |
| `UsersPage` | `UsersPageProps` | Everyone, paginated, with search, a role filter and a status filter |
| `UserPage` | `UserPageProps` | One user: edit their name, email and roles; deactivate, restore or remove them |
| `InviteUserPage` | `InviteUserPageProps` | The app-wide invitation form |

The props are PHP classes in `Tey\Concierge\Data\UI`, with matching types in the generated `types.ts`. `AcceptInvitationPage` works for app-wide invitations too: with no workspace it says "Join" and your app's name, from `metadata.appName`, or plain "Join" when you leave it out.

### Links Come from Your App

Concierge ships no routes yet, so your controllers build the props and supply every URL. A `null` link hides its control. Wire the pages to the actions:

| Page control | Link or URL | Verb | Action |
| --- | --- | --- | --- |
| Search and filters | `UsersMetadata::$refreshUrl` | `GET` | Your index |
| Invite | `UsersLinks::$invite`, then `InviteUserMetadata::$formUrl` | `POST` | `InviteUser` |
| Open a user | `UserLinks::$show` | `GET` | Your show page |
| Save name and email | `UserProfileMetadata::$formUrl` | `PUT` | `UpdateUser` |
| Save roles | `UserGrantsMetadata::$formUrl` | `PUT` | `ChangeUserRoles` |
| Deactivate | `UserLinks::$deactivate` | `POST`, with an optional `reason` | `DeactivateUser` |
| Restore | `UserLinks::$restore` | `POST` | `RestoreUser` |
| Remove | `UserLinks::$remove` | `DELETE` | `RemoveUser` |

`UserPageProps::$profile` and `$grants` are nullable: pass `null` to hide that form. Deactivate shows only on an active user and Restore only on a deactivated one. The pages don't read `UserLinks::$updateProfile` or `$updateGrants`; they submit to each form's `formUrl`. Hidden controls are not authorization: every endpoint must still call the action, which checks its rules.

### The Status Filter

`UsersMetadata::$status` is the filter the page shows:

| Value | Shows |
| --- | --- |
| `null` or `'active'` | Active users only (the default) |
| `'deactivated'` | Deactivated users only |
| `'all'` | Everyone |

The search visits `refreshUrl` with `search`, `role` and `status`, and leaves `status` out while it is `active`. Your controller decides which users to list, so filter on the account's `status` to match. Each `UserRow` carries its own `status`, `'active'` or `'deactivated'`.

### Your Own Columns

Name your columns and return their values for each user:

```php
// app/Providers/AppServiceProvider.php → boot()
use Tey\Concierge\Facades\Concierge;

Concierge::userColumns(
    ['plan' => 'Plan', 'seats' => 'Seats'],
    fn ($user) => ['plan' => $user->plan, 'seats' => $user->seats],
);
```

Then send the labels in the metadata and the values on each row:

```php
new UsersMetadata(columns: Concierge::userColumnDefinitions(), /* ... */);
new UserRow(columns: Concierge::userColumnValues($user), /* ... */);
```

Columns show after Joined. A key the callback leaves out renders empty, and a key it adds beyond the labels is not sent. Render a cell yourself with the `column` slot, which receives `column`, `user` and `value`:

```vue
<UsersPage v-bind="props">
    <template #column="{ column, value }">
        <PlanBadge v-if="column.key === 'plan'" :plan="value" />
        <template v-else>{{ value }}</template>
    </template>
</UsersPage>
```

## Editing a User

```php
// app/Http/Controllers/UserController.php → update()
use Tey\Concierge\Actions\UpdateUser;

UpdateUser::run($request->user(), $user, name: $request->input('name'), email: $request->input('email'));
```

`UpdateUser` edits another user's name and email in app-wide mode. A person's own profile stays with your app's profile page.

- **Rules:** the same as removal. Not yourself, not someone of equal or higher rank, and your [account guard](/reference/actions-and-events#account-guard) may refuse.
- **Fields:** a `null` argument leaves that field alone. Both are trimmed. The name is required, 255 characters at most. The email must be valid and not used by another user, ignoring case. Otherwise it throws a `ValidationException` keyed `name` or `email`.
- **What it writes:** the model's `name` and `email` attributes, which your `conciergeDisplayName()` and `conciergeEmail()` read. Nothing is written when neither changes.
- **Email verification** is your app's call: `email_verified_at` is not cleared and no verification email is sent. Listen to `UserUpdated`, which carries the old and new value of each changed field.

## Deactivating and Restoring

```php
use Tey\Concierge\Actions\DeactivateUser;
use Tey\Concierge\Actions\RestoreUser;

DeactivateUser::run($request->user(), $user, reason: 'Left the company');
RestoreUser::run($request->user(), $user);
```

`DeactivateUser` takes a user's access away and keeps their history. `RestoreUser` gives it back. The state lives on the user's [account row](/features/app-wide-mode#the-accounts-table), not on your users table, so your own queries are untouched: filter on its `status` when you want to hide deactivated people.

Roles and, in workspace mode, memberships stay as they are, so restoring brings back exactly what the user had, with no new invitation. The reason is optional, trimmed and cut to 500 characters.

### Who May Deactivate

The same rules as removal apply, through the [`AccountPolicy`](/features/app-wide-mode#who-may-manage-whom): not yourself, not the last owner, not someone of equal or higher rank, and your account guard may refuse. Deactivating a deactivated user, or restoring an active one, is refused with the code `already_deactivated` or `not_deactivated`.

Workspace mode has no app-wide roles, so bind your own `AccountPolicy` there to say who may deactivate.

### Signing In

A listener on Laravel's `Illuminate\Auth\Events\Validated` event refuses a deactivated user once their credentials check out, before a session starts. It throws a `ValidationException` with "This account is deactivated." on the `email` key. This covers Fortify, the starter kits and any `Auth::attempt`.

### Sessions and Tokens

When a user is deactivated:

- their remember-me token is replaced;
- with the `database` session driver, their rows in the sessions table are deleted;
- API tokens are kept, so they work again after a restore.

Add the `concierge.active` middleware after your authentication middleware to stop a deactivated user who is still signed in:

```php
// routes/web.php
Route::middleware(['auth', 'concierge.active'])->group(function () {
    // ...
});
```

On their next request it signs them out of every session guard and invalidates the session. A browser request is redirected to the `login` route with the message on `email`. A JSON request, a request with a bearer token, or an app without a `login` route gets a 403. Use it after token authentication too, for example `['auth:sanctum', 'concierge.active']`: the token request is refused and the token is left alone. With session drivers other than `database`, this middleware is what ends the session.

In app-wide mode, the [`concierge.member`](/features/app-wide-mode#protecting-routes) middleware also responds 403 to a deactivated account.

### Events

Listen to `UserDeactivated`, which carries the reason and the number of database sessions ended, and to `UserRestored`. See [Events](/reference/actions-and-events#events).
