"use server"

import { db } from "@/lib/db"
import { z } from "zod"
import { auth } from "@/auth"

const commentSchema = z.object({
  content: z.string().min(1).max(1000),
  articleId: z.string(),
  parentId: z.string().optional().nullable(),
})

export async function postComment(articleId: string, content: string, parentId?: string | null) {
  const session = await auth()
  
  if (!session || !session.user) {
    throw new Error("Unauthorized: You must be logged in to post a comment.")
  }

  const parsedData = commentSchema.safeParse({ content, articleId, parentId })
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
        parentId: parsedData.data.parentId || null,
      }
    })
    return { id: newComment.id }
  } catch (error) {
    console.error("Error posting comment:", error)
    throw new Error("Failed to post comment.")
  }
}

export async function updateComment(commentId: string, content: string) {
  const session = await auth()
  
  if (!session || !session.user) {
    throw new Error("Unauthorized: You must be logged in to edit comments.")
  }

  const comment = await db.comment.findUnique({
    where: { id: commentId }
  })

  if (!comment) {
    throw new Error("Comment not found.")
  }

  if (comment.authorId !== session.user.id) {
    throw new Error("Unauthorized: You can only edit your own comments.")
  }

  const parsedData = z.string().min(1).max(1000).safeParse(content)
  if (!parsedData.success) {
    throw new Error("Invalid comment data.")
  }

  const sanitizedContent = parsedData.data
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  try {
    await db.comment.update({
      where: { id: commentId },
      data: { content: sanitizedContent }
    })
    return { success: true }
  } catch (error) {
    console.error("Error updating comment:", error)
    throw new Error("Failed to edit comment.")
  }
}

export async function deleteComment(commentId: string) {
  const session = await auth()
  
  if (!session || !session.user) {
    throw new Error("Unauthorized: You must be logged in to delete comments.")
  }

  const comment = await db.comment.findUnique({
    where: { id: commentId }
  })

  if (!comment) {
    throw new Error("Comment not found.")
  }

  // Allow the comment owner OR an Admin user to delete comments
  if (comment.authorId !== session.user.id && session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: You can only delete your own comments.")
  }

  try {
    await db.comment.delete({
      where: { id: commentId }
    })
    return { success: true }
  } catch (error) {
    console.error("Error deleting comment:", error)
    throw new Error("Failed to delete comment.")
  }
}
