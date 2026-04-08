export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import NewPostForm from '@/components/NewPostForm'
import PostsList from '@/components/PostsList'

async function deletePost(formData: FormData) {
  'use server'

  const postId = formData.get('postId') as string
  const supabase = await createClient()

  await supabase.from('wall_posts').delete().eq('id', postId)

  revalidatePath('/wall')
  revalidatePath('/dashboard')
}

export default async function WallPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: posts } = await supabase
    .from('wall_posts')
    .select('id, content, created_at, status, reviewed, attachment_url')
    .eq('employee_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main className="space-y-8">
      <PageHeader
        title="Моята стена"
        subtitle="Тук добавяш проекти, файлове, статуси и следиш обратната връзка от админа."
      />

      <NewPostForm />
      <PostsList posts={posts ?? []} deleteAction={deletePost} />
    </main>
  )
}