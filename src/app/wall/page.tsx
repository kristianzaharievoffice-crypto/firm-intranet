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
.select('id, content, created_at')
.eq('employee_id', user.id)
.order('created_at', { ascending: false })

return (
<main className="min-h-screen bg-gray-100 p-6">
<div className="max-w-3xl mx-auto space-y-6">
<h1 className="text-3xl font-bold">Моята стена</h1>
<Header />
<NewPostForm />
<PostsList posts={posts ?? []} />
</div>
</main>
)
}
