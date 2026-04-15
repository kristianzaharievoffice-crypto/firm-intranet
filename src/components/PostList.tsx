'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
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

export default function PostList({
  posts,
  isAdmin = false,
}: {
  posts: PostItem[]
  isAdmin?: boolean
}) {
  const supabase = createClient()
  const [loadingId, setLoadingId] = useState<string | null>(null)

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

  if (!posts.length) {
    return (
      <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
        <p className="text-[#7b746b]">No wall posts yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {posts.map((post) => (
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
        </div>
      ))}
    </div>
  )
}