'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NewFeedPostForm from '@/components/NewFeedPostForm'

interface FeedLiveProps {
  currentUserId: string
  currentUserRole: string
}

interface FeedPostRow {
  id: string
  content: string
  created_at: string
  attachment_url: string | null
  attachment_path: string | null
  user_id: string
}

interface ProfileRow {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface LikeRow {
  id: string
  post_id: string
  user_id: string
}

interface CommentRow {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
}

interface FeedPostVm {
  id: string
  content: string
  created_at: string
  attachment_url: string | null
  attachment_path: string | null
  user_id: string
  user_name: string
  user_avatar: string | null
  like_count: number
  liked_by_me: boolean
  comments: Array<{
    id: string
    user_id: string
    user_name: string
    user_avatar: string | null
    content: string
    created_at: string
    canDelete: boolean
  }>
  canDelete: boolean
}

export default function FeedLive({
  currentUserId,
  currentUserRole,
}: FeedLiveProps) {
  const supabase = useMemo(() => createClient(), [])
  const [posts, setPosts] = useState<FeedPostVm[]>([])
  const [loading, setLoading] = useState(true)
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})

  const loadFeed = useCallback(async () => {
    const { data: postsData } = await supabase
      .from('feed_posts')
      .select('id, content, created_at, attachment_url, attachment_path, user_id')
      .order('created_at', { ascending: false })

    const feedPosts = (postsData ?? []) as FeedPostRow[]
    const userIds = [...new Set(feedPosts.map((p) => p.user_id))]

    const { data: commentsData } = await supabase
      .from('feed_comments')
      .select('id, post_id, user_id, content, created_at')
      .order('created_at', { ascending: true })

    const commentRows = (commentsData ?? []) as CommentRow[]
    const commentUserIds = [...new Set(commentRows.map((c) => c.user_id))]
    const allUserIds = [...new Set([...userIds, ...commentUserIds])]

    const safeIds = allUserIds.length
      ? allUserIds
      : ['00000000-0000-0000-0000-000000000000']

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', safeIds)

    const { data: likesData } = await supabase
      .from('feed_likes')
      .select('id, post_id, user_id')

    const profiles = (profilesData ?? []) as ProfileRow[]
    const likes = (likesData ?? []) as LikeRow[]

    const profileMap = new Map(
      profiles.map((p) => [
        p.id,
        {
          name: p.full_name ?? 'User',
          avatar: p.avatar_url ?? null,
        },
      ])
    )

    const builtPosts: FeedPostVm[] = feedPosts.map((post) => {
      const postLikes = likes.filter((like) => like.post_id === post.id)
      const postComments = commentRows
        .filter((comment) => comment.post_id === post.id)
        .map((comment) => {
          const commentProfile = profileMap.get(comment.user_id)

          return {
            id: comment.id,
            user_id: comment.user_id,
            user_name: commentProfile?.name ?? 'User',
            user_avatar: commentProfile?.avatar ?? null,
            content: comment.content,
            created_at: comment.created_at,
            canDelete:
              currentUserRole === 'admin' || currentUserId === comment.user_id,
          }
        })

      const postProfile = profileMap.get(post.user_id)

      return {
        id: post.id,
        content: post.content,
        created_at: post.created_at,
        attachment_url: post.attachment_url,
        attachment_path: post.attachment_path,
        user_id: post.user_id,
        user_name: postProfile?.name ?? 'User',
        user_avatar: postProfile?.avatar ?? null,
        like_count: postLikes.length,
        liked_by_me: postLikes.some((like) => like.user_id === currentUserId),
        comments: postComments,
        canDelete: currentUserRole === 'admin' || currentUserId === post.user_id,
      }
    })

    setPosts(builtPosts)
    setLoading(false)
  }, [currentUserId, currentUserRole, supabase])

  useEffect(() => {
    void loadFeed()

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadFeed()
      }
    }, 2000)

    const postsChannel = supabase
      .channel('feed-posts-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feed_posts' },
        () => {
          void loadFeed()
        }
      )
      .subscribe()

    const likesChannel = supabase
      .channel('feed-likes-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feed_likes' },
        () => {
          void loadFeed()
        }
      )
      .subscribe()

    const commentsChannel = supabase
      .channel('feed-comments-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feed_comments' },
        () => {
          void loadFeed()
        }
      )
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(postsChannel)
      supabase.removeChannel(likesChannel)
      supabase.removeChannel(commentsChannel)
    }
  }, [loadFeed, supabase])

  const toggleLike = async (postId: string, likedByMe: boolean) => {
    if (likedByMe) {
      await supabase
        .from('feed_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId)
    } else {
      await supabase.from('feed_likes').insert({
        post_id: postId,
        user_id: currentUserId,
      })
    }

    await loadFeed()
  }

  const submitComment = async (postId: string) => {
    const value = (commentInputs[postId] ?? '').trim()
    if (!value) return

    await supabase.from('feed_comments').insert({
      post_id: postId,
      user_id: currentUserId,
      content: value,
    })

    setCommentInputs((current) => ({
      ...current,
      [postId]: '',
    }))

    await loadFeed()
  }

  const deleteComment = async (commentId: string) => {
    await supabase.from('feed_comments').delete().eq('id', commentId)
    await loadFeed()
  }

  const deletePost = async (postId: string, attachmentPath: string | null) => {
    if (attachmentPath) {
      await supabase.storage.from('feed-files').remove([attachmentPath])
    }

    await supabase.from('feed_posts').delete().eq('id', postId)
    await loadFeed()
  }

  return (
    <div className="space-y-8">
      <NewFeedPostForm onPosted={() => void loadFeed()} />

      {loading ? (
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-[#7b746b]">Loading...</p>
        </div>
      ) : posts.length ? (
        <div className="space-y-5">
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-[34px] border border-[#ece5d8] bg-white p-7 shadow-sm"
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#fbf3dc] text-2xl font-black text-[#a88414]">
                    {post.user_avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.user_avatar}
                        alt={post.user_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (post.user_name?.[0] ?? 'U').toUpperCase()
                    )}
                  </div>

                  <div>
                    <p className="text-2xl font-black tracking-tight text-[#1f1a14]">
                      {post.user_name}
                    </p>
                    <p className="mt-1 text-sm text-[#7b746b]">
                      {new Date(post.created_at).toLocaleString('bg-BG')}
                    </p>
                  </div>
                </div>

                {post.canDelete && (
                  <button
                    type="button"
                    onClick={() => void deletePost(post.id, post.attachment_path)}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                )}
              </div>

              <p className="whitespace-pre-wrap text-[16px] leading-8 text-[#2d2823]">
                {post.content}
              </p>

              {post.attachment_url && (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <a
                    href={post.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[16px] border border-[#e7d6a1] bg-white px-4 py-2 font-semibold text-[#1f1a14] hover:bg-[#fbf6e8]"
                  >
                    Open file
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

              <div className="mt-5 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => void toggleLike(post.id, post.liked_by_me)}
                  className={`rounded-[16px] px-4 py-2 text-sm font-semibold ${
                    post.liked_by_me
                      ? 'bg-[#c9a227] text-white'
                      : 'border border-[#e7d6a1] bg-white text-[#1f1a14]'
                  }`}
                >
                  {post.liked_by_me ? 'Liked' : 'Like'}
                </button>

                <p className="text-sm text-[#7b746b]">
                  {post.like_count} likes
                </p>

                <p className="text-sm text-[#7b746b]">
                  {post.comments.length} comments
                </p>
              </div>

              <div className="mt-6 rounded-[24px] border border-[#ece5d8] bg-[#fcfbf8] p-4">
                <h3 className="mb-3 text-lg font-bold text-[#1f1a14]">
                  Comments
                </h3>

                {post.comments.length ? (
                  <div className="space-y-3">
                    {post.comments.map((comment) => (
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
                                {new Date(comment.created_at).toLocaleString('bg-BG')}
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
          ))}
        </div>
      ) : (
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-[#7b746b]">No feed posts yet.</p>
        </div>
      )}
    </div>
  )
}