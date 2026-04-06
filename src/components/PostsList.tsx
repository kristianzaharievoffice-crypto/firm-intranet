interface Post {
id: string
content: string
created_at: string
}

export default function PostsList({ posts }: { posts: Post[] }) {
if (!posts.length) {
return <p className="text-gray-500">Няма публикации.</p>
}

return (
<div className="space-y-4">
{posts.map((post) => (
<div key={post.id} className="bg-white rounded-2xl shadow-md p-5">
<p className="mb-3 whitespace-pre-wrap">{post.content}</p>
<p className="text-sm text-gray-500">
{new Date(post.created_at).toLocaleString('bg-BG')}
</p>
</div>
))}
</div>
)
}
