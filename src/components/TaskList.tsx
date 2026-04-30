import { uiText } from '@/lib/ui-text'

interface TaskItem {
  id: string
  title: string
  description: string | null
  due_date: string | null
  priority: string
  status: string
  assigned_to: string
  employee_name?: string
  attachments?: Array<{
    id: string
    file_name: string
    file_url: string
  }>
}

function getPriorityClasses(priority: string) {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700'
    case 'low':
      return 'bg-green-100 text-green-700'
    default:
      return 'bg-amber-100 text-amber-700'
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
      return 'High'
    case 'low':
      return 'Low'
    default:
      return 'Medium'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'done':
      return uiText.tasks.statusDone
    case 'in_progress':
      return uiText.tasks.statusInProgress
    default:
      return uiText.tasks.statusNew
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
      <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
        <p className="text-[#7b746b]">{uiText.tasks.noTasks}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${getPriorityClasses(task.priority)}`}>
              {getPriorityLabel(task.priority)}
            </span>

            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusClasses(task.status)}`}>
              {getStatusLabel(task.status)}
            </span>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
            {task.title}
          </h2>

          {task.employee_name && (
            <p className="mt-2 text-sm text-[#7b746b]">
              {uiText.tasks.assignedTo}: {task.employee_name}
            </p>
          )}

          {task.description && (
            <p className="mt-4 whitespace-pre-wrap leading-7 text-[#443d35]">
              {task.description}
            </p>
          )}

          <div className="mt-4 text-sm text-[#7b746b]">
            {uiText.tasks.dueDate}:{' '}
            {task.due_date
              ? new Date(task.due_date).toLocaleDateString('bg-BG')
              : uiText.tasks.noDueDate}
          </div>

          {task.attachments?.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {task.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[16px] border border-[#e7d6a1] bg-white px-4 py-2 text-sm font-semibold text-[#1f1a14] hover:bg-[#fbf6e8]"
                >
                  {attachment.file_name}
                </a>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <form action={updateStatusAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="taskId" value={task.id} />

              <select
                name="status"
                defaultValue={task.status}
                className="rounded-[16px] border border-[#ece5d8] bg-[#fcfbf8] px-3 py-2 text-sm outline-none"
              >
                <option value="new">{uiText.tasks.statusNew}</option>
                <option value="in_progress">{uiText.tasks.statusInProgress}</option>
                <option value="done">{uiText.tasks.statusDone}</option>
              </select>

              <button
                type="submit"
                className="rounded-[16px] bg-[#c9a227] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a88414]"
              >
                {uiText.tasks.changeStatus}
              </button>
            </form>

            {isAdmin && (
              <form action={deleteTaskAction}>
                <input type="hidden" name="taskId" value={task.id} />
                <button
                  type="submit"
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  {uiText.tasks.deleteTask}
                </button>
              </form>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}


