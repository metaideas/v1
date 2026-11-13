export {
  ConvexQueryClient,
  convexQuery,
  useConvex,
  useConvexMutation,
} from "@convex-dev/react-query"

// The adapter renames Convex's native hook to avoid colliding with TanStack Query's useQuery.
export { useConvexQuery } from "@convex-dev/react-query"

export { ConvexProvider, ConvexReactClient, useAction, useMutation, useQuery } from "convex/react"
