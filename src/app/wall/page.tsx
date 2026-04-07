import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewPostForm from '@/components/NewPostForm'
import PostsList from '@/components/PostsList'
import Header from '@/components/Header'

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
    .select('id, content, created_at, status')
.eq('employee_id', user.id)
.order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <Header />
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="mb-2">
          <h1 className="text-4xl font-extrabold tracking-tight">Моята стена</h1>
          <p className="text-gray-500 mt-2">
            Тук добавяш проекти, задачи и текущия им статус.
          </p>
        </div>

        <NewPostForm />
        <PostsList posts={posts ?? []} />
      </div>
    </main>
)
}
