import { merge } from "@sanely/errors"
import { createSerializationAdapter } from "@tanstack/react-router"
import { AuthFault } from "@v1/core/domains/auth"
import { AssertFault } from "@v1/utils/assert"

// The faults that server functions can throw to the client. Add a package's registry here when
// one of its faults should reach the client with its tag and fields.
const AppFault = merge(AuthFault, AssertFault)

export const faultSerializer = createSerializationAdapter({
  // oxlint-disable-next-line typescript/unbound-method -- Static deserializer does not use `this`.
  fromSerializable: AppFault.fromSerializable,
  key: "fault",
  test: AppFault.is,
  toSerializable: (value) => value.toSerializable(),
})
