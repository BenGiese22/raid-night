import { NextResponse } from 'next/server'
import { and, isNull, lt, or } from 'drizzle-orm'

import { db } from '@/db'
import { sessions } from '@/db/schema'

/**
 * Delete sessions inactive for more than 2 hours.
 * Skips sessions with a future scheduledLockAt — they are intentionally waiting.
 * CASCADE foreign keys automatically remove all child records.
 * Called by Vercel Cron every 30 minutes.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET ?? ''}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

    const result = await db
      .delete(sessions)
      .where(
        and(
          lt(sessions.lastActivityAt, twoHoursAgo),
          // Don't delete sessions with a future scheduled lock — they're waiting for players
          or(isNull(sessions.scheduledLockAt), lt(sessions.scheduledLockAt, now)),
        ),
      )
      .returning({ id: sessions.id })

    return NextResponse.json({ deleted: result.length })
  } catch (error) {
    console.error('cleanup cron failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
