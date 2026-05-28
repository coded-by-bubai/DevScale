"use server"

import { signOut } from "@/auth"

interface SignOutOptions {
  redirectTo?: string
}

export async function handleSignOut(options?: SignOutOptions) {
  await signOut(options)
}
