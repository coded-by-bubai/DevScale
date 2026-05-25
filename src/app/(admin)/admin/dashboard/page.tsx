import { getAllAdminArticles, getAllUsers } from "@/actions/articles"
import DashboardClient from "./DashboardClient"
import { auth } from "@/auth"

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await auth()
  const currentUserId = session?.user?.id || ""

  const [articles, users] = await Promise.all([
    getAllAdminArticles(),
    getAllUsers(),
  ])
  return (
    <DashboardClient
      initialArticles={articles}
      initialUsers={users}
      currentUserId={currentUserId}
    />
  )
}
