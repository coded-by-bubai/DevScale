"use client"

import { useState, useEffect, useTransition, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import Markdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import 'highlight.js/styles/github-dark.css'
import { postComment, updateComment, deleteComment } from "@/actions/comments"
import { useRouter } from "next/navigation"

interface CommentWithAuthor {
  id: string
  content: string
  createdAt: Date
  authorId: string
  parentId?: string | null
  author: {
    name: string | null
    image: string | null
  }
}

interface ArticleWithRelations {
  id: string
  slug: string
  title: string
  content: string
  excerpt: string | null
  coverImage: string | null
  views: number
  createdAt: Date
  authorId: string
  author: {
    name: string | null
    image: string | null
  }
  tags: { id: string; name: string; slug: string }[]
  comments: CommentWithAuthor[]
}

interface RelatedArticle {
  id: string
  slug: string
  title: string
  excerpt: string | null
  createdAt: Date
  tags: { id: string; name: string; slug: string }[]
  author: { name: string | null }
}

interface ArticlesContentProps {
  article: ArticleWithRelations
  sessionUser: { id: string; name?: string | null; image?: string | null; role: "USER" | "ADMIN" } | null
  relatedArticles?: RelatedArticle[]
}

function CopyablePre({ children, ...props }: any) {
  const [copied, setCopied] = useState(false)

  const getCodeText = (node: any): string => {
    if (!node) return ""
    if (typeof node === "string") return node
    if (Array.isArray(node)) return node.map(getCodeText).join("")
    if (node.props && node.props.children) return getCodeText(node.props.children)
    return ""
  }

  const handleCopy = () => {
    const codeText = getCodeText(children)
    if (!codeText) return
    navigator.clipboard.writeText(codeText)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  return (
    <div className="relative group max-w-full my-6">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-lg border border-outline-variant/30 bg-surface/85 backdrop-blur-md text-on-surface-variant hover:text-primary-fixed hover:border-primary-fixed/40 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md flex items-center gap-1 cursor-pointer"
        title="Copy code"
      >
        {copied ? (
          <>
            <span className="material-symbols-outlined text-[14px] text-green-500 font-bold">check</span>
            <span className="text-[10px] font-bold text-green-500 px-0.5 font-label-sm">Copied!</span>
          </>
        ) : (
          <span className="material-symbols-outlined text-[14px]">content_copy</span>
        )}
      </button>
      <pre {...props} className="!my-0">
        {children}
      </pre>
    </div>
  )
}

export default function ArticlesContent({ article, sessionUser, relatedArticles = [] }: ArticlesContentProps) {
  const router = useRouter()
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [showShareToast, setShowShareToast] = useState(false)
  const [likeCount, setLikeCount] = useState(12) // Initial count simulation
  const [commentText, setCommentText] = useState("")
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [isReplyPending, startReplyTransition] = useTransition()
  const [replyErrorMessage, setReplyErrorMessage] = useState("")
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [isEditPending, startEditTransition] = useTransition()
  const [editErrorMessage, setEditErrorMessage] = useState("")
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeletePending, startDeleteTransition] = useTransition()

  // Initialize likes/bookmarks states from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLiked = localStorage.getItem(`archalgo_liked_${article.slug}`) === "true"
      const isBookmarked = localStorage.getItem(`archalgo_bookmarked_${article.slug}`) === "true"
      Promise.resolve().then(() => {
        setLiked(isLiked)
        setBookmarked(isBookmarked)
        if (isLiked) setLikeCount(prev => prev + 1)
      })
    }
  }, [article.slug])

  // Handle Like Toggle
  const handleLike = () => {
    const newLikedState = !liked
    setLiked(newLikedState)
    setLikeCount(prev => newLikedState ? prev + 1 : prev - 1)
    localStorage.setItem(`archalgo_liked_${article.slug}`, String(newLikedState))
  }

  // Handle Bookmark Toggle
  const handleBookmark = () => {
    const newBookmarkedState = !bookmarked
    setBookmarked(newBookmarkedState)
    localStorage.setItem(`archalgo_bookmarked_${article.slug}`, String(newBookmarkedState))
  }

  // Handle Share URL Copy
  const handleShare = () => {
    if (typeof window !== "undefined") {
      const url = window.location.href;
      const shareData = {
        title: article.title,
        text: `Check out "${article.title}" on ArchAlgo!`,
        url: url
      }
      if (navigator.share) {
        navigator.share(shareData).catch(() => {
          copyToClipboard(url)
        })
      } else {
        copyToClipboard(url)
      }
    }
  }

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
    setShowShareToast(true)
    setTimeout(() => {
      setShowShareToast(false)
    }, 2500)
  }

  // Parse Headings for TOC
  const getHeadingText = (node: any): string => {
    if (!node) return ""
    if (typeof node === "string") return node
    if (Array.isArray(node)) return node.map(getHeadingText).join("")
    if (node.props && node.props.children) return getHeadingText(node.props.children)
    return ""
  }

  const parseHeadings = (content: string) => {
    const lines = content.split("\n")
    const headings: { text: string; id: string; level: number }[] = []
    lines.forEach(line => {
      const match = line.match(/^(#{2,3})\s+(.+)$/)
      if (match) {
        const level = match[1].length
        const text = match[2].trim()
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-")
        headings.push({ text, id, level })
      }
    })
    return headings
  }

  const headings = parseHeadings(article.content)

  // Custom Markdown overrides to assign IDs to headers for TOC anchoring
  const markdownComponents = {
    h2: ({ children, ...props }: any) => {
      const text = getHeadingText(children)
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      return <h2 id={id} className="font-headline-lg text-headline-lg text-on-surface mt-12 mb-6 px-4 sm:px-0" {...props}>{children}</h2>
    },
    h3: ({ children, ...props }: any) => {
      const text = getHeadingText(children)
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      return <h3 id={id} className="font-headline-lg text-[24px] text-on-surface mt-10 mb-4 px-4 sm:px-0" {...props}>{children}</h3>
    },
    p: ({ children, ...props }: any) => {
      return <p className="mb-6 leading-relaxed text-on-surface/90 px-4 sm:px-0" {...props}>{children}</p>
    },
    blockquote: ({ children, ...props }: any) => {
      return (
        <blockquote className="border-l-2 border-primary-fixed pl-6 py-2 my-8 glass-panel rounded-r italic text-on-surface-variant mx-4 sm:mx-0" {...props}>
          {children}
        </blockquote>
      )
    },
    ul: ({ children, ...props }: any) => {
      return <ul className="list-disc pl-6 pr-4 sm:pr-0 mb-6 space-y-2 text-on-surface/95" {...props}>{children}</ul>
    },
    ol: ({ children, ...props }: any) => {
      return <ol className="list-decimal pl-6 pr-4 sm:pr-0 mb-6 space-y-2 text-on-surface/95" {...props}>{children}</ol>
    },
    a: ({ children, href, ...props }: any) => {
      const isImageUrl = href && (/\.(jpeg|jpg|gif|png|webp|svg|bmp)(?:\?.*)?$/i.test(href) || href.includes("googleusercontent.com"))

      if (isImageUrl) {
        return (
          <span className="block my-8 rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-container-low shadow-lg max-w-full">
            <img
              src={href}
              alt={typeof children === 'string' ? children : "Article Image"}
              className="w-full object-cover max-h-[450px] opacity-90 hover:opacity-100 transition-opacity duration-300"
              {...props}
            />
          </span>
        )
      }

      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-fixed hover:underline underline-offset-4 decoration-primary-fixed/30 hover:decoration-primary-fixed transition-all font-medium cursor-pointer"
          {...props}
        >
          {children}
        </a>
      )
    },
    img: ({ src, alt, ...props }: any) => (
      <span className="block my-8 rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-container-low shadow-lg max-w-full">
        <img
          src={src}
          alt={alt}
          className="w-full object-cover max-h-[450px] opacity-90 hover:opacity-100 transition-opacity duration-300"
          {...props}
        />
      </span>
    ),
    pre: CopyablePre,
  }

  const commentMarkdownComponents = {
    a: ({ children, href, ...props }: any) => {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-fixed hover:underline underline-offset-4 decoration-primary-fixed/30 hover:decoration-primary-fixed transition-all font-medium cursor-pointer"
          {...props}
        >
          {children}
        </a>
      )
    },
    pre: CopyablePre,
  }

  const decodeHtmlEntities = (str: string) => {
    return str
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");
  }

  // Handle Comment Submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setErrorMessage("")

    startTransition(async () => {
      try {
        await postComment(article.id, commentText)
        setCommentText("")
        router.refresh() // Pull updated comments from database
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to submit comment. Please sign in.")
      }
    })
  }

  // Helper toolbar for comments text insertion
  const insertText = (before: string, after: string = "") => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selected = text.substring(start, end)
    const replacement = before + selected + after
    setCommentText(text.substring(0, start) + replacement + text.substring(end))
    textarea.focus()
    // Select the inserted text range
    setTimeout(() => {
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length)
    }, 0)
  }

  // Handle Reply Submission
  const handleReplySubmit = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault()
    if (!replyText.trim()) return
    setReplyErrorMessage("")

    startReplyTransition(async () => {
      try {
        await postComment(article.id, replyText, parentId)
        setReplyText("")
        setReplyingToId(null)
        router.refresh()
      } catch (err: any) {
        setReplyErrorMessage(err.message || "Failed to submit reply. Please sign in.")
      }
    })
  }

  // Helper toolbar for reply text insertion
  const insertReplyText = (before: string, after: string = "") => {
    const textarea = replyTextareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selected = text.substring(start, end)
    const replacement = before + selected + after
    setReplyText(text.substring(0, start) + replacement + text.substring(end))
    textarea.focus()
    // Select the inserted text range
    setTimeout(() => {
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length)
    }, 0)
  }

  // Handle Edit Submission
  const handleEditSubmit = async (e: React.FormEvent, commentId: string) => {
    e.preventDefault()
    if (!editText.trim()) return
    setEditErrorMessage("")

    startEditTransition(async () => {
      try {
        await updateComment(commentId, editText)
        setEditText("")
        setEditingId(null)
        router.refresh()
      } catch (err: any) {
        setEditErrorMessage(err.message || "Failed to update comment.")
      }
    })
  }

  // Handle Comment Deletion
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return
    setDeletingId(commentId)

    startDeleteTransition(async () => {
      try {
        await deleteComment(commentId)
        router.refresh()
      } catch (err: any) {
        alert(err.message || "Failed to delete comment.")
      } finally {
        setDeletingId(null)
      }
    })
  }

  // Helper toolbar for edit text insertion
  const insertEditText = (before: string, after: string = "") => {
    const textarea = editTextareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selected = text.substring(start, end)
    const replacement = before + selected + after
    setEditText(text.substring(0, start) + replacement + text.substring(end))
    textarea.focus()
    // Select the inserted text range
    setTimeout(() => {
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length)
    }, 0)
  }

  // Separate top-level parent comments from nested replies
  const parentComments = article.comments
    .filter(c => !c.parentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const getRepliesForComment = (parentId: string) => {
    return article.comments
      .filter(c => c.parentId === parentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }

  return (
    <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
      {/* Floating Action Bar (Left Sidebar on Desktop) */}
      <aside className="hidden lg:block lg:col-span-1 relative">
        <div className="sticky top-32 flex flex-col items-center gap-4 py-4 glass-panel rounded-full w-12 mx-auto border border-outline-variant/30">
          <button
            aria-label="Like"
            onClick={handleLike}
            className={`transition-colors group relative p-2 ${liked ? "text-primary-fixed" : "text-on-surface-variant hover:text-primary-fixed"}`}
          >
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform" style={{ fontVariationSettings: liked ? "'FILL' 1" : undefined }}>
              favorite
            </span>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-surface-container-low px-2 py-0.5 rounded text-[10px] md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity font-label-sm border border-outline-variant/30">
              {likeCount}
            </span>
          </button>
          <div className="w-6 h-px bg-outline-variant/30"></div>
          <button
            aria-label="Bookmark"
            onClick={handleBookmark}
            className={`transition-colors group relative p-2 ${bookmarked ? "text-primary-fixed" : "text-on-surface-variant hover:text-primary-fixed"}`}
          >
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform" style={{ fontVariationSettings: bookmarked ? "'FILL' 1" : undefined }}>
              bookmark
            </span>
          </button>
          <div className="w-6 h-px bg-outline-variant/30"></div>
          <button
            aria-label="Share"
            onClick={handleShare}
            className="text-on-surface-variant hover:text-primary-fixed transition-colors group relative p-2"
          >
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">
              share
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile Floating Action Bar (Fixed at bottom center on mobile/tablet) */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-panel rounded-full px-6 py-2.5 border border-outline-variant/30 flex gap-6 items-center shadow-2xl bg-surface/90 backdrop-blur-md animate-fade-in">
        <button
          aria-label="Like"
          onClick={handleLike}
          className={`transition-colors p-2 flex items-center gap-1.5 ${liked ? "text-primary-fixed" : "text-on-surface-variant hover:text-primary-fixed"}`}
        >
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: liked ? "'FILL' 1" : undefined }}>
            favorite
          </span>
          <span className="text-xs font-bold font-label-sm">{likeCount}</span>
        </button>

        <div className="w-px h-6 bg-outline-variant/30"></div>

        <button
          aria-label="Bookmark"
          onClick={handleBookmark}
          className={`transition-colors p-2 flex items-center ${bookmarked ? "text-primary-fixed" : "text-on-surface-variant hover:text-primary-fixed"}`}
        >
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: bookmarked ? "'FILL' 1" : undefined }}>
            bookmark
          </span>
        </button>

        <div className="w-px h-6 bg-outline-variant/30"></div>

        <button
          aria-label="Share"
          onClick={handleShare}
          className="transition-colors p-2 text-on-surface-variant hover:text-primary-fixed flex items-center"
        >
          <span className="material-symbols-outlined text-2xl">
            share
          </span>
        </button>
      </div>

      {/* Main Column */}
      <div className="col-span-1 lg:col-span-8 max-w-[65ch] mx-auto w-full">
        {/* Header Section */}
        <header className="mb-12 px-4 sm:px-0">
          <div className="flex items-center gap-3 mb-6">
            {article.tags && article.tags[0] && (
              <Link href={`/topics/${article.tags[0].slug}`} className="font-label-sm text-label-sm uppercase tracking-widest text-primary-fixed bg-primary-fixed/10 border border-primary-fixed/20 px-2.5 py-1 rounded hover:bg-primary-fixed/20 transition-colors">
                {article.tags[0].name}
              </Link>
            )}
            <span className="text-on-surface-variant text-sm flex items-center gap-1 font-body-md">
              <span className="material-symbols-outlined text-[16px]">schedule</span> 12 min read
            </span>
          </div>

          <h1 className="font-headline-xl text-3xl sm:text-4xl md:text-5xl lg:text-headline-xl text-on-surface mb-6 leading-tight">
            {article.title}
          </h1>

          <div className="flex items-center gap-4 py-6 border-y border-outline-variant/20">
            {article.author.image && (
              <Image
                src={article.author.image}
                alt={article.author.name || "Author"}
                width={48}
                height={48}
                className="rounded-full object-cover border border-outline-variant/50"
              />
            )}
            <div>
              <div className="font-medium text-on-surface font-body-md">{article.author.name || "Anonymous"}</div>
              <div className="text-on-surface-variant text-sm font-body-md" suppressHydrationWarning>
                Published {new Date(article.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • {article.views} views
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="prose prose-invert max-w-none text-body-md font-body-md">
          <Markdown components={markdownComponents} rehypePlugins={[rehypeHighlight]}>
            {article.content}
          </Markdown>
        </div>

        {/* Footer actions for mobile view */}
        <div className="mt-12 pt-8 border-t border-outline-variant/20 flex lg:hidden justify-between items-center gap-6 px-4 sm:px-0">
          <div className="flex flex-wrap gap-2">
            {article.tags.map(tag => (
              <Link key={tag.id} href={`/topics/${tag.slug}`} className="font-label-sm text-label-sm border border-outline-variant px-3 py-1 rounded-full text-on-surface-variant hover:border-primary-fixed hover:text-primary-fixed transition-colors">
                #{tag.name.toUpperCase()}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-4 text-on-surface-variant">
            <button onClick={handleLike} className={`p-1.5 rounded ${liked ? "text-primary-fixed" : "hover:text-primary-fixed"}`}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: liked ? "'FILL' 1" : undefined }}>favorite</span>
            </button>
            <button onClick={handleBookmark} className={`p-1.5 rounded ${bookmarked ? "text-primary-fixed" : "hover:text-primary-fixed"}`}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: bookmarked ? "'FILL' 1" : undefined }}>bookmark</span>
            </button>
            <button onClick={handleShare} className="p-1.5 rounded hover:text-primary-fixed">
              <span className="material-symbols-outlined">share</span>
            </button>
          </div>
        </div>

        {/* Related Articles for Mobile/Tablet */}
        {relatedArticles && relatedArticles.length > 0 && (
          <div className="block lg:hidden mt-12 p-6 glass-panel border border-outline-variant/30 rounded-xl">
            <h4 className="font-label-sm text-label-sm text-on-surface mb-4 uppercase tracking-wider">
              Related Articles
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedArticles.map((rel) => (
                <Link key={rel.id} href={`/${rel.tags[0]?.slug || "uncategorized"}/${rel.slug}`} className="p-4 bg-surface-container-low hover:bg-surface-container border border-outline-variant/20 rounded-lg group transition-colors block">
                  <span className="text-xs text-on-surface-variant group-hover:text-primary-fixed transition-colors font-medium line-clamp-2 leading-relaxed">
                    {rel.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Discussion Board / Comments Section */}
        <section className="mt-16 pt-12 border-t border-outline-variant/20">
          <h3 className="font-headline-lg text-headline-lg text-[24px] text-on-surface mb-8 px-4 sm:px-0">
            Discussion ({article.comments.length})
          </h3>

          {/* Comment submission form */}
          {sessionUser ? (
            <div className="px-4 sm:px-0">
              <form onSubmit={handleCommentSubmit} className="flex gap-2 sm:gap-4 mb-10">
              {sessionUser.image && (
                <Image
                  src={sessionUser.image}
                  alt={sessionUser.name || "User"}
                  width={40}
                  height={40}
                  className="rounded-full border border-outline-variant/50 object-cover w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="glass-panel rounded-lg border border-outline-variant/50 focus-within:border-primary-fixed focus-within:ring-1 focus-within:ring-primary-fixed transition-all overflow-hidden bg-surface-container-low">
                  <textarea
                    ref={textareaRef}
                    className="w-full bg-transparent border-none text-on-surface placeholder-outline/50 p-2 sm:p-4 font-body-md text-body-md focus:ring-0 resize-none min-h-[100px] outline-none"
                    placeholder="Add to the discussion... (Markdown supported)"
                    rows={3}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={isPending}
                  />
                  <div className="bg-surface border-t border-outline-variant/30 px-2 sm:px-4 py-2 flex justify-between items-center">
                    <div className="flex gap-2 text-on-surface-variant">
                      <button type="button" onClick={() => insertText("**", "**")} className="hover:text-primary-fixed p-1" title="Bold">
                        <span className="material-symbols-outlined text-[18px]">format_bold</span>
                      </button>
                      <button type="button" onClick={() => insertText("```javascript\n", "\n```")} className="hover:text-primary-fixed p-1" title="Code">
                        <span className="material-symbols-outlined text-[18px]">code</span>
                      </button>
                      <button type="button" onClick={() => insertText("[", "](url)")} className="hover:text-primary-fixed p-1" title="Link">
                        <span className="material-symbols-outlined text-[18px]">link</span>
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={isPending || !commentText.trim()}
                      className="bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold px-4 py-1.5 rounded hover:bg-primary-container disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {isPending && <span className="material-symbols-outlined text-sm animate-spin">sync</span>}
                      <span>{isPending ? "Posting..." : "Comment"}</span>
                    </button>
                  </div>
                </div>
                {errorMessage && (
                  <p className="text-error text-xs mt-2">{errorMessage}</p>
                )}
              </div>
            </form>
          </div>
        ) : (
            <div className="px-4 sm:px-0">
              <div className="glass-panel rounded-lg border border-outline-variant/30 p-6 text-center mb-10 flex flex-col items-center gap-3">
                <p className="text-on-surface-variant font-body-md text-sm">
                  You must be logged in to participate in the technical discussions.
                </p>
                <Link href="/api/auth/signin" className="bg-primary-container text-on-primary-fixed font-label-sm text-xs font-bold px-5 py-2 rounded-DEFAULT hover:bg-surface-tint transition-colors">
                  Sign In to Comment
                </Link>
              </div>
            </div>
          )}

          {/* Comments Feed */}
          <div className="space-y-6">
            {isPending && (
              <div className="flex gap-2 sm:gap-4 animate-pulse mb-6">
                <div className="rounded-full w-8 h-8 sm:w-10 sm:h-10 bg-surface-container-high flex-shrink-0"></div>
                <div className="flex-grow bg-surface-container-low border border-outline-variant/30 rounded-xl p-3 sm:p-5 shadow-sm space-y-3.5">
                  <div className="flex justify-between items-center">
                    <div className="h-4.5 w-28 bg-surface-container-high rounded"></div>
                    <div className="h-3 w-16 bg-surface-container-high rounded"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3.5 w-full bg-surface-container-high/60 rounded"></div>
                    <div className="h-3.5 w-5/6 bg-surface-container-high/60 rounded"></div>
                  </div>
                </div>
              </div>
            )}
            {parentComments.length > 0 ? (
              parentComments.map(comment => {
                const isAuthor = comment.authorId === article.authorId
                const replies = getRepliesForComment(comment.id)
                return (
                  <div key={comment.id} className="space-y-4">
                    {/* Parent Comment */}
                    <div className="flex gap-2 sm:gap-4">
                      {comment.author.image ? (
                        <Image
                          src={comment.author.image}
                          alt={comment.author.name || "User"}
                          width={40}
                          height={40}
                          className="rounded-full border border-outline-variant/40 object-cover w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0"
                        />
                      ) : (
                        <div className="rounded-full border border-outline-variant/40 w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 bg-surface-container flex items-center justify-center font-bold text-[10px] sm:text-sm text-on-surface-variant">
                          {comment.author.name?.substring(0, 2).toUpperCase() || "AN"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 bg-surface-container-low border border-outline-variant/30 rounded-xl p-2.5 sm:p-4 md:p-5 shadow-sm transition-all duration-300 hover:border-outline-variant/50">
                        <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-on-surface text-sm">{comment.author.name || "Anonymous"}</span>
                            {isAuthor && (
                              <span className="text-[9px] uppercase font-extrabold tracking-wider bg-primary-fixed/20 text-primary-fixed px-1.5 py-0.5 rounded border border-primary-fixed/30">
                                Author
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-on-surface-variant/80" suppressHydrationWarning>
                            {new Date(comment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {editingId === comment.id ? (
                          <form onSubmit={(e) => handleEditSubmit(e, comment.id)} className="mt-2 animate-fade-in">
                            <div className="glass-panel rounded-lg border border-outline-variant/50 focus-within:border-primary-fixed focus-within:ring-1 focus-within:ring-primary-fixed transition-all overflow-hidden bg-surface-container-low">
                              <textarea
                                ref={editTextareaRef}
                                className="w-full bg-transparent border-none text-on-surface placeholder-outline/50 p-3 font-body-md text-sm focus:ring-0 resize-none min-h-[80px] outline-none"
                                rows={3}
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                disabled={isEditPending}
                              />
                              <div className="bg-surface border-t border-outline-variant/30 px-3 py-1.5 flex justify-between items-center">
                                <div className="flex gap-1.5 text-on-surface-variant">
                                  <button type="button" onClick={() => insertEditText("**", "**")} className="hover:text-primary-fixed p-1" title="Bold">
                                    <span className="material-symbols-outlined text-[16px]">format_bold</span>
                                  </button>
                                  <button type="button" onClick={() => insertEditText("```javascript\n", "\n```")} className="hover:text-primary-fixed p-1" title="Code">
                                    <span className="material-symbols-outlined text-[16px]">code</span>
                                  </button>
                                  <button type="button" onClick={() => insertEditText("[", "](url)")} className="hover:text-primary-fixed p-1" title="Link">
                                    <span className="material-symbols-outlined text-[16px]">link</span>
                                  </button>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingId(null)}
                                    className="text-on-surface-variant hover:text-on-surface font-semibold text-xs px-3 py-1.5 rounded transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={isEditPending || !editText.trim()}
                                    className="bg-primary-fixed text-on-primary-fixed font-label-sm text-xs font-bold px-3.5 py-1.5 rounded hover:bg-primary-container disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1"
                                  >
                                    {isEditPending && <span className="material-symbols-outlined text-xs animate-spin">sync</span>}
                                    <span>{isEditPending ? "Saving..." : "Save"}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                            {editErrorMessage && (
                              <p className="text-error text-xs mt-2">{editErrorMessage}</p>
                            )}
                          </form>
                        ) : (
                          <div className="prose prose-invert prose-sm max-w-none text-on-surface/90 break-words">
                            <Markdown components={commentMarkdownComponents} rehypePlugins={[rehypeHighlight]}>
                              {decodeHtmlEntities(comment.content)}
                            </Markdown>
                          </div>
                        )}

                        {/* Reply / Edit / Delete Actions */}
                        <div className="mt-3 flex items-center justify-between border-t border-outline-variant/10 pt-2.5">
                          <div className="flex flex-wrap gap-2 sm:gap-3.5 items-center">
                            {sessionUser ? (
                              <button
                                onClick={() => {
                                  if (replyingToId === comment.id) {
                                    setReplyingToId(null)
                                  } else {
                                    setReplyingToId(comment.id)
                                    setReplyText("")
                                    setReplyErrorMessage("")
                                  }
                                }}
                                className="text-xs text-primary-fixed hover:text-primary-container font-semibold transition-colors flex items-center gap-1.5 hover:underline decoration-primary-fixed/30 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">reply</span>
                                <span>{replyingToId === comment.id ? "Cancel Reply" : "Reply"}</span>
                              </button>
                            ) : (
                              <Link
                                href="/api/auth/signin"
                                className="text-xs text-on-surface-variant hover:text-primary-fixed font-medium transition-colors flex items-center gap-1 hover:underline cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[15px]">login</span>
                                <span>Sign in to reply</span>
                              </Link>
                            )}

                            {/* Edit Button (only owner) */}
                            {sessionUser && comment.authorId === sessionUser.id && editingId !== comment.id && (
                              <>
                                <span className="text-outline-variant/20 text-xs hidden sm:inline">|</span>
                                <button
                                  onClick={() => {
                                    setEditingId(comment.id)
                                    setEditText(comment.content.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'"))
                                    setEditErrorMessage("")
                                  }}
                                  className="text-xs text-on-surface-variant hover:text-primary-fixed transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[15px]">edit</span>
                                  <span>Edit</span>
                                </button>
                              </>
                            )}

                            {/* Delete Button (owner or admin) */}
                            {sessionUser && (comment.authorId === sessionUser.id || sessionUser.role === "ADMIN") && (
                              <>
                                <span className="text-outline-variant/20 text-xs hidden sm:inline">|</span>
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  disabled={isDeletePending}
                                  className="text-xs text-error/80 hover:text-error transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  {deletingId === comment.id ? (
                                    <span className="material-symbols-outlined text-[15px] animate-spin">sync</span>
                                  ) : (
                                    <span className="material-symbols-outlined text-[15px]">delete</span>
                                  )}
                                  <span>{deletingId === comment.id ? "Deleting..." : "Delete"}</span>
                                </button>
                              </>
                            )}
                          </div>
                          
                          {replies.length > 0 && (
                            <span className="text-xs text-on-surface-variant/70 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px]">forum</span>
                              <span>{replies.length} {replies.length === 1 ? "reply" : "replies"}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Inline Reply Form */}
                    {replyingToId === comment.id && sessionUser && (
                      <div className="ml-2 sm:ml-12 pl-2 sm:pl-4 border-l-2 border-primary-fixed/30 animate-fade-in">
                        <form onSubmit={(e) => handleReplySubmit(e, comment.id)} className="flex gap-2 sm:gap-3">
                          {sessionUser.image ? (
                            <Image
                              src={sessionUser.image}
                              alt={sessionUser.name || "User"}
                              width={32}
                              height={32}
                              className="rounded-full border border-outline-variant/50 object-cover w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0"
                            />
                          ) : (
                            <div className="rounded-full border border-outline-variant/50 w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 bg-surface-container flex items-center justify-center font-bold text-[8px] sm:text-xs text-on-surface-variant">
                              {sessionUser.name?.substring(0, 2).toUpperCase() || "ME"}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="glass-panel rounded-lg border border-outline-variant/50 focus-within:border-primary-fixed focus-within:ring-1 focus-within:ring-primary-fixed transition-all overflow-hidden bg-surface-container-low">
                              <textarea
                                ref={replyTextareaRef}
                                className="w-full bg-transparent border-none text-on-surface placeholder-outline/50 p-2 sm:p-3 font-body-md text-sm focus:ring-0 resize-none min-h-[80px] outline-none"
                                placeholder={`Reply to ${comment.author.name || "Anonymous"}...`}
                                rows={2}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                disabled={isReplyPending}
                              />
                              <div className="bg-surface border-t border-outline-variant/30 px-2 sm:px-3 py-1.5 flex justify-between items-center">
                                <div className="flex gap-1.5 text-on-surface-variant">
                                  <button type="button" onClick={() => insertReplyText("**", "**")} className="hover:text-primary-fixed p-1" title="Bold">
                                    <span className="material-symbols-outlined text-[16px]">format_bold</span>
                                  </button>
                                  <button type="button" onClick={() => insertReplyText("```javascript\n", "\n```")} className="hover:text-primary-fixed p-1" title="Code">
                                    <span className="material-symbols-outlined text-[16px]">code</span>
                                  </button>
                                  <button type="button" onClick={() => insertReplyText("[", "](url)")} className="hover:text-primary-fixed p-1" title="Link">
                                    <span className="material-symbols-outlined text-[16px]">link</span>
                                  </button>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setReplyingToId(null)}
                                    className="text-on-surface-variant hover:text-on-surface font-semibold text-xs px-3 py-1.5 rounded transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={isReplyPending || !replyText.trim()}
                                    className="bg-primary-fixed text-on-primary-fixed font-label-sm text-xs font-bold px-3.5 py-1.5 rounded hover:bg-primary-container disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1"
                                  >
                                    {isReplyPending && <span className="material-symbols-outlined text-xs animate-spin">sync</span>}
                                    <span>{isReplyPending ? "Replying..." : "Reply"}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                            {replyErrorMessage && (
                              <p className="text-error text-xs mt-2">{replyErrorMessage}</p>
                            )}
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Nested Replies */}
                    {(replies.length > 0 || (isReplyPending && replyingToId === comment.id)) && (
                      <div className="ml-2 sm:ml-12 pl-2 sm:pl-6 border-l-2 border-outline-variant/30 mt-2 space-y-4">
                        {isReplyPending && replyingToId === comment.id && (
                          <div className="flex gap-2 animate-pulse mb-3">
                            <div className="rounded-full w-6 h-6 sm:w-8 sm:h-8 bg-surface-container-high flex-shrink-0 animate-pulse"></div>
                            <div className="flex-grow bg-surface-container-low/60 border border-outline-variant/20 rounded-xl p-2 sm:p-4 space-y-2.5 shadow-sm animate-pulse">
                              <div className="flex justify-between items-center">
                                <div className="h-3.5 w-24 bg-surface-container-high rounded"></div>
                                <div className="h-2.5 w-12 bg-surface-container-high rounded"></div>
                              </div>
                              <div className="space-y-1.5">
                                <div className="h-3 w-full bg-surface-container-high/60 rounded"></div>
                                <div className="h-3 w-3/4 bg-surface-container-high/60 rounded"></div>
                              </div>
                            </div>
                          </div>
                        )}
                        {replies.map(reply => {
                          const isReplyAuthor = reply.authorId === article.authorId
                          return (
                            <div key={reply.id} className="flex gap-2 animate-fade-in">
                              {reply.author.image ? (
                                <Image
                                  src={reply.author.image}
                                  alt={reply.author.name || "User"}
                                  width={32}
                                  height={32}
                                  className="rounded-full border border-outline-variant/40 object-cover w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0"
                                />
                              ) : (
                                <div className="rounded-full border border-outline-variant/40 w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 bg-surface-container flex items-center justify-center font-bold text-[8px] sm:text-xs text-on-surface-variant">
                                  {reply.author.name?.substring(0, 2).toUpperCase() || "AN"}
                                </div>
                              )}
                              <div className="flex-1 min-w-0 bg-surface-container-low/60 border border-outline-variant/20 rounded-xl p-2 sm:p-4 shadow-sm hover:border-outline-variant/30 transition-all">
                                <div className="flex justify-between items-center mb-1.5 gap-2 flex-wrap">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-on-surface text-xs sm:text-sm">{reply.author.name || "Anonymous"}</span>
                                    {isReplyAuthor && (
                                      <span className="text-[8px] uppercase font-extrabold tracking-wider bg-primary-fixed/20 text-primary-fixed px-1.5 py-0.5 rounded border border-primary-fixed/30">
                                        Author
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-on-surface-variant/75" suppressHydrationWarning>
                                    {new Date(reply.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                {editingId === reply.id ? (
                                  <form onSubmit={(e) => handleEditSubmit(e, reply.id)} className="mt-2 animate-fade-in">
                                    <div className="glass-panel rounded-lg border border-outline-variant/50 focus-within:border-primary-fixed focus-within:ring-1 focus-within:ring-primary-fixed transition-all overflow-hidden bg-surface-container-low">
                                      <textarea
                                        ref={editTextareaRef}
                                        className="w-full bg-transparent border-none text-on-surface placeholder-outline/50 p-2.5 font-body-md text-xs sm:text-sm focus:ring-0 resize-none min-h-[70px] outline-none"
                                        rows={2}
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        disabled={isEditPending}
                                      />
                                      <div className="bg-surface border-t border-outline-variant/30 px-2.5 py-1 flex justify-between items-center">
                                        <div className="flex gap-1 text-on-surface-variant">
                                          <button type="button" onClick={() => insertEditText("**", "**")} className="hover:text-primary-fixed p-0.5" title="Bold">
                                            <span className="material-symbols-outlined text-[15px]">format_bold</span>
                                          </button>
                                          <button type="button" onClick={() => insertEditText("```javascript\n", "\n```")} className="hover:text-primary-fixed p-0.5" title="Code">
                                            <span className="material-symbols-outlined text-[15px]">code</span>
                                          </button>
                                          <button type="button" onClick={() => insertEditText("[", "](url)")} className="hover:text-primary-fixed p-0.5" title="Link">
                                            <span className="material-symbols-outlined text-[15px]">link</span>
                                          </button>
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setEditingId(null)}
                                            className="text-on-surface-variant hover:text-on-surface font-semibold text-[11px] px-2 py-1 rounded transition-colors cursor-pointer"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="submit"
                                            disabled={isEditPending || !editText.trim()}
                                            className="bg-primary-fixed text-on-primary-fixed font-label-sm text-[11px] font-bold px-3 py-1 rounded hover:bg-primary-container disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1"
                                          >
                                            {isEditPending && <span className="material-symbols-outlined text-[11px] animate-spin">sync</span>}
                                            <span>{isEditPending ? "Saving..." : "Save"}</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                    {editErrorMessage && (
                                      <p className="text-error text-xs mt-1">{editErrorMessage}</p>
                                    )}
                                  </form>
                                ) : (
                                  <>
                                    <div className="prose prose-invert prose-sm max-w-none text-on-surface/90 break-words">
                                      <Markdown components={commentMarkdownComponents} rehypePlugins={[rehypeHighlight]}>
                                        {decodeHtmlEntities(reply.content)}
                                      </Markdown>
                                    </div>
                                    
                                    {/* Actions for owner / admin */}
                                    {sessionUser && (reply.authorId === sessionUser.id || sessionUser.role === "ADMIN") && (
                                      <div className="mt-2 flex items-center gap-2 border-t border-outline-variant/10 pt-1.5">
                                        {reply.authorId === sessionUser.id && (
                                          <button
                                            onClick={() => {
                                              setEditingId(reply.id)
                                              setEditText(reply.content.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'"))
                                              setEditErrorMessage("")
                                            }}
                                            className="text-[11px] text-on-surface-variant hover:text-primary-fixed transition-colors flex items-center gap-1 cursor-pointer"
                                          >
                                            <span className="material-symbols-outlined text-[13px]">edit</span>
                                            <span>Edit</span>
                                          </button>
                                        )}
                                        
                                        {reply.authorId === sessionUser.id && <span className="text-outline-variant/20 text-[10px]">|</span>}
                                        
                                        <button
                                          onClick={() => handleDeleteComment(reply.id)}
                                          disabled={isDeletePending}
                                          className="text-[11px] text-error/80 hover:text-error transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                        >
                                          {deletingId === reply.id ? (
                                            <span className="material-symbols-outlined text-[13px] animate-spin">sync</span>
                                          ) : (
                                            <span className="material-symbols-outlined text-[13px]">delete</span>
                                          )}
                                          <span>{deletingId === reply.id ? "Deleting..." : "Delete"}</span>
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <p className="text-on-surface-variant italic font-body-md text-sm text-center py-6">
                No discussions yet. Be the first to start the conversation!
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Table of Contents (Right Sidebar on Desktop) */}
      <aside className="hidden lg:block lg:col-span-3 relative">
        <div className="sticky top-32 space-y-6">
          <div className="glass-panel border border-outline-variant/30 rounded-xl p-6">
            <h4 className="font-label-sm text-label-sm text-on-surface mb-4 uppercase tracking-wider">
              On this page
            </h4>
            {headings.length > 0 ? (
              <ul className="space-y-3 text-xs text-on-surface-variant font-body-md">
                {headings.map((heading, i) => (
                  <li key={i} style={{ paddingLeft: heading.level === 3 ? "12px" : "0" }}>
                    <a
                      href={`#${heading.id}`}
                      className="hover:text-primary-fixed transition-colors border-l border-transparent hover:border-primary-fixed pl-2 block text-ellipsis overflow-hidden whitespace-nowrap"
                    >
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-on-surface-variant italic">
                No sections detected.
              </p>
            )}
          </div>

          {/* Related Articles Card */}
          {relatedArticles && relatedArticles.length > 0 && (
            <div className="glass-panel border border-outline-variant/30 rounded-xl p-6">
              <h4 className="font-label-sm text-label-sm text-on-surface mb-4 uppercase tracking-wider">
                Related Articles
              </h4>
              <ul className="space-y-4">
                {relatedArticles.map((rel) => (
                  <li key={rel.id} className="group">
                    <Link href={`/${rel.tags[0]?.slug || "uncategorized"}/${rel.slug}`}>
                      <span className="text-xs text-on-surface-variant group-hover:text-primary-fixed transition-colors font-medium line-clamp-2 leading-relaxed block">
                        {rel.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>

      {/* Premium Glassmorphic Share Toast Notification */}
      {showShareToast && (
        <div className="fixed bottom-24 right-4 md:right-8 z-50 glass-panel border border-primary-fixed/30 bg-surface/90 text-on-surface px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 animate-slide-in-up transition-all duration-300">
          <span className="material-symbols-outlined text-primary-fixed text-lg animate-bounce">check_circle</span>
          <div className="flex flex-col">
            <span className="font-bold text-xs font-label-sm">Link Copied!</span>
            <span className="text-[10px] text-on-surface-variant font-body-md">Share it with your colleagues</span>
          </div>
        </div>
      )}
    </div>
  )
}
