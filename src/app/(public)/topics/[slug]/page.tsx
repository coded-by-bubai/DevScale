import { getArticles } from "@/actions/articles"
import Link from "next/link"
import Image from "next/image"

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

interface Props {
  params: Promise<{ slug: string }>
}

const topicTitles: Record<string, string> = {
  "dsa": "Data Structures & Algorithms",
  "system-design": "System Design",
  "web3": "Web3 & Distributed Ledger",
}

const topicDescriptions: Record<string, string> = {
  "dsa": "Deep dives into dynamic programming, lock-free structures, graph traversals, and algorithms designed to operate at scale.",
  "system-design": "Architectural post-mortems and design guides explaining state, consensus, microservices, and extreme availability systems.",
  "web3": "Deconstruct modern protocols, cryptography, smart contracts, and decentralized system designs for high-throughput applications.",
}

export default async function TopicPage({ params }: Props) {
  const { slug } = await params
  const { articles } = await getArticles(20, 1, slug)

  const cleanSlug = slug.toLowerCase()
  const displayTitle = topicTitles[cleanSlug] || cleanSlug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  const displayDescription = topicDescriptions[cleanSlug] || `Highly technical articles exploring engineering practices related to ${displayTitle}.`

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <header className="mb-12 border-b border-outline-variant/20 pb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-label-sm text-label-sm text-primary-fixed uppercase tracking-wider bg-primary-fixed/10 px-2 py-0.5 rounded border border-primary-fixed/20">
            Topic Archive
          </span>
        </div>
        <h1 className="font-headline-xl text-headline-xl text-on-surface mb-4">
          {displayTitle}
        </h1>
        <p className="font-body-md text-on-surface-variant max-w-2xl">
          {displayDescription}
        </p>
      </header>

      {articles.length > 0 ? (
        <div className="space-y-8">
          {articles.map((article) => (
            <Link key={article.id} href={`/${article.tags[0]?.slug || 'uncategorized'}/${article.slug}`}>
              <div className="glass-panel border border-outline-variant/30 rounded-lg p-6 flex flex-col md:flex-row gap-6 card-gradient hover:border-primary-fixed/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                {article.coverImage && (
                  <div className="relative w-full md:w-48 h-32 bg-surface-container-high rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={article.coverImage}
                      alt={article.title}
                      fill
                      className="object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500"
                    />
                  </div>
                )}
                <div className="flex flex-col justify-between flex-grow">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-on-surface-variant font-code-block text-[11px]">
                        {new Date(article.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h2 className="font-headline-lg-mobile text-[22px] text-on-surface mb-2 group-hover:text-primary-fixed transition-colors">
                      {article.title}
                    </h2>
                    <p className="font-body-md text-on-surface-variant text-sm line-clamp-2">
                      {getCleanExcerpt(article.excerpt, 140, article.content)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-primary-fixed font-label-sm text-xs mt-4">
                    <span className="material-symbols-outlined text-[14px]">terminal</span> Read Article
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="glass-panel border border-outline-variant/20 rounded-xl p-12 text-center max-w-lg mx-auto flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant">
            terminal
          </span>
          <h3 className="font-headline-lg text-[22px] text-on-surface">No articles yet</h3>
          <p className="font-body-md text-sm text-on-surface-variant">
            We haven&apos;t published any articles on the topic of &quot;{displayTitle}&quot; yet. Sign up for our newsletter to be notified when we do!
          </p>
          <Link href="/" className="mt-4 bg-primary-container text-on-primary-fixed font-label-sm text-xs font-bold px-6 py-2.5 rounded-DEFAULT hover:bg-surface-tint transition-colors">
            Back to Homepage
          </Link>
        </div>
      )}
    </div>
  )
}
