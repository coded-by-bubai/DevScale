"use client"

import { useState, useTransition } from "react"
import { getArticles } from "@/actions/articles"
import Link from "next/link"

function cleanString(text: string | null) {
  if (!text) return ""
  return text
    .replace(/!\[[^\]]*\]\s*\([^)]*\)?/g, "") // Remove Markdown images aggressively with optional whitespace (including truncated ones)
    .replace(/\[([^\]]*)\]\s*\([^)]*\)?/g, "$1") // Remove Markdown links aggressively with optional whitespace (including truncated ones)
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/https?:\/\/[^\s]+/g, "") // Remove raw URLs
    .replace(/(?:^|\n)(?:#{1,6}\s+)/g, "\n") // Remove headers
    .replace(/[*_`~#]/g, "") // Remove inline formatting
    .replace(/\s+/g, " ") // Collapse whitespaces
    .trim()
}

function getCleanExcerpt(text: string | null, limit: number, fallbackText?: string | null) {
  const cleanPrimary = cleanString(text)
  if (cleanPrimary.length >= 30) {
    return cleanPrimary.substring(0, limit)
  }
  if (fallbackText) {
    return cleanString(fallbackText).substring(0, limit)
  }
  return cleanPrimary.substring(0, limit)
}

interface LoadMoreArticlesProps {
  initialTag?: string
  initialSearch?: string
  initialPage?: number
  totalPages: number
}

export default function LoadMoreArticles({
  initialTag,
  initialSearch,
  initialPage = 1,
  totalPages,
}: LoadMoreArticlesProps) {
  const [page, setPage] = useState(initialPage + 1)
  const [articles, setArticles] = useState<any[]>([])
  const [isPending, startTransition] = useTransition()
  const [hasMore, setHasMore] = useState(page <= totalPages)

  const handleLoadMore = () => {
    if (isPending || !hasMore) return

    startTransition(async () => {
      try {
        const result = await getArticles(10, page, initialTag, initialSearch)
        if (result && result.articles) {
          setArticles((prev) => [...prev, ...result.articles])
          setPage((prev) => prev + 1)
          setHasMore(page < totalPages)
        }
      } catch (error) {
        console.error("Failed to load more articles:", error)
      }
    })
  }

  return (
    <>
      {articles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 animate-fade-in">
          {articles.map((article) => (
            <Link key={article.id} href={`/${article.tags[0]?.slug || "uncategorized"}/${article.slug}`}>
              <article className="glass-panel border border-outline-variant/30 rounded-lg p-6 flex flex-col min-h-[280px] h-auto card-gradient hover:-translate-y-1 transition-transform duration-300 neon-glow cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  {article.tags && article.tags[0] && (
                    <span className="inline-flex px-2 py-0.5 border border-primary-fixed/50 text-primary-fixed font-label-sm text-label-sm rounded uppercase tracking-wider text-[10px]">
                      {article.tags[0].name}
                    </span>
                  )}
                  <span className="text-on-surface-variant font-code-block text-code-block text-xs" suppressHydrationWarning>
                    {new Date(article.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <h4 className="font-headline-lg-mobile text-[20px] text-on-surface mb-3 group-hover:text-primary-fixed transition-colors line-clamp-2">
                  {article.title}
                </h4>
                <p className="font-body-md text-on-surface-variant text-sm mb-6 line-clamp-3 flex-grow">
                  {getCleanExcerpt(article.excerpt, 140, article.content)}...
                </p>
                <div className="flex items-center gap-2 text-on-surface-variant mt-auto font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[14px]">terminal</span> Read Article
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={handleLoadMore}
            disabled={isPending}
            className="glass-panel border border-outline-variant/30 text-on-surface font-label-sm text-label-sm px-8 py-3.5 rounded-DEFAULT hover:border-primary-fixed hover:text-primary-fixed transition-all duration-300 neon-glow flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                Loading...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">expand_more</span>
                Load More Articles
              </>
            )}
          </button>
        </div>
      )}
    </>
  )
}
