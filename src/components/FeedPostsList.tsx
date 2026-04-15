interface FeedPost {
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

export default function FeedPostsList({
  posts,
  deleteAction,
}: {
  posts: FeedPost[]
  deleteAction: (formData: FormData) => Promise<void>
}) {
  if (!posts.length) {
    return (
      <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
        <p className="text-[#7b746b]">No posts in feed yet.</p>
      </div>
    )
  }

  return (
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
              <form action={deleteAction}>
                <input type="hidden" name="postId" value={post.id} />
                <input
                  type="hidden"
                  name="attachmentPath"
                  value={post.attachment_path ?? ''}
                />
                <button
                  type="submit"
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  Изтрий
                </button>
              </form>
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
                Отвори файл
              </a>

              <a
                href={post.attachment_url}
                download
                className="rounded-[16px] bg-[#c9a227] px-4 py-2 font-semibold text-white hover:bg-[#a88414]"
              >
                Свали
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}