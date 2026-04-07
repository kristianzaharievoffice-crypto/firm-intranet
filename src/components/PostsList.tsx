interface Post {
  id: string
  content: string
  created_at: string
  status: string
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'готово':
      return 'bg-green-100 text-green-700'
    case 'за проверка':
      return 'bg-yellow-100 text-yellow-700'
    default:
      return 'bg-blue-100 text-blue-700'
  }
}

export default function PostsList({ posts }: { posts: Post[] }) {
  if (!posts.length) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
        <p className="text-gray-500">Все още няма добавени проекти или отчети.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div key={post.id} className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between gap-4 mb-4">
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${getStatusClasses(post.status)}`}>
              {post.status}
            </span>
            <p className="text-sm text-gray-500">
              {new Date(post.created_at).toLocaleString('bg-BG')}
            </p>
          </div>

          <p className="whitespace-pre-wrap text-gray-800 leading-7">{post.content}</p>
        </div>
      ))}
    </div>
  )
}