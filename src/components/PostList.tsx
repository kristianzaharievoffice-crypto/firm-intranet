'use client'

import { uiText } from '@/lib/ui-text'

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
}: {
  posts: PostItem[]
}) {
  if (!posts.length) {
    return (
      <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
        <p className="text-[#7b746b]">{uiText.wall.noPosts}</p>
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
            <span>{new Date(post.created_at).toLocaleString('bg-BG')}</span>

            {post.status && (
              <span className="rounded-full bg-[#f4efe4] px-3 py-1">
                {uiText.wall.status}: {post.status}
              </span>
            )}

            {post.reviewed && (
              <span className="rounded-full bg-[#e9f7ef] px-3 py-1 text-[#247a4d]">
                {uiText.wall.reviewed}
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
                {uiText.common.open}
              </a>
              <a
                href={post.attachment_url}
                download
                className="rounded-[16px] bg-[#c9a227] px-4 py-2 font-semibold text-white hover:bg-[#a88414]"
              >
                {uiText.common.download}
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}