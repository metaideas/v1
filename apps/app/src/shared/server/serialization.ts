import { createSerializationAdapter } from "@tanstack/react-router"
import { AuthFault } from "@v1/core/domains/auth"

// The faults that server functions can throw to the client. Merge another package's registry with
// `merge` from @sanely/errors when one of its faults should reach the client with its tag and
// fields.
const AppFault = AuthFault

export const faultSerializer = createSerializationAdapter({
  // oxlint-disable-next-line typescript/unbound-method -- Static deserializer does not use `this`.
  fromSerializable: AppFault.fromSerializable,
  key: "fault",
  test: AppFault.is,
  toSerializable: (value) => value.toSerializable(),
})
