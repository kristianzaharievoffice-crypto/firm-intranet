interface PammItem {
  id: string
  title: string
  description: string | null
  amount: number
  currency: 'USD' | 'EUR'
  status: string
  created_at: string
  creator_name: string
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'done':
      return 'bg-green-100 text-green-700'
    case 'in_progress':
      return 'bg-blue-100 text-blue-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'done':
      return 'Done'
    case 'in_progress':
      return 'In progress'
    default:
      return 'New'
  }
}

export default function PammList({
  items,
  updateStatusAction,
  deleteAction,
  isAdmin,
}: {
  items: PammItem[]
  updateStatusAction: (formData: FormData) => Promise<void>
  deleteAction: (formData: FormData) => Promise<void>
  isAdmin: boolean
}) {
  if (!items.length) {
    return (
      <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
        <p className="text-[#7b746b]">No PAMM items yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusClasses(
                item.status
              )}`}
            >
              {getStatusLabel(item.status)}
            </span>

            <span className="rounded-full bg-[#fbf3dc] px-3 py-1 text-sm font-semibold text-[#a88414]">
              {item.amount.toFixed(2)} {item.currency}
            </span>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
            {item.title}
          </h2>

          <p className="mt-2 text-sm text-[#7b746b]">
            Created by: {item.creator_name}
          </p>

          <p className="mt-1 text-sm text-[#7b746b]">
            Date: {new Date(item.created_at).toLocaleDateString('bg-BG')}
          </p>

          {item.description && (
            <p className="mt-4 whitespace-pre-wrap leading-7 text-[#443d35]">
              {item.description}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <form action={updateStatusAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="itemId" value={item.id} />

              <select
                name="status"
                defaultValue={item.status}
                className="rounded-[16px] border border-[#ece5d8] bg-[#fcfbf8] px-3 py-2 text-sm outline-none"
              >
                <option value="new">New</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>

              <button
                type="submit"
                className="rounded-[16px] bg-[#c9a227] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a88414]"
              >
                Update status
              </button>
            </form>

            {isAdmin && (
              <form action={deleteAction}>
                <input type="hidden" name="itemId" value={item.id} />
                <button
                  type="submit"
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  Delete
                </button>
              </form>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}