import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { sessions } from '@/db/schema'
import type { SessionStatus, SubmissionVisibility } from '@/types/enums'
import { SessionClient } from './session-client'

interface PageProps {
  params: { code: string }
}

export default async function SessionPage({ params }: PageProps) {
  const result = await db.select().from(sessions).where(eq(sessions.code, params.code))

  const session = result[0]

  if (!session) {
    notFound()
  }

  return (
    <SessionClient
      id={session.id}
      code={session.code}
      status={session.status as SessionStatus}
      visibility={session.visibility as SubmissionVisibility}
      freeSpace={session.freeSpace}
      scheduledLockAt={session.scheduledLockAt?.toISOString() ?? null}
      phrasePool={session.phrasePool}
    />
  )
}
