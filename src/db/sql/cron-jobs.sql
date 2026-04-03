-- Auto-lock sessions past their scheduled lock time (every 5 minutes)
SELECT cron.schedule(
  'auto-lock-sessions',
  '*/5 * * * *',
  $$
    UPDATE sessions
    SET status = 'locked',
        locked_at = NOW(),
        phrase_pool = COALESCE(
          (SELECT jsonb_agg(ps.phrase)
           FROM phrase_submissions ps
           WHERE ps.session_id = sessions.id),
          '[]'::jsonb
        )
    WHERE status = 'collecting'
      AND scheduled_lock_at IS NOT NULL
      AND scheduled_lock_at <= NOW();
  $$
);

-- Cleanup inactive sessions (every 30 minutes)
-- CASCADE deletes all child records automatically
SELECT cron.schedule(
  'cleanup-inactive-sessions',
  '*/30 * * * *',
  $$
    DELETE FROM sessions
    WHERE last_activity_at < NOW() - INTERVAL '2 hours';
  $$
);
