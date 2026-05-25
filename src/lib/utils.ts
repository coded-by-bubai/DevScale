import crypto from "crypto"

export function convertGoogleDriveLink(url: string): string {
  if (!url) return url
  const trimmed = url.trim()
  
  // 1. Path match e.g. drive.google.com/file/d/1t3M47yG2-sL2o5j-c-a7c81c-8e8f8e/view
  const pathMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (pathMatch && pathMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${pathMatch[1]}`
  }

  // 2. Query param match e.g. drive.google.com/open?id=1t3M47yG2-sL2o5j-c-a7c81c-8e8f8e
  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (queryMatch && queryMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${queryMatch[1]}`
  }

  return trimmed
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) return false
  const [salt, hash] = storedHash.split(":")
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex")
  return hash === verifyHash
}
