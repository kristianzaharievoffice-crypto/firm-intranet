import Link from 'next/link'

interface ChatItem {
  id: string
  employee_name: string
}

export default function ChatList({ chats }: { chats: ChatItem[] }) {
  if (!chats.length) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6">
        <p className="text-gray-500">Няма налични чатове.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">Чатове</h2>
      <div className="space-y-3">
        {chats.map((chat) => (
          <Link
            key={chat.id}
            href={`/chat/${chat.id}`}
            className="block border rounded-xl p-4 hover:bg-gray-50"
          >
            {chat.employee_name}
          </Link>
        ))}
      </div>
    </div>
  )
}