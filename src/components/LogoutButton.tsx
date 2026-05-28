"use client"

import { useTransition } from "react"
import { handleSignOut } from "@/actions/auth"

interface LogoutButtonProps {
  className?: string
  variant: "desktop" | "mobile" | "admin"
}

export default function LogoutButton({ className, variant }: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition()

  const onLogout = async (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        await handleSignOut(variant === "admin" ? { redirectTo: "/admin" } : undefined)
      } catch (err) {
        // Next.js redirection throws an expected navigation redirect error, which can be safely bypassed
      }
    })
  }

  if (variant === "desktop") {
    return (
      <form onSubmit={onLogout} className="w-full">
        <button
          type="submit"
          disabled={isPending}
          className={`w-full text-left font-label-sm text-xs text-error hover:text-red-400 cursor-pointer flex items-center gap-1.5 transition-all duration-300 disabled:opacity-50 ${className || ""}`}
        >
          {isPending ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin text-error/80">sync</span>
              <span className="animate-pulse">Signing Out...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">logout</span>
              <span>Sign Out</span>
            </>
          )}
        </button>
      </form>
    )
  }

  if (variant === "mobile") {
    return (
      <form onSubmit={onLogout} className="w-full">
        <button
          type="submit"
          disabled={isPending}
          className={`w-full justify-center font-label-sm text-label-sm text-error hover:text-red-400 transition-colors flex items-center gap-1.5 py-2.5 border border-error/30 hover:border-error rounded bg-error/5 cursor-pointer disabled:opacity-60 ${className || ""}`}
        >
          {isPending ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin text-error/80">sync</span>
              <span className="animate-pulse">Signing Out...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">logout</span>
              <span>Sign Out</span>
            </>
          )}
        </button>
      </form>
    )
  }

  // variant === "admin"
  return (
    <form onSubmit={onLogout} className="w-full">
      <button
        type="submit"
        disabled={isPending}
        className={`w-full text-center py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded-lg transition-colors font-bold font-label-sm cursor-pointer border border-red-500/30 flex items-center justify-center gap-1.5 disabled:opacity-60 ${className || ""}`}
      >
        {isPending ? (
          <>
            <span className="material-symbols-outlined text-sm animate-spin text-red-400">sync</span>
            <span className="animate-pulse">Signing Out...</span>
          </>
        ) : (
          <span>Sign Out & Try Again</span>
        )}
      </button>
    </form>
  )
}
