import * as z from "@v1/utils/schema"

export const ExpandedPaymentMethodSchema = z.object({
  card: z
    .object({
      brand: z.string(),
      last4: z.string(),
    })
    .nullable()
    .optional(),
})
