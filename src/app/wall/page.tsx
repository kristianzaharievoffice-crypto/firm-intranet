export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'
import NewPostForm from '@/components/NewPostForm'
import PostsList from '@/components/PostsList'

async function deletePost(formData: FormData) {
  'use server'

  const postId = formData.get('postId') as string
  const supabase = await createClient()

  const { error } = await supabase
    .from('wall_posts')
    .delete()
    .eq('id', postId)

  if (error) {
    console.error('DELETE POST ERROR:', error.message)
  }

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
    <main className="space-y-6">
      <Header />

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            Моята стена
          </h1>
          <p className="text-gray-500 mt-2">
            Тук добавяш проекти и следиш статуса им.
          </p>
        </div>

        <NewPostForm />
        <PostsList posts={posts ?? []} deleteAction={deletePost} />
      </div>
    </main>
  )
}
