import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { phraseSubmissions, sessions } from '@/db/schema'
import { SessionStatus } from '@/types/enums'

/**
 * Manually locks a session. Copies all phrase submissions into the session's
 * phrase pool and transitions status to locked.
 * Uses optimistic locking (WHERE status = 'collecting') to prevent race conditions.
 */
export async function PATCH(
  _request: Request,
  { params }: { params: { code: string } },
): Promise<NextResponse> {
  try {
    const { code } = params

    const lookupResult = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.code, code))

    const session = lookupResult[0]

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const submissions = await db
      .select({ phrase: phraseSubmissions.phrase })
      .from(phraseSubmissions)
      .where(eq(phraseSubmissions.sessionId, session.id))

    const phrasePool = submissions.map((s) => s.phrase)
    const now = new Date()

    // Optimistic lock: only update if still collecting (prevents TOCTOU race)
    const updated = await db
      .update(sessions)
      .set({
        status: SessionStatus.Locked,
        lockedAt: now,
        phrasePool,
        lastActivityAt: now,
      })
      .where(and(eq(sessions.id, session.id), eq(sessions.status, SessionStatus.Collecting)))
      .returning({ id: sessions.id })

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Session is not in collecting status' }, { status: 409 })
    }

    return NextResponse.json({ locked: true, phraseCount: phrasePool.length })
  } catch (error) {
    console.error('session lock failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
