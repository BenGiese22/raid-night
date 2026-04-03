-- Trigger function: update session last_activity_at when a tile is marked
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sessions
  SET last_activity_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to tile_marks table
CREATE TRIGGER on_tile_mark_update_activity
  AFTER INSERT ON tile_marks
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();
