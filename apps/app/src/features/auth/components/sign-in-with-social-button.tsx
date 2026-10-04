import { Button } from "@v1/ui/components/button"
import { Icon } from "@v1/ui/components/icon"
import { cn } from "cn"
import { useSocialSignIn } from "#features/auth/hooks.ts"

const PROVIDERS = {
  github: { icon: Icon.GitHub, label: "GitHub" },
  google: { icon: Icon.Google, label: "Google" },
} as const

export default function SignInWithSocialButton({
  className,
  provider,
}: {
  className?: string
  provider: keyof typeof PROVIDERS
}) {
  const { icon: ProviderIcon, label } = PROVIDERS[provider]
  const { isSigningIn, signInWithProvider } = useSocialSignIn(
    provider,
    `Failed to sign in with ${label}`
  )

  return (
    <Button
      className={cn("flex gap-3", className)}
      disabled={isSigningIn}
      onClick={signInWithProvider}
      variant="outline"
    >
      {isSigningIn ? (
        <>
          <Icon.Loader className="mr-2 h-4 w-4 animate-spin" />
          Signing in...
        </>
      ) : (
        <>
          <ProviderIcon />
          {label}
        </>
      )}
    </Button>
  )
}
