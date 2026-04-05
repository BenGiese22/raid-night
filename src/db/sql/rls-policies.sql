-- Enable RLS on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE phrase_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE called_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tile_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_events ENABLE ROW LEVEL SECURITY;

-- Sessions: anyone can read, insert, update
CREATE POLICY "Anyone can read sessions" ON sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert sessions" ON sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update sessions" ON sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Phrase submissions: anyone can read and insert
CREATE POLICY "Anyone can read phrase_submissions" ON phrase_submissions FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert phrase_submissions" ON phrase_submissions FOR INSERT TO anon WITH CHECK (true);

-- Called phrases: anyone can read, insert, and delete (undo within 30s only)
CREATE POLICY "Anyone can read called_phrases" ON called_phrases FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert called_phrases" ON called_phrases FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Undo only within 30 seconds" ON called_phrases FOR DELETE TO anon
  USING (called_at > now() - interval '30 seconds');

-- Tile marks: anyone can read, insert, and delete (undo cascading)
CREATE POLICY "Anyone can read tile_marks" ON tile_marks FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert tile_marks" ON tile_marks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can delete tile_marks" ON tile_marks FOR DELETE TO anon USING (true);

-- Bingo events: anyone can read and insert
CREATE POLICY "Anyone can read bingo_events" ON bingo_events FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert bingo_events" ON bingo_events FOR INSERT TO anon WITH CHECK (true);
