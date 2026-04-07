import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'
import EditPostForm from '@/components/EditPostForm'

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ postId: string }>
}) {
  const { postId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: post } = await supabase
    .from('wall_posts')
    .select('id, content, status, employee_id')
    .eq('id', postId)
    .single()

  if (!post || post.employee_id !== user.id) {
    redirect('/wall')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <Header />
      <div className="max-w-3xl mx-auto p-6">
        <EditPostForm
          postId={post.id}
          initialContent={post.content}
          initialStatus={post.status}
        />
      </div>
    </main>
  )
}
