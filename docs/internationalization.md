---
title: Internationalization
description: Maintain shared Paraglide message catalogs and stable translation keys across v1 workspaces.
---

The files in `tooling/internationalization/messages/` are source catalogs for every application workspace. Keep all locale files structurally identical. When you add a message, update every locale.

## Message Keys

Use flat semantic keys in lower snake case. Build each key from the durable owner and role of the message:

```text
<surface>_<feature>_<element>_<role>
```

Not every key needs all four segments. Use only the segments needed to make the message unambiguous:

```text
api_hello_greeting
desktop_local_files_empty_state
shared_locale_switch
web_home_title
```

- Start with the application workspace or `shared` for messages used across multiple surfaces.
- Follow the feature boundaries of the repository where they exist.
- Name the final segment after the UI or domain role of the message. Do not use its current English wording.
- Treat an assigned key as a stable identifier. Do not rename it only because the copy changes or a component moves.
- Give messages that evolve independently separate keys, even when their source text is identical.
- Do not use nested JSON or dotted keys. Flat keys compile to direct `m.key()` calls. They remain readable in editors without translation previews.

## Adding Messages

1. Add the same key to `tooling/internationalization/messages/en.json` and every translated catalog.
2. Preserve the same variables, markup, and variants in every locale.
3. Run `pnpm run fix` to format the catalogs consistently.
4. Run `pnpm run codegen` to regenerate the Paraglide output for each workspace.
5. Before you commit, run `pnpm run check`.

The message-format plugin sorts keys in ascending order when it writes the catalogs. This keeps related prefixes together and reduces noise in diffs.
