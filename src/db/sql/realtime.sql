-- Add tables to supabase_realtime publication for postgres_changes subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE called_phrases;
ALTER PUBLICATION supabase_realtime ADD TABLE tile_marks;
ALTER PUBLICATION supabase_realtime ADD TABLE bingo_events;
