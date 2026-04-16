import Link from 'next/link'

interface ProjectItem {
  id: string
  title: string
  description: string | null
  created_at: string
  creator_name: string
}

export default function ProjectsList({
  projects,
}: {
  projects: ProjectItem[]
}) {
  if (!projects.length) {
    return (
      <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
        <p className="text-[#7b746b]">No projects yet.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
            {project.title}
          </h2>

          <p className="mt-2 text-sm text-[#7b746b]">
            Created by: {project.creator_name}
          </p>

          <p className="mt-1 text-sm text-[#7b746b]">
            {new Date(project.created_at).toLocaleString('en-GB')}
          </p>

          {project.description && (
            <p className="mt-4 line-clamp-4 whitespace-pre-wrap leading-7 text-[#443d35]">
              {project.description}
            </p>
          )}

          <div className="mt-5">
            <span className="rounded-[16px] bg-[#c9a227] px-4 py-2 font-semibold text-white">
              Open project
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}