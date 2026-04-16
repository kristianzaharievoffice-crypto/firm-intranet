'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NewProjectPostForm from '@/components/NewProjectPostForm'

interface ProjectFeedLiveProps {
  projectId: string
  currentUserId: string
  currentUserRole: string
}

interface ProjectPostRow {
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

interface ProjectPostVm {
  id: string
  content: string
  created_at: string
  attachment_url: string | null
  attachment_path: string | null
  user_id: string
  user_name: string
  user_avatar: string | null
  canDelete: boolean
}

export default function ProjectFeedLive({
  projectId,
  currentUserId,
  currentUserRole,
}: ProjectFeedLiveProps) {
  const supabase = useMemo(() => createClient(), [])
  const [posts, setPosts] = useState<ProjectPostVm[]>([])
  const [loading, setLoading] = useState(true)

  const loadPosts = useCallback(async () => {
    const { data: postsData } = await supabase
      .from('project_posts')
      .select('id, content, created_at, attachment_url, attachment_path, user_id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    const rows = (postsData ?? []) as ProjectPostRow[]
    const userIds = [...new Set(rows.map((row) => row.user_id))]
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

    const mapped: ProjectPostVm[] = rows.map((row) => {
      const profile = profileMap.get(row.user_id)

      return {
        id: row.id,
        content: row.content,
        created_at: row.created_at,
        attachment_url: row.attachment_url,
        attachment_path: row.attachment_path,
        user_id: row.user_id,
        user_name: profile?.name ?? 'User',
        user_avatar: profile?.avatar ?? null,
        canDelete: currentUserRole === 'admin' || currentUserId === row.user_id,
      }
    })

    setPosts(mapped)
    setLoading(false)
  }, [projectId, currentUserId, currentUserRole, supabase])

  useEffect(() => {
    void loadPosts()

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadPosts()
      }
    }, 2000)

    const channel = supabase
      .channel(`project-posts-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_posts',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          void loadPosts()
        }
      )
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [projectId, loadPosts, supabase])

  const deletePost = async (postId: string, attachmentPath: string | null) => {
    if (attachmentPath) {
      await supabase.storage.from('project-files').remove([attachmentPath])
    }

    await supabase.from('project_posts').delete().eq('id', postId)
    await loadPosts()
  }

  return (
    <div className="space-y-8">
      <NewProjectPostForm projectId={projectId} onPosted={() => void loadPosts()} />

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
                      {new Date(post.created_at).toLocaleString('en-GB')}
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
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-[#7b746b]">No project posts yet.</p>
        </div>
      )}
    </div>
  )
}