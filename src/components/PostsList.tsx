import Link from 'next/link'
import PostComments from '@/components/PostComments'

interface Post {
  id: string
  content: string
  created_at: string
  status: string
  reviewed: boolean
  attachment_url?: string | null
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'готово':
      return 'bg-green-100 text-green-700'
    case 'за проверка':
      return 'bg-amber-100 text-amber-700'
    default:
      return 'bg-blue-100 text-blue-700'
  }
}

export default function PostsList({
  posts,
  deleteAction,
}: {
  posts: Post[]
  deleteAction: (formData: FormData) => Promise<void>
}) {
  if (!posts.length) {
    return (
      <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
        <p className="text-[#7b746b]">Все още няма добавени проекти или отчети.</p>
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
          <div className="mb-4 flex items-center justify-between gap-4">
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusClasses(
                post.status
              )}`}
            >
              {post.status}
            </span>

            <p className="text-sm text-[#7b746b]">
              {new Date(post.created_at).toLocaleString('bg-BG')}
            </p>
          </div>

          <p className="mb-4 whitespace-pre-wrap leading-7 text-[#2d2823]">
            {post.content}
          </p>

          {post.attachment_url && (
            <a
              href={post.attachment_url}
              target="_blank"
              rel="noreferrer"
              className="mb-4 inline-block text-sm font-medium text-[#a88414] hover:underline"
            >
              Отвори прикачения файл
            </a>
          )}

          {post.reviewed ? (
            <span className="text-sm font-semibold text-green-700">
              ✔ Проверено от админ
            </span>
          ) : (
            <span className="text-sm font-semibold text-blue-700">
              ⏳ Чака проверка
            </span>
          )}

          <div className="mt-5 flex items-center gap-4">
            <Link
              href={`/wall/edit/${post.id}`}
              className="text-sm font-medium text-[#1f1a14] hover:text-[#a88414]"
            >
              Редактирай
            </Link>

            <form action={deleteAction}>
              <input type="hidden" name="postId" value={post.id} />
              <button
                type="submit"
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Изтрий
              </button>
            </form>
          </div>

          <PostComments postId={post.id} />
        </div>
      ))}
    </div>
  )
}