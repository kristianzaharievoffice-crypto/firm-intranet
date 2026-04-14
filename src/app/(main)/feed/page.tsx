export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/PageHeader'
import NewFeedPostForm from '@/components/NewFeedPostForm'
import FeedPostsList from '@/components/FeedPostsList'

async function deleteFeedPost(formData: FormData) {
  'use server'

  const postId = String(formData.get('postId') || '')
  const attachmentPath = String(formData.get('attachmentPath') || '')
  const supabase = await createClient()

  if (attachmentPath) {
    await supabase.storage.from('feed-files').remove([attachmentPath])
  }

  await supabase.from('feed_posts').delete().eq('id', postId)

  revalidatePath('/feed')
}

export default async function FeedPage() {
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

  const { data: posts } = await supabase
    .from('feed_posts')
    .select('id, content, created_at, attachment_url, attachment_path, user_id')
    .order('created_at', { ascending: false })

  const userIds = [...new Set((posts ?? []).map((post) => post.user_id))]
  const safeUserIds = userIds.length
    ? userIds
    : ['00000000-0000-0000-0000-000000000000']

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', safeUserIds)

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      {
        name: profile.full_name ?? 'Потребител',
        avatar: profile.avatar_url ?? null,
      },
    ])
  )

  const feedPosts = (posts ?? []).map((post) => {
    const profile = profileMap.get(post.user_id)

    return {
      id: post.id,
      content: post.content,
      created_at: post.created_at,
      attachment_url: post.attachment_url,
      attachment_path: post.attachment_path,
      user_id: post.user_id,
      user_name: profile?.name ?? 'Потребител',
      user_avatar: profile?.avatar ?? null,
      canDelete: me.role === 'admin' || me.id === post.user_id,
    }
  })

  return (
    <main className="space-y-8">
      <PageHeader
        title="Feed"
        subtitle="Общият фирмен feed за съобщения, файлове и бързи публикации."
      />

      <NewFeedPostForm />
      <FeedPostsList posts={feedPosts} deleteAction={deleteFeedPost} />
    </main>
  )
}