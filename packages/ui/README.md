# @adhdesigns/ui

Shared UI assets for ADHDesigns apps. Currently just Tailwind v4 + shadcn semantic-token themes; components will land here as they stabilize across projects.

## Install

Inside the `adhd-shared` workspace, depend via pnpm workspace protocol:

```jsonc
// app package.json
{
  "dependencies": {
    "@adhdesigns/ui": "workspace:*"
  }
}
```

Outside the monorepo, depend via git until these are published:

```jsonc
{
  "dependencies": {
    "@adhdesigns/ui": "github:lmdrew96/adhd-shared#main&path:/packages/ui"
  }
}
```

## Themes

Two themes ship today:

| Theme | When to use |
| --- | --- |
| `themes/brand.css` | ADHDesigns.dev landing and marketing surfaces — bold, saturated, no dark mode. |
| `themes/lab-notebook.css` | In-app Chaos Suite surfaces — composition-notebook aesthetic, includes `.dark` variant. |

### Single-theme apps (ControlledChaos, ChaosPatch, Cha(t)os)

Import at the top of your app's `globals.css`, above your own overrides:

```css
@import "tailwindcss";
@import "@adhdesigns/ui/themes/lab-notebook.css";

/* your app-specific overrides below */
```

The theme applies under `:root` and becomes the app's default look. Toggle dark mode by adding the `dark` class to `<html>` (or any ancestor).

### Multi-theme apps (ChaosLimbă's 8-theme rotation)

Load `brand.css` as a baseline and gate `lab-notebook.css` behind a class so it slots into a theme-switcher alongside the other themes. In the CSS, replace `:root` with `.theme-chaos` and `.dark` with `.theme-chaos.dark` (the file ships with `:root` — fork or post-process).

```css
@import "tailwindcss";
@import "@adhdesigns/ui/themes/brand.css";           /* baseline */
@import "@adhdesigns/ui/themes/lab-notebook.css";    /* scoped in a fork */
```

Then apply `<body class="theme-chaos">` when the user picks it.

## Fonts are not bundled

Both themes reference Fraunces, Inter, and JetBrains Mono via CSS variables — the files do **not** load the fonts. Load them in the consuming app (via `next/font`, a Google Fonts link, or self-hosted) and the theme variables will pick them up.

## Publishing

Themes are plain CSS in `sideEffects` + `exports` — `pnpm publish` copies only `themes/` (see `files` in `package.json`). Bump version and run `pnpm run ui:publish` from the repo root.
