export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import NewProjectForm from '@/components/NewProjectForm'
import ProjectsList from '@/components/ProjectsList'

interface ProjectRow {
  id: string
  title: string
  description: string | null
  created_at: string
  created_by: string
}

interface ProfileRow {
  id: string
  full_name: string | null
}

export default async function ProjectsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: projectsData } = await supabase
    .from('projects')
    .select('id, title, description, created_at, created_by')
    .order('created_at', { ascending: false })

  const rows = (projectsData ?? []) as ProjectRow[]
  const creatorIds = [...new Set(rows.map((row) => row.created_by))]
  const safeIds = creatorIds.length
    ? creatorIds
    : ['00000000-0000-0000-0000-000000000000']

  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', safeIds)

  const nameMap = new Map(
    ((profilesData ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      profile.full_name ?? 'User',
    ])
  )

  const projects = rows.map((row) => ({
    ...row,
    creator_name: nameMap.get(row.created_by) ?? 'User',
  }))

  return (
    <main className="space-y-8">
      <PageHeader
        title="Projects"
        subtitle="Shared project spaces where everyone can post updates and files."
      />

      <NewProjectForm />

      <ProjectsList projects={projects} />
    </main>
  )
}