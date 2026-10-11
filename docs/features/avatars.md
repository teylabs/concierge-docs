# Avatars

Every person on concierge's pages has an avatar: your app's photo when it has one, and otherwise their initials on a colour that stays the same for that person everywhere. Nothing is fetched from an outside service such as Gravatar.

## Photos

Tell concierge where your app keeps a person's photo, once, in a service provider:

```php
// app/Providers/AppServiceProvider.php → boot()
use Tey\Concierge\Facades\Concierge;

Concierge::avatarUsing(fn ($user) => $user->profile_photo_url);
```

The callback receives your user model and returns a URL, or `null` for someone without a photo. Without a callback, everyone gets initials.

## Initials and Colour

- The initials are the first letters of the first and last words of the name, so `Ana María López` is `AL`. A one-word name gives one letter, and a person with no name gets the first letter of their email.
- Letters are whole characters, so accents, non-Latin scripts and emoji come through intact.
- The colour is one of eight palette names (`slate`, `indigo`, `violet`, `rose`, `amber`, `emerald`, `teal`, `sky`), picked from the user's key. A person keeps the same colour on every page.

## In Page Props

`UserSummary`, the person in every page's props, carries an `avatar`:

```ts
type UserAvatar = { url: string | null; initials: string; colour: string };
```

Build a summary from your user model with `UserSummary::for()`. It applies `avatarUsing()`:

```php
use Tey\Concierge\Data\UI\UserSummary;

$summary = UserSummary::for($user);
```

The constructor still takes `id`, `name` and `email`. Its fourth argument, the avatar, is optional and defaults to initials, so summaries your app already builds keep working. `Concierge::avatar($user)` returns the avatar on its own.

## The Avatar Component

The [Vue pages](/features/vue-pages) show avatars in the members list and the member header. The `Avatar` component is exported for your own pages:

```vue
<script setup lang="ts">
import { Avatar, type UserSummary } from '@tey/concierge';

defineProps<{ user: UserSummary }>();
</script>

<template>
    <Avatar :avatar="user.avatar" size="sm" />
    {{ user.name }}
</template>
```

| Prop | Type | Purpose |
| --- | --- | --- |
| `avatar` | `UserAvatar`, required | The avatar from a `UserSummary` |
| `size` | `'sm' \| 'md' \| 'lg'` | Defaults to `md` |
| `label` | `string \| null` | Leave it out beside the person's name: the avatar is then hidden from screen readers. Pass the name when the avatar stands on its own |

A photo that fails to load falls back to the initials.

## Colours

Each palette name is a pair of CSS variables in `concierge.css`, a pale background and dark text: `--concierge-avatar-<name>` and `--concierge-avatar-<name>-fg`. Override them in an unlayered `:root` rule to match your theme:

```css
/* resources/css/app.css */
:root {
    --concierge-avatar-indigo: #e0e7ff;
    --concierge-avatar-indigo-fg: #312e81;
}
```
