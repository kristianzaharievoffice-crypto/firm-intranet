'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useMemo, useState } from 'react'
import ClientDateTime from '@/components/ClientDateTime'

interface PostItem {
  id: string
  content: string
  created_at: string
  status: string | null
  reviewed: boolean | null
  attachment_url?: string | null
  employee_name?: string
}

interface CommentRow {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
}

interface ProfileRow {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface CommentVm {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  user_name: string
  user_avatar: string | null
  canDelete: boolean
}

export default function PostList({
  posts,
  isAdmin = false,
  currentUserId,
}: {
  posts: PostItem[]
  isAdmin?: boolean
  currentUserId: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommentVm[]>>({})
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})

  const loadComments = async () => {
    const postIds = posts.map((post) => post.id)
    if (!postIds.length) {
      setCommentsByPost({})
      return
    }

    const { data: commentsData } = await supabase
      .from('wall_comments')
      .select('id, post_id, user_id, content, created_at')
      .in('post_id', postIds)
      .order('created_at', { ascending: true })

    const commentRows = (commentsData ?? []) as CommentRow[]
    const userIds = [...new Set(commentRows.map((c) => c.user_id))]
    const safeIds = userIds.length
      ? userIds
      : ['00000000-0000-0000-0000-000000000000']

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', safeIds)

    const profileMap = new Map(
      ((profilesData ?? []) as ProfileRow[]).map((profile) => [
        profile.id,
        {
          name: profile.full_name ?? 'User',
          avatar: profile.avatar_url ?? null,
        },
      ])
    )

    const grouped: Record<string, CommentVm[]> = {}

    for (const comment of commentRows) {
      const profile = profileMap.get(comment.user_id)

      if (!grouped[comment.post_id]) {
        grouped[comment.post_id] = []
      }

      grouped[comment.post_id].push({
        ...comment,
        user_name: profile?.name ?? 'User',
        user_avatar: profile?.avatar ?? null,
        canDelete: isAdmin || currentUserId === comment.user_id,
      })
    }

    setCommentsByPost(grouped)
  }

  useEffect(() => {
    void loadComments()

    const channel = supabase
      .channel('wall-comments-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wall_comments' },
        () => {
          void loadComments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, posts, currentUserId, isAdmin])

  const markReviewed = async (postId: string) => {
    setLoadingId(postId)

    await supabase
      .from('wall_posts')
      .update({ reviewed: true })
      .eq('id', postId)

    window.location.reload()
  }

  const deletePost = async (postId: string) => {
    setLoadingId(postId)

    await supabase
      .from('wall_posts')
      .delete()
      .eq('id', postId)

    window.location.reload()
  }

  const changeStatus = async (postId: string, status: string) => {
    setLoadingId(postId)

    await supabase
      .from('wall_posts')
      .update({ status })
      .eq('id', postId)

    window.location.reload()
  }

  const submitComment = async (postId: string) => {
    const value = (commentInputs[postId] ?? '').trim()
    if (!value) return

    await supabase.from('wall_comments').insert({
      post_id: postId,
      user_id: currentUserId,
      content: value,
    })

    setCommentInputs((current) => ({
      ...current,
      [postId]: '',
    }))

    await loadComments()
  }

  const deleteComment = async (commentId: string) => {
    await supabase.from('wall_comments').delete().eq('id', commentId)
    await loadComments()
  }

  if (!posts.length) {
    return (
      <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
        <p className="text-[#7b746b]">No wall posts yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {posts.map((post) => {
        const comments = commentsByPost[post.id] ?? []

        return (
          <div
            key={post.id}
            className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
          >
            {post.employee_name && (
              <p className="mb-3 text-sm font-semibold text-[#7b746b]">
                {post.employee_name}
              </p>
            )}

            <p className="whitespace-pre-wrap leading-7 text-[#1f1a14]">
              {post.content}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#7b746b]">
              <span>
                <ClientDateTime value={post.created_at} />
              </span>

              {post.status && (
                <span className="rounded-full bg-[#f4efe4] px-3 py-1">
                  Status: {post.status}
                </span>
              )}

              {post.reviewed && (
                <span className="rounded-full bg-[#e9f7ef] px-3 py-1 text-[#247a4d]">
                  Reviewed
                </span>
              )}
            </div>

            {post.attachment_url && (
              <div className="mt-4 flex gap-3">
                <a
                  href={post.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[16px] border border-[#e7d6a1] bg-white px-4 py-2 font-semibold text-[#1f1a14] hover:bg-[#fbf6e8]"
                >
                  Open
                </a>
                <a
                  href={post.attachment_url}
                  download
                  className="rounded-[16px] bg-[#c9a227] px-4 py-2 font-semibold text-white hover:bg-[#a88414]"
                >
                  Download
                </a>
              </div>
            )}

            {isAdmin && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <select
                  defaultValue={post.status ?? 'pending'}
                  onChange={(e) => void changeStatus(post.id, e.target.value)}
                  className="rounded-[16px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-2 text-sm outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>

                {!post.reviewed && (
                  <button
                    type="button"
                    onClick={() => void markReviewed(post.id)}
                    disabled={loadingId === post.id}
                    className="rounded-[16px] bg-[#c9a227] px-4 py-2 font-semibold text-white hover:bg-[#a88414] disabled:opacity-60"
                  >
                    {loadingId === post.id ? 'Saving...' : 'Mark as reviewed'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void deletePost(post.id)}
                  disabled={loadingId === post.id}
                  className="rounded-[16px] border border-red-200 bg-white px-4 py-2 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            )}

            <div className="mt-6 rounded-[24px] border border-[#ece5d8] bg-[#fcfbf8] p-4">
              <h3 className="mb-3 text-lg font-bold text-[#1f1a14]">
                Comments
              </h3>

              {comments.length ? (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-[20px] border border-[#eee6d7] bg-white p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#fbf3dc] text-sm font-black text-[#a88414]">
                            {comment.user_avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={comment.user_avatar}
                                alt={comment.user_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              (comment.user_name?.[0] ?? 'U').toUpperCase()
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-[#1f1a14]">
                              {comment.user_name}
                            </p>
                            <p className="text-xs text-[#7b746b]">
                              <ClientDateTime value={comment.created_at} />
                            </p>
                          </div>
                        </div>

                        {comment.canDelete && (
                          <button
                            type="button"
                            onClick={() => void deleteComment(comment.id)}
                            className="text-sm font-medium text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </div>

                      <p className="whitespace-pre-wrap text-sm leading-6 text-[#4b443c]">
                        {comment.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#7b746b]">No comments yet.</p>
              )}

              <div className="mt-4 flex flex-col gap-3 md:flex-row">
                <input
                  value={commentInputs[post.id] ?? ''}
                  onChange={(e) =>
                    setCommentInputs((current) => ({
                      ...current,
                      [post.id]: e.target.value,
                    }))
                  }
                  placeholder="Write a comment..."
                  className="flex-1 rounded-[18px] border border-[#ece5d8] bg-white px-4 py-3 outline-none focus:border-[#c9a227]"
                />

                <button
                  type="button"
                  onClick={() => void submitComment(post.id)}
                  className="rounded-[18px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414]"
                >
                  Add comment
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}