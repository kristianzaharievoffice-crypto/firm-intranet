interface TaskItem {
  id: string
  title: string
  description: string | null
  due_date: string | null
  priority: string
  status: string
  assigned_to: string
  employee_name?: string
}

function getPriorityClasses(priority: string) {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700'
    case 'low':
      return 'bg-green-100 text-green-700'
    default:
      return 'bg-yellow-100 text-yellow-700'
  }
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

function getPriorityLabel(priority: string) {
  switch (priority) {
    case 'high':
      return 'Висок'
    case 'low':
      return 'Нисък'
    default:
      return 'Среден'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'done':
      return 'Готова'
    case 'in_progress':
      return 'В процес'
    default:
      return 'Нова'
  }
}

export default function TaskList({
  tasks,
  isAdmin,
  updateStatusAction,
  deleteTaskAction,
}: {
  tasks: TaskItem[]
  isAdmin: boolean
  updateStatusAction: (formData: FormData) => Promise<void>
  deleteTaskAction: (formData: FormData) => Promise<void>
}) {
  if (!tasks.length) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <p className="text-gray-500">Няма задачи.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className={`text-sm px-3 py-1 rounded-full ${getPriorityClasses(task.priority)}`}>
              {getPriorityLabel(task.priority)}
            </span>

            <span className={`text-sm px-3 py-1 rounded-full ${getStatusClasses(task.status)}`}>
              {getStatusLabel(task.status)}
            </span>
          </div>

          <h2 className="text-xl font-bold text-[#1f2937]">{task.title}</h2>

          {isAdmin && task.employee_name && (
            <p className="text-sm text-gray-500 mt-1">
              Възложена на: {task.employee_name}
            </p>
          )}

          {task.description && (
            <p className="mt-3 text-gray-700 whitespace-pre-wrap">
              {task.description}
            </p>
          )}

          <div className="mt-4 text-sm text-gray-500">
            Срок: {task.due_date ? new Date(task.due_date).toLocaleDateString('bg-BG') : 'Няма'}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 items-center">
            <form action={updateStatusAction} className="flex items-center gap-2 flex-wrap">
              <input type="hidden" name="taskId" value={task.id} />

              <select
                name="status"
                defaultValue={task.status}
                className="border rounded-2xl px-3 py-2 bg-white text-sm"
              >
                <option value="new">Нова</option>
                <option value="in_progress">В процес</option>
                <option value="done">Готова</option>
              </select>

              <button
                type="submit"
                className="bg-[#d4af37] hover:bg-[#b8962e] text-white px-4 py-2 rounded-2xl text-sm"
              >
                Смени статус
              </button>
            </form>

            {isAdmin && (
              <form action={deleteTaskAction}>
                <input type="hidden" name="taskId" value={task.id} />
                <button
                  type="submit"
                  className="text-red-600 text-sm hover:underline"
                >
                  Изтрий задача
                </button>
              </form>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}