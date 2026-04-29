'use client'

import { usePathname } from 'next/navigation'
import PersonalWhiteboardLauncher from '@/components/PersonalWhiteboardLauncher'

export default function PersonalWhiteboardVisibility({
  userId,
}: {
  userId: string
}) {
  const pathname = usePathname()
  const isChatPage = pathname === '/chat' || pathname.startsWith('/chat/')

  return (
    <div className={isChatPage ? 'max-md:hidden' : undefined}>
      <PersonalWhiteboardLauncher userId={userId} />
    </div>
  )
}


