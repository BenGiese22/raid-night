import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { phraseSubmissions, sessions } from '@/db/schema'
import { SessionStatus } from '@/types/enums'

/**
 * Manually locks a session. Copies all phrase submissions into the session's
 * phrase pool and transitions status to locked.
 */
export async function PATCH(
  _request: Request,
  { params }: { params: { code: string } },
): Promise<NextResponse> {
  try {
    const { code } = params

    const result = await db
      .select({ id: sessions.id, status: sessions.status })
      .from(sessions)
      .where(eq(sessions.code, code))

    const session = result[0]

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if ((session.status as SessionStatus) !== SessionStatus.Collecting) {
      return NextResponse.json({ error: 'Session is not in collecting status' }, { status: 409 })
    }

    const submissions = await db
      .select({ phrase: phraseSubmissions.phrase })
      .from(phraseSubmissions)
      .where(eq(phraseSubmissions.sessionId, session.id))

    const phrasePool = submissions.map((s) => s.phrase)
    const now = new Date()

    await db
      .update(sessions)
      .set({
        status: SessionStatus.Locked,
        lockedAt: now,
        phrasePool,
        lastActivityAt: now,
      })
      .where(eq(sessions.id, session.id))

    return NextResponse.json({ locked: true, phraseCount: phrasePool.length })
  } catch (error) {
    console.error('session lock failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
