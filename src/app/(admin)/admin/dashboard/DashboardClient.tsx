"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { deleteArticle, toggleUserRole, deleteUser as deleteUserAction, createNewAdmin, changeOwnPassword } from "@/actions/articles"
import { useRouter } from "next/navigation"
import { convertGoogleDriveLink } from "@/lib/utils"

function getPasswordStrength(pass: string): { label: string; colorClass: string; barWidth: string } {
  if (!pass) return { label: "", colorClass: "bg-outline-variant/20", barWidth: "0%" }
  let score = 0
  if (pass.length >= 6) score += 1
  if (pass.length >= 10) score += 1
  if (/[A-Z]/.test(pass)) score += 1
  if (/[0-9]/.test(pass)) score += 1
  if (/[^A-Za-z0-9]/.test(pass)) score += 1

  if (score <= 2) {
    return { label: "Weak Password", colorClass: "bg-red-500", barWidth: "33%" }
  } else if (score <= 4) {
    return { label: "Good Password", colorClass: "bg-amber-500", barWidth: "66%" }
  } else {
    return { label: "Strong & Secure Password", colorClass: "bg-green-500", barWidth: "100%" }
  }
}

export default function DashboardClient({
  initialArticles,
  initialUsers,
  currentUserId,
}: {
  initialArticles: any[]
  initialUsers: any[]
  currentUserId: string
}) {
  const [articles, setArticles] = useState(initialArticles || [])
  const [users, setUsers] = useState(initialUsers || [])
  const [activeTab, setActiveTab] = useState<"articles" | "admins" | "users">("articles")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Form states for creating new admin
  const [isAddingAdmin, setIsAddingAdmin] = useState(false)
  const [newAdminName, setNewAdminName] = useState("")
  const [newAdminEmail, setNewAdminEmail] = useState("")
  const [newAdminImage, setNewAdminImage] = useState("")
  const [newAdminPassword, setNewAdminPassword] = useState("")

  // Form states for changing active admin's own password
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [changePasswordVal, setChangePasswordVal] = useState("")
  const [confirmPasswordVal, setConfirmPasswordVal] = useState("")

  // Form states for password visibility toggles
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false)
  const [showChangePasswordVal, setShowChangePasswordVal] = useState(false)
  const [showConfirmPasswordVal, setShowConfirmPasswordVal] = useState(false)

  const adminList = (users || []).filter(u => u && u.role === "ADMIN")
  const userList = (users || []).filter(u => u && u.role !== "ADMIN")

  const handleDeleteArticle = (id: string) => {
    if (!confirm("Are you sure you want to delete this article? This action cannot be undone.")) return

    startTransition(async () => {
      try {
        await deleteArticle(id)
        setArticles(prev => prev.filter(a => a.id !== id))
        router.refresh()
      } catch {
        alert("Failed to delete article.")
      }
    })
  }

  const handleToggleRole = (userId: string, currentRole: string) => {
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN"
    const actionName = newRole === "ADMIN" ? "promote this user to an Admin" : "demote this admin to a standard User"
    
    if (!confirm(`Are you sure you want to ${actionName}?`)) return

    startTransition(async () => {
      try {
        await toggleUserRole(userId, newRole)
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
        router.refresh()
      } catch (err: any) {
        alert(err.message || "Failed to toggle user role.")
      }
    })
  }

  const handleDeleteUser = (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to permanently delete the user account "${userName}"? This will delete all their comments and data, and cannot be undone.`)) return

    startTransition(async () => {
      try {
        await deleteUserAction(userId)
        setUsers(prev => prev.filter(u => u.id !== userId))
        router.refresh()
      } catch (err: any) {
        alert(err.message || "Failed to delete user account.")
      }
    })
  }

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newAdminEmail.trim()) {
      alert("Email address is required.")
      return
    }

    if (!newAdminPassword.trim()) {
      alert("Password is required for registration.")
      return
    }

    startTransition(async () => {
      try {
        const newUser = await createNewAdmin(newAdminName, newAdminEmail, newAdminImage.trim() || undefined, newAdminPassword)
        setUsers(prev => {
          const exists = prev.some(u => u.id === newUser.id)
          if (exists) {
            return prev.map(u => u.id === newUser.id ? { ...u, role: "ADMIN", name: newUser.name, image: newUser.image } : u)
          }
          return [...prev, newUser]
        })
        setNewAdminName("")
        setNewAdminEmail("")
        setNewAdminImage("")
        setNewAdminPassword("")
        setIsAddingAdmin(false)
        router.refresh()
      } catch (err: any) {
        alert(err.message || "Failed to create administrator.")
      }
    })
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()

    const newPass = changePasswordVal.trim()
    if (!newPass) {
      alert("Password cannot be blank.")
      return
    }

    if (newPass !== confirmPasswordVal.trim()) {
      alert("Passwords do not match. Please verify and try again.")
      return
    }

    startTransition(async () => {
      try {
        await changeOwnPassword(newPass)
        alert("Your password has been successfully updated!")
        setChangePasswordVal("")
        setConfirmPasswordVal("")
        setIsChangingPassword(false)
      } catch (err: any) {
        alert(err.message || "Failed to update password.")
      }
    })
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body-md flex flex-col relative pb-24">
      {/* Top Contextual Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-surface/80 dark:bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm transition-all duration-300">
        <div className="flex justify-between items-center h-16 px-gutter max-w-container-max mx-auto">
          <div className="flex items-center gap-4">
            <Link className="font-headline-lg text-headline-lg font-bold tracking-tighter text-primary-fixed dark:text-primary-fixed-dim hover:backdrop-brightness-125 transition-all duration-300 scale-95 active:scale-90 flex items-center gap-2" href="/">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
              <span className="hidden sm:inline">ArchAlgo Admin</span>
              <span className="sm:hidden text-base tracking-normal">Admin</span>
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <span className="font-label-sm text-label-sm text-primary-fixed dark:text-primary-fixed-dim border-b-2 border-primary-fixed pb-1">Dashboard</span>
            <Link className="font-label-sm text-label-sm text-on-surface-variant dark:text-on-surface-variant hover:text-primary-fixed transition-colors" href="/admin">Write Article</Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary-fixed transition-colors flex items-center gap-1 scale-95 active:scale-90 px-2 py-1.5 rounded-lg hover:bg-surface-container-high/30">
              <span className="material-symbols-outlined text-[18px]">close</span>
              <span className="hidden sm:inline">Exit</span>
            </Link>
            <Link href="/admin" className="font-label-sm text-label-sm bg-primary-container text-on-primary-fixed px-3 sm:px-5 py-1.5 rounded-DEFAULT font-bold hover:bg-surface-tint transition-colors scale-95 active:scale-90 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span className="hidden sm:inline">New Article</span>
              <span className="sm:hidden">New</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow pt-24 sm:pt-32 px-4 sm:px-gutter max-w-container-max mx-auto w-full">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="font-headline-xl text-2xl sm:text-3xl md:text-headline-xl font-bold text-on-surface">Content Dashboard</h1>
            <p className="text-on-surface-variant mt-2 text-xs sm:text-sm font-body-md">Manage your published articles, administrative access, and registered members.</p>
          </div>
        </div>

        {/* Segmented Capsule Tabs Switcher - Swipeable horizontal scrolling on mobile */}
        <div className="flex overflow-x-auto scrollbar-none whitespace-nowrap gap-2 mb-8 border-b border-outline-variant/10 pb-4 w-full">
          <button
            onClick={() => {
              setActiveTab("articles")
              setIsAddingAdmin(false)
            }}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-bold font-label-sm text-xs sm:text-sm transition-all duration-300 cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "articles"
                ? "bg-primary-fixed text-on-primary-fixed shadow-md scale-95"
                : "bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            }`}
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">article</span>
            Articles ({articles.length})
          </button>
          <button
            onClick={() => setActiveTab("admins")}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-bold font-label-sm text-xs sm:text-sm transition-all duration-300 cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "admins"
                ? "bg-primary-fixed text-on-primary-fixed shadow-md scale-95"
                : "bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            }`}
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">admin_panel_settings</span>
            Administrators ({adminList.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("users")
              setIsAddingAdmin(false)
            }}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-bold font-label-sm text-xs sm:text-sm transition-all duration-300 cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "users"
                ? "bg-primary-fixed text-on-primary-fixed shadow-md scale-95"
                : "bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            }`}
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">group</span>
            Registered Users ({userList.length})
          </button>
        </div>

        {/* Tab View Container */}
        <div className="glass-panel border border-outline-variant/30 rounded-xl overflow-hidden bg-surface-container-lowest shadow-sm">
          {/* Admins Header with Inline "Add Admin" Action Trigger */}
          {activeTab === "admins" && (
            <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/20">
              <h3 className="font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">supervisor_account</span>
                Administrators Directory
              </h3>
              <button
                onClick={() => setIsAddingAdmin(prev => !prev)}
                className="px-4 py-2 bg-primary-fixed text-on-primary-fixed rounded-lg font-bold font-label-sm text-xs hover:bg-surface-tint transition-all flex items-center gap-1.5 cursor-pointer shadow"
              >
                <span className="material-symbols-outlined text-[16px]">{isAddingAdmin ? "close" : "add"}</span>
                {isAddingAdmin ? "Cancel" : "Add Admin"}
              </button>
            </div>
          )}

          {/* Add Admin Form Block */}
          {activeTab === "admins" && isAddingAdmin && (
            <form onSubmit={handleCreateAdmin} className="p-6 border-b border-outline-variant/30 bg-surface-container-low/30 animate-fade-in space-y-4">
              <h4 className="font-label-sm text-xs uppercase tracking-wider text-primary-fixed font-bold">Register New Administrator</h4>
              
              {/* Photo Preview & URL input block */}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest/50">
                <div className="shrink-0">
                  {newAdminImage.trim() ? (
                    <img
                      src={newAdminImage}
                      alt="Profile Preview"
                      className="w-16 h-16 rounded-full border border-primary-fixed object-cover"
                      onError={(e) => {
                        // Safe fallback on broken external URLs
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-outline-variant/20 border border-outline-variant/30 text-on-surface-variant flex items-center justify-center font-bold text-lg uppercase">
                      {(newAdminName || "?").substring(0, 2)}
                    </div>
                  )}
                </div>
                <div className="w-full space-y-1">
                  <label className="text-[10px] text-on-surface-variant font-label-sm uppercase tracking-wider pl-1">Avatar Image URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="e.g. https://avatars.githubusercontent.com/u/583231"
                    value={newAdminImage}
                    onChange={(e) => setNewAdminImage(convertGoogleDriveLink(e.target.value))}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed transition-all placeholder:text-outline-variant"
                  />
                  <p className="text-[10px] text-on-surface-variant opacity-75">Provide a hotlink URL or Google Drive share link. Google Drive links promote automatically.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant font-label-sm uppercase tracking-wider pl-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed transition-all placeholder:text-outline-variant"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant font-label-sm uppercase tracking-wider pl-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. john@archalgo.com"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed transition-all placeholder:text-outline-variant"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant font-label-sm uppercase tracking-wider pl-1">Admin Password</label>
                  <div className="relative">
                    <input
                      type={showNewAdminPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl pl-4 pr-10 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed transition-all placeholder:text-outline-variant"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewAdminPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary-fixed transition-colors flex items-center justify-center p-0.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showNewAdminPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  {newAdminPassword && (() => {
                    const strength = getPasswordStrength(newAdminPassword);
                    return (
                      <div className="pt-1 px-1 animate-fade-in space-y-1">
                        <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider">
                          <span className="text-on-surface-variant">Strength:</span>
                          <span className={`${strength.colorClass.replace("bg-", "text-")}`}>{strength.label}</span>
                        </div>
                        <div className="w-full bg-outline-variant/20 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full ${strength.colorClass} transition-all duration-500`} style={{ width: strength.barWidth }}></div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingAdmin(false)
                    setNewAdminImage("")
                  }}
                  className="px-4 py-2 rounded-lg font-bold font-label-sm text-xs text-on-surface-variant hover:text-on-surface bg-transparent hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-lg font-bold font-label-sm text-xs bg-primary-fixed text-on-primary-fixed hover:bg-surface-tint transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <span className="material-symbols-outlined text-[16px]">vpn_key</span>
                  Create Administrator
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            {activeTab === "articles" && (
              <>
                {/* Desktop Table View */}
                <table className="hidden md:table w-full text-left font-body-md text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/30 bg-surface-container-low/50">
                      <th className="py-4 px-6 font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-bold">Title</th>
                      <th className="py-4 px-6 font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-bold">Status</th>
                      <th className="py-4 px-6 font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-bold">Date</th>
                      <th className="py-4 px-6 font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-bold">Views</th>
                      <th className="py-4 px-6 font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 px-6 text-center text-on-surface-variant italic">No articles found. Start writing!</td>
                      </tr>
                    ) : (
                      articles.map((article) => (
                        <tr key={article.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low/30 transition-colors group">
                          <td className="py-4 px-6">
                            <div className="font-medium text-on-surface mb-1.5">{article.title}</div>
                            {article.tags && article.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {article.tags.map((tag: any) => (
                                  <span
                                    key={tag.id}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-primary-fixed/10 text-primary-fixed border border-primary-fixed/20"
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {article.published ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-500 border border-green-500/20">Published</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-outline-variant/20 text-on-surface-variant border border-outline-variant/30">Draft</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-on-surface-variant" suppressHydrationWarning>
                            {new Date(article.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-6 text-on-surface-variant">
                            {article.views}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity">
                              <Link href={`/admin?slug=${article.slug}`} className="p-1.5 text-on-surface-variant hover:text-primary-fixed transition-colors rounded" title="Edit Article">
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </Link>
                              {article.published && (() => {
                                const primaryTag = (article.tags && article.tags[0]?.slug) || "uncategorized";
                                return (
                                  <Link href={`/${primaryTag}/${article.slug}`} className="p-1.5 text-on-surface-variant hover:text-primary-fixed transition-colors rounded" title="View Live">
                                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                                  </Link>
                                );
                              })()}
                              <button
                                disabled={isPending}
                                onClick={() => handleDeleteArticle(article.id)}
                                className="p-1.5 text-on-surface-variant hover:text-error transition-colors rounded" title="Delete"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Mobile Responsive Card-Based Grid View */}
                <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                  {articles.length === 0 ? (
                    <div className="py-8 text-center text-on-surface-variant italic">No articles found. Start writing!</div>
                  ) : (
                    articles.map((article) => (
                      <div key={article.id} className="border border-outline-variant/20 rounded-xl p-4 bg-surface-container-low/40 space-y-3 relative group">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <h4 className="font-bold text-on-surface leading-snug">{article.title}</h4>
                            {article.tags && article.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {article.tags.map((tag: any) => (
                                  <span
                                    key={tag.id}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-primary-fixed/10 text-primary-fixed border border-primary-fixed/20"
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 bg-surface-container-high/30 p-1 rounded-lg border border-outline-variant/15 shrink-0">
                            <Link href={`/admin?slug=${article.slug}`} className="p-1.5 text-on-surface-variant hover:text-primary-fixed transition-colors rounded" title="Edit Article">
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </Link>
                            {article.published && (() => {
                              const primaryTag = (article.tags && article.tags[0]?.slug) || "uncategorized";
                              return (
                                <Link href={`/${primaryTag}/${article.slug}`} className="p-1.5 text-on-surface-variant hover:text-primary-fixed transition-colors rounded" title="View Live">
                                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                                </Link>
                              );
                            })()}
                            <button
                              disabled={isPending}
                              onClick={() => handleDeleteArticle(article.id)}
                              className="p-1.5 text-on-surface-variant hover:text-error transition-colors rounded" title="Delete"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2 border-t border-outline-variant/10 text-xs text-on-surface-variant">
                          <div className="flex items-center gap-2">
                            {article.published ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-green-500/10 text-green-500 border border-green-500/20">Published</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-outline-variant/20 text-on-surface-variant border border-outline-variant/30">Draft</span>
                            )}
                            <span className="flex items-center gap-1 font-label-sm" suppressHydrationWarning>
                              <span className="material-symbols-outlined text-[12px]">schedule</span>
                              {new Date(article.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 font-medium font-label-sm">
                            <span className="material-symbols-outlined text-[12px] opacity-75">visibility</span>
                            {article.views} views
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {activeTab === "admins" && (
              <>
                {/* Desktop Table View */}
                <table className="hidden md:table w-full text-left font-body-md text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/30 bg-surface-container-low/50">
                      <th className="py-4 px-6 font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-bold">Admin</th>
                      <th className="py-4 px-6 font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-bold">Email</th>
                      <th className="py-4 px-6 font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-bold">Role</th>
                      <th className="py-4 px-6 font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-bold">User ID</th>
                      <th className="py-4 px-6 font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 px-6 text-center text-on-surface-variant italic">No administrators found.</td>
                      </tr>
                    ) : (
                      adminList.map((admin) => (
                        <tr key={admin.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low/30 transition-colors group">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              {admin.image ? (
                                <img
                                  src={admin.image}
                                  alt={admin.name || "Admin"}
                                  className="w-8 h-8 rounded-full border border-outline-variant/20 object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-primary-fixed/20 text-primary-fixed flex items-center justify-center font-bold text-xs uppercase">
                                  {(admin.name || admin.email || "A").substring(0, 2)}
                                </div>
                              )}
                              <div className="font-medium text-on-surface">{admin.name || "Unnamed Admin"}</div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-on-surface-variant font-code-block text-xs">
                            {admin.email}
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary-fixed/10 text-primary-fixed border border-primary-fixed/20">
                              {admin.role}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-on-surface-variant text-xs">
                            {admin.id}
                          </td>
                          <td className="py-4 px-6 text-right">
                            {admin.id === currentUserId ? (
                              <div className="flex justify-end items-center gap-2 pr-6">
                                <span className="text-xs text-on-surface-variant italic opacity-60">You (Current Admin)</span>
                                <button
                                  onClick={() => setIsChangingPassword(true)}
                                  className="p-1.5 text-on-surface-variant hover:text-primary-fixed hover:bg-surface-container-high transition-all rounded-lg flex items-center justify-center cursor-pointer"
                                  title="Change Your Password"
                                >
                                  <span className="material-symbols-outlined text-[16px] text-primary-fixed">vpn_key</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity">
                                <button
                                  disabled={isPending}
                                  onClick={() => handleToggleRole(admin.id, admin.role)}
                                  className="p-1.5 text-on-surface-variant hover:text-primary-fixed transition-colors rounded cursor-pointer"
                                  title="Demote to User"
                                >
                                  <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                                </button>
                                <button
                                  disabled={isPending}
                                  onClick={() => handleDeleteUser(admin.id, admin.name || admin.email)}
                                  className="p-1.5 text-on-surface-variant hover:text-error transition-colors rounded cursor-pointer"
                                  title="Delete Administrator"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Mobile Responsive Card-Based Grid View */}
                <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                  {adminList.length === 0 ? (
                    <div className="py-8 text-center text-on-surface-variant italic">No administrators found.</div>
                  ) : (
                    adminList.map((admin) => (
                      <div key={admin.id} className="border border-outline-variant/20 rounded-xl p-4 bg-surface-container-low/40 space-y-3 relative">
                        <div className="flex items-center gap-3">
                          {admin.image ? (
                            <img
                              src={admin.image}
                              alt={admin.name || "Admin"}
                              className="w-12 h-12 rounded-full border border-outline-variant/20 object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary-fixed/20 text-primary-fixed flex items-center justify-center font-bold text-sm uppercase shrink-0">
                              {(admin.name || admin.email || "A").substring(0, 2)}
                            </div>
                          )}
                          <div className="space-y-0.5 min-w-0">
                            <div className="font-bold text-on-surface truncate flex items-center gap-1.5 flex-wrap">
                              {admin.name || "Unnamed Admin"}
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-primary-fixed/15 text-primary-fixed border border-primary-fixed/20 shrink-0">
                                {admin.role}
                              </span>
                            </div>
                            <div className="text-xs text-on-surface-variant truncate font-code-block">{admin.email}</div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-outline-variant/10 text-[10px] text-on-surface-variant">
                          <div className="font-code-block truncate max-w-[150px] opacity-75">ID: {admin.id}</div>
                          <div className="shrink-0">
                            {admin.id === currentUserId ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-on-surface-variant italic opacity-60">You</span>
                                <button
                                  onClick={() => setIsChangingPassword(true)}
                                  className="p-1.5 text-on-surface-variant hover:text-primary-fixed hover:bg-surface-container-high transition-all rounded-lg flex items-center justify-center cursor-pointer border border-outline-variant/20 bg-surface-container-low"
                                  title="Change Your Password"
                                >
                                  <span className="material-symbols-outlined text-[16px] text-primary-fixed">vpn_key</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-1 bg-surface-container-high/30 p-1 rounded-lg border border-outline-variant/15">
                                <button
                                  disabled={isPending}
                                  onClick={() => handleToggleRole(admin.id, admin.role)}
                                  className="p-1.5 text-on-surface-variant hover:text-primary-fixed transition-colors rounded cursor-pointer"
                                  title="Demote to User"
                                >
                                  <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                                </button>
                                <button
                                  disabled={isPending}
                                  onClick={() => handleDeleteUser(admin.id, admin.name || admin.email)}
                                  className="p-1.5 text-on-surface-variant hover:text-error transition-colors rounded cursor-pointer"
                                  title="Delete Administrator"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {activeTab === "users" && (
              <>
                {/* Desktop Table View */}
                <table className="hidden md:table w-full text-left font-body-md text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/30 bg-surface-container-low/50">
                      <th className="py-4 px-6 font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-bold">User</th>
                      <th className="py-4 px-6 font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-bold">Email</th>
                      <th className="py-4 px-6 font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-bold">Role</th>
                      <th className="py-4 px-6 font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-bold">User ID</th>
                      <th className="py-4 px-6 font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 px-6 text-center text-on-surface-variant italic">No registered users found.</td>
                      </tr>
                    ) : (
                      userList.map((userItem) => (
                        <tr key={userItem.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low/30 transition-colors group">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              {userItem.image ? (
                                <img
                                  src={userItem.image}
                                  alt={userItem.name || "User"}
                                  className="w-8 h-8 rounded-full border border-outline-variant/20 object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-outline-variant/20 text-on-surface-variant flex items-center justify-center font-bold text-xs uppercase">
                                  {(userItem.name || userItem.email || "U").substring(0, 2)}
                                </div>
                              )}
                              <div className="font-medium text-on-surface">{userItem.name || "Unnamed User"}</div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-on-surface-variant font-code-block text-xs">
                            {userItem.email}
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-outline-variant/20 text-on-surface-variant border border-outline-variant/30">
                              {userItem.role}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-on-surface-variant text-xs">
                            {userItem.id}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity">
                              <button
                                disabled={isPending}
                                onClick={() => handleToggleRole(userItem.id, userItem.role)}
                                className="p-1.5 text-on-surface-variant hover:text-primary-fixed transition-colors rounded cursor-pointer"
                                title="Promote to Admin"
                              >
                                <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                              </button>
                              <button
                                disabled={isPending}
                                onClick={() => handleDeleteUser(userItem.id, userItem.name || userItem.email)}
                                className="p-1.5 text-on-surface-variant hover:text-error transition-colors rounded cursor-pointer"
                                title="Delete User"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Mobile Responsive Card-Based Grid View */}
                <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                  {userList.length === 0 ? (
                    <div className="py-8 text-center text-on-surface-variant italic">No registered users found.</div>
                  ) : (
                    userList.map((userItem) => (
                      <div key={userItem.id} className="border border-outline-variant/20 rounded-xl p-4 bg-surface-container-low/40 space-y-3 relative">
                        <div className="flex items-center gap-3">
                          {userItem.image ? (
                            <img
                              src={userItem.image}
                              alt={userItem.name || "User"}
                              className="w-12 h-12 rounded-full border border-outline-variant/20 object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-outline-variant/20 text-on-surface-variant flex items-center justify-center font-bold text-sm uppercase shrink-0">
                              {(userItem.name || userItem.email || "U").substring(0, 2)}
                            </div>
                          )}
                          <div className="space-y-0.5 min-w-0">
                            <div className="font-bold text-on-surface truncate flex items-center gap-1.5 flex-wrap">
                              {userItem.name || "Unnamed User"}
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-outline-variant/20 text-on-surface-variant border border-outline-variant/30 shrink-0">
                                {userItem.role}
                              </span>
                            </div>
                            <div className="text-xs text-on-surface-variant truncate font-code-block">{userItem.email}</div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-outline-variant/10 text-[10px] text-on-surface-variant">
                          <div className="font-code-block truncate max-w-[150px] opacity-75">ID: {userItem.id}</div>
                          <div className="shrink-0 flex gap-1 bg-surface-container-high/30 p-1 rounded-lg border border-outline-variant/15">
                            <button
                              disabled={isPending}
                              onClick={() => handleToggleRole(userItem.id, userItem.role)}
                              className="p-1.5 text-on-surface-variant hover:text-primary-fixed transition-colors rounded cursor-pointer"
                              title="Promote to Admin"
                            >
                              <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                            </button>
                            <button
                              disabled={isPending}
                              onClick={() => handleDeleteUser(userItem.id, userItem.name || userItem.email)}
                              className="p-1.5 text-on-surface-variant hover:text-error transition-colors rounded cursor-pointer"
                              title="Delete User"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      {/* Change Password Dialog Modal */}
      {isChangingPassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in px-4">
          <div className="w-full max-w-md glass-panel border border-outline-variant/30 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden bg-surface-container-lowest animate-scale-up">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-outline-variant/10">
              <h3 className="font-headline-md text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-fixed text-[22px]">vpn_key</span>
                Change Your Password
              </h3>
              <button 
                onClick={() => {
                  setIsChangingPassword(false)
                  setChangePasswordVal("")
                  setConfirmPasswordVal("")
                }}
                className="p-1 text-on-surface-variant hover:text-on-surface transition-colors rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-on-surface-variant font-label-sm uppercase tracking-wider pl-1">New Password</label>
                <div className="relative">
                  <input
                    type={showChangePasswordVal ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={changePasswordVal}
                    onChange={(e) => setChangePasswordVal(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl pl-4 pr-10 py-3 text-sm text-on-surface focus:outline-none focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed transition-all placeholder:text-outline-variant"
                  />
                  <button
                    type="button"
                    onClick={() => setShowChangePasswordVal(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary-fixed transition-colors flex items-center justify-center p-0.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showChangePasswordVal ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                {changePasswordVal && (() => {
                  const strength = getPasswordStrength(changePasswordVal);
                  return (
                    <div className="pt-1 px-1 animate-fade-in space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider">
                        <span className="text-on-surface-variant">Strength:</span>
                        <span className={`${strength.colorClass.replace("bg-", "text-")}`}>{strength.label}</span>
                      </div>
                      <div className="w-full bg-outline-variant/20 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${strength.colorClass} transition-all duration-500`} style={{ width: strength.barWidth }}></div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-on-surface-variant font-label-sm uppercase tracking-wider pl-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPasswordVal ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={confirmPasswordVal}
                    onChange={(e) => setConfirmPasswordVal(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl pl-4 pr-10 py-3 text-sm text-on-surface focus:outline-none focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed transition-all placeholder:text-outline-variant"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPasswordVal(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary-fixed transition-colors flex items-center justify-center p-0.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showConfirmPasswordVal ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false)
                    setChangePasswordVal("")
                    setConfirmPasswordVal("")
                  }}
                  className="px-4 py-2.5 rounded-lg font-bold font-label-sm text-xs text-on-surface-variant hover:text-on-surface bg-transparent hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-lg font-bold font-label-sm text-xs bg-primary-fixed text-on-primary-fixed hover:bg-surface-tint transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
