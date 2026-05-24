import { getAllAdminArticles } from "@/actions/articles"
import DashboardClient from "./DashboardClient"

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const articles = await getAllAdminArticles()
  return <DashboardClient initialArticles={articles} />
}
