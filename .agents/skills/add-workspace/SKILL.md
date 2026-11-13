---
name: add-workspace
description: Restore an application or package workspace from the v1 template into a scaffolded project. Use when the user wants a workspace that setup removed, such as adding mobile, api, payments, or email later.
---

`pnpm template add` copies the workspace from the template at the commit recorded in `.template.json`, renames its scope, and pulls in template packages it depends on. You wire it into the project.

1. Copy the workspace:

   ```bash
   pnpm template add app <name>      # apps/<name>
   pnpm template add package <name>  # packages/<name>
   ```

2. Run `pnpm install`.
3. Connect it. A package needs a consumer: add it as a `workspace:*` dependency where it is used and import its `.env` fragment from that app's `.env.schema`. An app needs its `.env.development` values and, when it talks to a backend, the connect-backend skill.
4. If the template has moved on since the stamp, `pnpm template diff --name-only` shows which upstream files changed. Only apply changes inside the workspace you just added.
5. Run `pnpm template doctor` and fix what it reports. Finish when it passes.
