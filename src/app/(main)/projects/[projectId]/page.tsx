export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import ProjectFeedLive from '@/components/ProjectFeedLive'

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!me) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, description')
    .eq('id', projectId)
    .single()

  if (!project) redirect('/projects')

  return (
    <main className="space-y-8">
      <PageHeader
        title={project.title}
        subtitle={project.description || 'Shared project feed and files.'}
        action={
          <Link
            href="/projects"
            className="rounded-[20px] border border-[#e5d6ae] bg-white px-5 py-3 font-semibold text-[#1f1a14] hover:bg-[#fbf6e8]"
          >
            Back to projects
          </Link>
        }
      />

      <ProjectFeedLive
        projectId={projectId}
        currentUserId={user.id}
        currentUserRole={me.role}
      />
    </main>
  )
}