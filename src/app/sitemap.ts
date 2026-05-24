import { MetadataRoute } from 'next'
import { db } from '@/lib/db'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const articles = await db.article.findMany({
    where: { published: true },
    select: { 
      slug: true, 
      updatedAt: true,
      tags: {
        take: 1,
        select: { slug: true }
      }
    }
  })

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => {
    const topic = article.tags[0]?.slug || 'uncategorized'
    return {
      url: `${baseUrl}/${topic}/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }
  })

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...articleEntries,
  ]
}
