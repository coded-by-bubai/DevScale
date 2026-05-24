"use server"

import { db } from "@/lib/db"
import { z } from "zod"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

const articleSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters long"),
  content: z.string().min(5, "Content must be at least 5 characters long"),
  excerpt: z.string().optional(),
  coverImage: z.string().optional(),
  published: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
})

export async function getArticles(limit = 10, page = 1, tag?: string, search?: string) {
  try {
    const skip = (page - 1) * limit
    
    const whereClause: any = { published: true }
    if (tag) {
      whereClause.tags = { some: { slug: tag.toLowerCase() } }
    }
    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { excerpt: { contains: search } },
      ]
    }

    const articles = await db.article.findMany({
      where: whereClause,
      take: limit,
      skip,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true, image: true } },
        tags: true,
      },
    })
    
    const total = await db.article.count({ where: whereClause })

    return { articles, total, totalPages: Math.ceil(total / limit) }
  } catch (error) {
    console.error("Error fetching articles:", error)
    return { articles: [], total: 0, totalPages: 0 }
  }
}

export async function getArticleBySlug(slug: string) {
  try {
    const article = await db.article.update({
      where: { slug },
      data: { views: { increment: 1 } },
      include: {
        author: { select: { name: true, image: true } },
        tags: true,
        comments: {
          include: {
            author: { select: { name: true, image: true } }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    })
    return article
  } catch (error) {
    console.error("Error fetching article by slug:", error)
    return null
  }
}

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

export async function createArticle(data: z.infer<typeof articleSchema>) {
  const session = await auth()
  
  if (!session || session.user?.role !== "ADMIN") {
    throw new Error("Unauthorized: Only admins can create articles.")
  }

  const parsedData = articleSchema.safeParse(data)
  if (!parsedData.success) {
    const messages = parsedData.error.issues.map(e => e.message).join(", ")
    throw new Error(messages || "Invalid data provided.")
  }

  const slug = generateSlug(parsedData.data.title)
  const { tags, ...articleData } = parsedData.data

  const tagsConnectOrCreate = tags?.map(tag => {
    const tagSlug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    return {
      where: { slug: tagSlug },
      create: { name: tag, slug: tagSlug }
    }
  }) || []

  try {
    const fallbackUser = await db.user.findFirst()
    const newArticle = await db.article.create({
      data: {
        ...articleData,
        slug,
        authorId: session?.user?.id || fallbackUser?.id || "clxyz",
        tags: {
          connectOrCreate: tagsConnectOrCreate
        }
      }
    })
    revalidatePath("/", "layout")
    return {
      id: newArticle.id,
      slug: newArticle.slug,
    }
  } catch (error) {
    console.error("Error creating article:", error)
    throw new Error("Failed to create article.")
  }
}

export async function updateArticle(id: string, data: z.infer<typeof articleSchema>) {
  const session = await auth()
  
  if (!session || session.user?.role !== "ADMIN") {
    throw new Error("Unauthorized: Only admins can update articles.")
  }

  const parsedData = articleSchema.safeParse(data)
  if (!parsedData.success) {
    const messages = parsedData.error.issues.map(e => e.message).join(", ")
    throw new Error(messages || "Invalid data provided.")
  }

  const slug = generateSlug(parsedData.data.title)
  const { tags, ...articleData } = parsedData.data

  const tagsConnectOrCreate = tags?.map(tag => {
    const tagSlug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    return {
      where: { slug: tagSlug },
      create: { name: tag, slug: tagSlug }
    }
  }) || []

  try {
    const updatedArticle = await db.article.update({
      where: { id },
      data: {
        ...articleData,
        slug,
        tags: {
          set: [],
          connectOrCreate: tagsConnectOrCreate
        }
      }
    })
    revalidatePath("/", "layout")
    return {
      id: updatedArticle.id,
      slug: updatedArticle.slug,
    }
  } catch (error) {
    console.error("Error updating article:", error)
    throw new Error("Failed to update article.")
  }
}

export async function getAllAdminArticles() {
  const session = await auth()
  
  if (!session || session.user?.role !== "ADMIN") {
    throw new Error("Unauthorized: Only admins can view the dashboard.")
  }

  try {
    const articles = await db.article.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true } },
        tags: true,
      },
    })
    return articles
  } catch (error) {
    console.error("Error fetching admin articles:", error)
    return []
  }
}

export async function deleteArticle(id: string) {
  const session = await auth()
  
  if (!session || session.user?.role !== "ADMIN") {
    throw new Error("Unauthorized: Only admins can delete articles.")
  }

  try {
    await db.article.delete({
      where: { id },
    })
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error) {
    console.error("Error deleting article:", error)
    throw new Error("Failed to delete article.")
  }
}
