import { createClient } from '@/lib/supabase/server'
import NewCommentForm from '@/components/NewCommentForm'

interface CommentItem {
  id: string
  content: string
  created_at: string
  user_id: string
}

interface ProfileItem {
  id: string
  full_name: string | null
}

export default async function PostComments({ postId }: { postId: string }) {
  const supabase = await createClient()

  const { data: comments } = await supabase
    .from('post_comments')
    .select('id, content, created_at, user_id')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  const items = (comments ?? []) as CommentItem[]

  const userIds = [...new Set(items.map((c) => c.user_id))]
  const safeUserIds = userIds.length
    ? userIds
    : ['00000000-0000-0000-0000-000000000000']

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', safeUserIds)

  const people = (profiles ?? []) as ProfileItem[]
  const nameMap = new Map(people.map((p) => [p.id, p.full_name ?? 'Потребител']))

  return (
    <div className="mt-5 border-t pt-4">
      <h3 className="text-lg font-bold mb-3">Коментари</h3>

      {items.length ? (
        <div className="space-y-3">
          {items.map((comment) => (
            <div
              key={comment.id}
              className="bg-white border border-gray-100 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between gap-4 mb-2">
                <p className="font-medium text-sm text-[#1f2937]">
                  {nameMap.get(comment.user_id) ?? 'Потребител'}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(comment.created_at).toLocaleString('bg-BG')}
                </p>
              </div>

              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Още няма коментари.</p>
      )}

      <NewCommentForm postId={postId} />
    </div>
  )
}