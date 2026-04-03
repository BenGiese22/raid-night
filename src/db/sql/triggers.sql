-- Trigger function: update session last_activity_at on activity
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

-- Attach trigger to called_phrases table
CREATE TRIGGER on_phrase_call_update_activity
  AFTER INSERT ON called_phrases
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();

-- Attach trigger to phrase_submissions table
CREATE TRIGGER on_phrase_submit_update_activity
  AFTER INSERT ON phrase_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();
