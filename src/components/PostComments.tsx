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
    <div className="mt-6 rounded-[24px] border border-[#ece5d8] bg-[#fcfbf8] p-4">
      <h3 className="mb-3 text-base font-bold text-[#1f1a14]">Коментари</h3>

      {items.length ? (
        <div className="space-y-3">
          {items.map((comment) => (
            <div
              key={comment.id}
              className="rounded-[20px] border border-[#eee6d7] bg-white p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-[#1f1a14]">
                  {nameMap.get(comment.user_id) ?? 'Потребител'}
                </p>
                <p className="text-xs text-[#7b746b]">
                  {new Date(comment.created_at).toLocaleString('bg-BG')}
                </p>
              </div>

              <p className="whitespace-pre-wrap text-sm leading-6 text-[#4b443c]">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#7b746b]">Още няма коментари.</p>
      )}

      <NewCommentForm postId={postId} />
    </div>
  )
}