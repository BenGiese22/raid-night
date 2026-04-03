import { NextResponse } from 'next/server'
import { and, eq, isNotNull, lte } from 'drizzle-orm'

import { db } from '@/db'
import { phraseSubmissions, sessions } from '@/db/schema'

/**
 * Auto-lock sessions past their scheduled lock time.
 * Copies all phrase_submissions into sessions.phrase_pool, then transitions status to 'locked'.
 * Called by Vercel Cron every 5 minutes.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET ?? ''}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  const sessionsToLock = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.status, 'collecting'),
        isNotNull(sessions.scheduledLockAt),
        lte(sessions.scheduledLockAt, now),
      ),
    )

  let lockedCount = 0

  for (const session of sessionsToLock) {
    const submissions = await db
      .select({ phrase: phraseSubmissions.phrase })
      .from(phraseSubmissions)
      .where(eq(phraseSubmissions.sessionId, session.id))

    const phrasePool = submissions.map((s) => s.phrase)

    await db
      .update(sessions)
      .set({
        status: 'locked',
        lockedAt: now,
        phrasePool,
        lastActivityAt: now,
      })
      .where(eq(sessions.id, session.id))

    lockedCount++
  }

  return NextResponse.json({ locked: lockedCount })
}
