# Starter Kit Teams

An app that already has a team or organization model can use it as concierge's workspace. A Laravel starter kit generated with teams (`laravel new --teams`) is read through the kit's own tables. Any other model with a membership pivot is copied into concierge's own tables once, with `concierge:import-members`.

> [!TIP]
> Starter kit teams are an early feature, and opt-in. For now concierge reads a kit's teams and doesn't change them: its pages and write actions for kit teams come later ([#57](https://github.com/teylabs/concierge/issues/57)). Until then, the API may change.

## The Workspace Engine

In workspace mode, `workspaces.engine` says who keeps each workspace's members:

| Value | Members are kept in | Spatie teams |
| --- | --- | --- |
| `'concierge'` (default) | Concierge's own tables, as in [membership](/features/membership) | On (`permission.teams = true`) |
| `'kit'` | The starter kit's `team_members` table, read and never written | Off (`permission.teams = false`) |

Set it in `config/concierge.php`, never from `.env`. A missing or `null` value is `'concierge'`, and any other value throws `UnsupportedConfiguration`. The engine is read in workspace mode only; `php artisan about` shows it.

## ActsAsWorkspace

`Tey\Concierge\Concerns\ActsAsWorkspace` implements the `Workspace` contract's two methods for an existing model: the name comes from a `name` column, and the workspace accepts members unless it is soft-deleted. Override either method to change that.

```php
// app/Models/Team.php
use Tey\Concierge\Concerns\ActsAsWorkspace;
use Tey\Concierge\Contracts\Workspace;

class Team extends Model implements Workspace
{
    use ActsAsWorkspace;

    // ...the kit's own relations
}
```

A kit's `Team` already has its own memberships and owner, so it takes `ActsAsWorkspace` alone. A model on concierge's own engine adds `Tey\Concierge\Concerns\HasMembers` as well.

## Using a Starter Kit's Teams

1. Add `implements Workspace` and `ActsAsWorkspace` to the kit's `App\Models\Team`, as above.
2. On the user model, implement `Member` and add `HasRoles`. Spatie's `HasRoles` and the kit's `HasTeams` both define `teams()`, so keep the kit's:

    ```php
    // app/Models/User.php
    use App\Concerns\HasTeams;
    use Spatie\Permission\Traits\HasRoles;

    class User extends Authenticatable implements Member
    {
        use HasRoles, HasTeams {
            HasTeams::teams insteadof HasRoles;
        }

        // ...the Member methods
    }
    ```

3. Leave `permission.teams` set to `false`. The kit engine with Spatie teams on throws `UnsupportedConfiguration`; the kit's `team_members.role` holds the team roles.
4. Set the mode, the engine and the models:

    ```php
    // config/concierge.php
    'mode' => 'workspaces',

    'workspaces' => [
        'engine' => 'kit',
    ],

    'models' => [
        'user' => App\Models\User::class,
        'workspace' => App\Models\Team::class,
    ],
    ```

5. Migrate, then sync the roles. Concierge's roles stay global Spatie roles for the app; the kit's roles (`owner`, `admin`, `member`) stay in its pivot.

    ```bash
    php artisan migrate
    php artisan concierge:sync-roles
    ```

## The Kit Adapter

With the kit engine, concierge binds two classes in place of its own:

- `Tey\Concierge\Kit\KitMembershipSource`, bound to `Tey\Concierge\Contracts\MembershipSource`, reads a team's members through the team's `memberships()` relation, one person through the same relation, and a person's teams through the user's `teams()` relation. Each member has one role, from the pivot's `role` column. The member whose role is `owner` is the team's owner, and the pivot's `created_at` is when they joined.
- `Tey\Concierge\Kit\KitWorkspaceContext`, bound to `WorkspaceContext`, finds the current team in the `{current_team}` route parameter (a bound model, or its route key such as a slug), and otherwise in the signed-in user's `current_team_id`. It never checks membership: the kit's own `EnsureTeamMembership` middleware does that. Protect kit team routes with that middleware, not `concierge.member`, which doesn't read kit teams yet ([#80](https://github.com/teylabs/concierge/issues/80)).

The adapter reads and never writes. Concierge's write actions refuse a kit team with a `Tey\Concierge\Exceptions\WorkspaceNotManaged` exception that names [#57](https://github.com/teylabs/concierge/issues/57). Change a kit team's members with the kit's own team screens.

If your app renamed the kit's relations or columns, extend either class, change its protected properties (`$membershipsRelation`, `$teamsRelation`, `$roleColumn`, `$ownerRole`, `$routeParameter`, `$currentTeamColumn`), and bind your class in a service provider.

## Importing Another Model's Members

A team or organization model that isn't a starter kit's stays on concierge's own engine:

1. Add `implements Workspace` with the `ActsAsWorkspace` and `HasMembers` traits.
2. Turn Spatie teams on, and set `'mode' => 'workspaces'` and `models.workspace` to the model, as in [membership](/features/membership#setting-up-in-order). Migrate.
3. Copy the pivot's members in once. Preview first:

    ```bash
    php artisan concierge:import-members --pivot=organization_user --role-column=role --dry-run
    ```

    Then run it without `--dry-run`.

The command reads the pivot and never changes it. For each workspace without an owner it picks one, in this order: the earliest member whose role column holds the owner role, the user in the model's `owner_id` column, then the earliest member. A person who already has a concierge membership in that workspace is skipped, so running it again finds nothing to do. It syncs the configured roles before it writes.

| Option | Default | What it does |
| --- | --- | --- |
| `--model=` | `models.workspace` | The team or organization model. It must match `models.workspace`. |
| `--pivot=` | The Laravel convention, e.g. `organization_user` | The membership pivot table. |
| `--foreign-key=` | `<model>_id` | The pivot column holding the model's key. |
| `--user-key=` | `user_id` | The pivot column holding the user's key. |
| `--role-column=` | none | The pivot column holding each member's role. |
| `--owner-role=` | `owner_role` | The role-column value that marks the owner. |
| `--owner-column=` | `owner_id` | A column on the model's table holding the owner's user id, used when no member has the owner role. |
| `--map=from:to` | none | Maps a role-column value to a concierge role, e.g. `--map=member:presenter`. Repeat it for each value. |
| `--default-role=` | none | The concierge role for members whose role doesn't map, or for every member without `--role-column`. |
| `--dry-run` | | Shows what would be imported and writes nothing. |
| `--json` | | Prints the plan or the result as JSON. |

A role-column value that matches a configured concierge role keeps that role. Other owners keep the `transfer_demotes_to` role, since a concierge workspace has one owner. Nothing can be mapped to the owner role. A value with no mapping and no `--default-role` stops the import before anything is written.

When the command refuses, it prints the reason and the fix, or both as JSON with `--json`. It refuses in app-wide mode, with the kit engine (concierge already reads the kit's members), with Spatie teams off, and when the pivot or a named column doesn't exist.
