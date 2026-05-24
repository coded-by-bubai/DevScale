"use server"

import { db } from "@/lib/db"
import { z } from "zod"
import { auth } from "@/auth"

const commentSchema = z.object({
  content: z.string().min(1).max(1000),
  articleId: z.string(),
})

export async function postComment(articleId: string, content: string) {
  const session = await auth()
  
  if (!session || !session.user) {
    throw new Error("Unauthorized: You must be logged in to post a comment.")
  }

  const parsedData = commentSchema.safeParse({ content, articleId })
  if (!parsedData.success) {
    throw new Error("Invalid comment data.")
  }

  // Basic XSS sanitization (in production, use dompurify or similar before rendering)
  const sanitizedContent = parsedData.data.content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  try {
    const newComment = await db.comment.create({
      data: {
        content: sanitizedContent,
        articleId: parsedData.data.articleId,
        authorId: session.user.id!,
      }
    })
    return { id: newComment.id }
  } catch (error) {
    console.error("Error posting comment:", error)
    throw new Error("Failed to post comment.")
  }
}
