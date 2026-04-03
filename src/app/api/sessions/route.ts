import { NextResponse } from 'next/server'

import { db } from '@/db'
import { sessions } from '@/db/schema'
import { generateSessionCode } from '@/lib/session'
import { SessionStatus, SubmissionVisibility } from '@/types/enums'

const MAX_RETRIES = 3

const VALID_VISIBILITY = new Set<string>([SubmissionVisibility.Open, SubmissionVisibility.Blind])

interface CreateSessionBody {
  visibility?: string
  scheduledLockAt?: string | null
}

function parseBody(body: unknown): CreateSessionBody | string {
  if (typeof body !== 'object' || body === null) {
    return 'Request body must be a JSON object'
  }

  const obj = body as Record<string, unknown>

  if ('visibility' in obj && typeof obj.visibility !== 'string') {
    return 'visibility must be a string'
  }

  if (
    'visibility' in obj &&
    typeof obj.visibility === 'string' &&
    !VALID_VISIBILITY.has(obj.visibility)
  ) {
    return 'visibility must be "open" or "blind"'
  }

  if ('scheduledLockAt' in obj && obj.scheduledLockAt !== null) {
    if (typeof obj.scheduledLockAt !== 'string') {
      return 'scheduledLockAt must be an ISO datetime string or null'
    }
    const date = new Date(obj.scheduledLockAt)
    if (isNaN(date.getTime())) {
      return 'scheduledLockAt must be a valid datetime'
    }
    if (date.getTime() <= Date.now()) {
      return 'scheduledLockAt must be in the future'
    }
  }

  const result: CreateSessionBody = {}

  if ('visibility' in obj) {
    result.visibility = obj.visibility as string
  }

  if ('scheduledLockAt' in obj) {
    result.scheduledLockAt = obj.scheduledLockAt as string | null
  }

  return result
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === '23505'
  )
}

/**
 * Creates a new bingo session.
 * Generates a unique session code and inserts the session into the database.
 * Retries up to 3 times on session code collision.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const rawBody: unknown = await request.json()
    const parsed = parseBody(rawBody)

    if (typeof parsed === 'string') {
      return NextResponse.json({ error: parsed }, { status: 400 })
    }

    const visibility = parsed.visibility ?? SubmissionVisibility.Open
    const scheduledLockAt = parsed.scheduledLockAt != null ? new Date(parsed.scheduledLockAt) : null

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const code = generateSessionCode()

      try {
        await db.insert(sessions).values({
          code,
          status: SessionStatus.Collecting,
          visibility,
          ...(scheduledLockAt != null ? { scheduledLockAt } : {}),
        })

        return NextResponse.json({ code, url: `/${code}` }, { status: 201 })
      } catch (error) {
        if (isUniqueViolation(error)) {
          continue
        }
        throw error
      }
    }

    return NextResponse.json({ error: 'Could not generate unique session code' }, { status: 503 })
  } catch (error) {
    console.error('session creation failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
