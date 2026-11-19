---
"@metaideas/create-v1": minor
---

Add `database.withTransaction` to run composed database operations in one transaction

`createDatabase` from `@v1/database/server` returns a `withTransaction(operation)` method. A call inside another call on the same database reuses its transaction, so operations that each open one still commit or roll back together. Concurrent calls each get their own transaction.
