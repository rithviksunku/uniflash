-- =====================================================
-- UNIFLASH DATABASE MIGRATION
-- Healthcare Student Edition with Flashcard Sets
-- =====================================================
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. CREATE FLASHCARD SETS TABLE
-- This allows students to organize flashcards by topic
CREATE TABLE IF NOT EXISTS flashcard_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#9333ea',
  icon TEXT DEFAULT '📚',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ADD SET_ID TO FLASHCARDS TABLE
-- Links flashcards to sets (optional - cards can exist without a set)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flashcards' AND column_name = 'set_id'
  ) THEN
    ALTER TABLE flashcards
    ADD COLUMN set_id UUID REFERENCES flashcard_sets(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. ADD FILE_TYPE TO PRESENTATIONS TABLE
-- Supports both PowerPoint (.pptx) and PDF (.pdf) files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presentations' AND column_name = 'file_type'
  ) THEN
    ALTER TABLE presentations
    ADD COLUMN file_type TEXT DEFAULT 'pptx';
  END IF;
END $$;

-- 4. ADD UPDATED_AT TO PRESENTATIONS TABLE
-- Track when presentations are modified
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presentations' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE presentations
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 5. CREATE INDEXES FOR PERFORMANCE
-- Flashcards by set
CREATE INDEX IF NOT EXISTS idx_flashcards_set_id ON flashcards(set_id);

-- Flashcards by set and due date (for filtered reviews)
CREATE INDEX IF NOT EXISTS idx_flashcards_set_next_review ON flashcards(set_id, next_review);

-- Presentations by file type
CREATE INDEX IF NOT EXISTS idx_presentations_file_type ON presentations(file_type);

-- Review sessions by date (for analytics)
CREATE INDEX IF NOT EXISTS idx_review_sessions_created_at ON review_sessions(created_at);

-- 6. CREATE FUNCTION TO UPDATE UPDATED_AT TIMESTAMP
-- Automatically updates the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. CREATE TRIGGERS FOR UPDATED_AT
-- Flashcard sets
DROP TRIGGER IF EXISTS update_flashcard_sets_updated_at ON flashcard_sets;
CREATE TRIGGER update_flashcard_sets_updated_at
    BEFORE UPDATE ON flashcard_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Presentations
DROP TRIGGER IF EXISTS update_presentations_updated_at ON presentations;
CREATE TRIGGER update_presentations_updated_at
    BEFORE UPDATE ON presentations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. CREATE DEFAULT FLASHCARD SETS
-- Pre-populate with common healthcare subjects
INSERT INTO flashcard_sets (name, description, color, icon)
VALUES
  ('Anatomy', 'Human anatomy and body systems', '#ef4444', '🫀'),
  ('Physiology', 'Body functions and processes', '#3b82f6', '⚡'),
  ('Pharmacology', 'Medications and drug interactions', '#10b981', '💊'),
  ('Pathology', 'Disease mechanisms and processes', '#8b5cf6', '🦠'),
  ('Clinical Skills', 'Patient care and procedures', '#f59e0b', '🩺')
ON CONFLICT DO NOTHING;

-- 9. CREATE VIEW FOR FLASHCARD SET STATISTICS
-- Makes it easy to get card counts per set
CREATE OR REPLACE VIEW flashcard_set_stats AS
SELECT
  fs.id,
  fs.name,
  fs.description,
  fs.color,
  fs.icon,
  fs.created_at,
  fs.updated_at,
  COUNT(f.id) as total_cards,
  COUNT(f.id) FILTER (WHERE f.next_review <= NOW()) as due_cards,
  COUNT(f.id) FILTER (WHERE f.last_reviewed IS NOT NULL) as reviewed_cards
FROM flashcard_sets fs
LEFT JOIN flashcards f ON fs.id = f.set_id
GROUP BY fs.id, fs.name, fs.description, fs.color, fs.icon, fs.created_at, fs.updated_at;

-- 10. ADD STUDY STREAK TRACKING
-- Track consecutive days of studying
CREATE TABLE IF NOT EXISTS study_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- For future multi-user support
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_study_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. CREATE FUNCTION TO UPDATE STUDY STREAK
-- Automatically updates streak when reviewing cards
CREATE OR REPLACE FUNCTION update_study_streak()
RETURNS TRIGGER AS $$
DECLARE
  today DATE := CURRENT_DATE;
  last_date DATE;
  current_streak_val INTEGER;
  longest_streak_val INTEGER;
BEGIN
  -- Get existing streak data
  SELECT last_study_date, current_streak, longest_streak
  INTO last_date, current_streak_val, longest_streak_val
  FROM study_streaks
  WHERE user_id IS NULL -- Single user for now
  LIMIT 1;

  IF last_date IS NULL THEN
    -- First study session
    INSERT INTO study_streaks (user_id, current_streak, longest_streak, last_study_date)
    VALUES (NULL, 1, 1, today);
  ELSIF last_date = today THEN
    -- Already studied today, no change
    NULL;
  ELSIF last_date = today - INTERVAL '1 day' THEN
    -- Consecutive day, increment streak
    UPDATE study_streaks
    SET
      current_streak = current_streak + 1,
      longest_streak = GREATEST(longest_streak, current_streak + 1),
      last_study_date = today,
      updated_at = NOW()
    WHERE user_id IS NULL;
  ELSE
    -- Streak broken, reset to 1
    UPDATE study_streaks
    SET
      current_streak = 1,
      last_study_date = today,
      updated_at = NOW()
    WHERE user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. CREATE TRIGGER FOR STUDY STREAK
DROP TRIGGER IF EXISTS update_streak_on_review ON review_sessions;
CREATE TRIGGER update_streak_on_review
    AFTER INSERT ON review_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_study_streak();

-- 13. ADD TAGS TO FLASHCARDS (OPTIONAL)
-- Allows tagging cards with keywords (e.g., "exam1", "difficult", "review")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flashcards' AND column_name = 'tags'
  ) THEN
    ALTER TABLE flashcards
    ADD COLUMN tags TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- 14. CREATE INDEX ON TAGS
CREATE INDEX IF NOT EXISTS idx_flashcards_tags ON flashcards USING GIN(tags);

-- 15. ADD DIFFICULTY RATING TO FLASHCARDS
-- Track which cards are harder (useful for analytics)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flashcards' AND column_name = 'difficulty'
  ) THEN
    ALTER TABLE flashcards
    ADD COLUMN difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard'));
  END IF;
END $$;

-- 16. ADD NOTES TO FLASHCARDS
-- Students can add personal notes to cards
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flashcards' AND column_name = 'notes'
  ) THEN
    ALTER TABLE flashcards
    ADD COLUMN notes TEXT;
  END IF;
END $$;

-- 17. CREATE TABLE FOR SHARED FLASHCARD SETS
-- Allow students to share sets with classmates (future feature)
CREATE TABLE IF NOT EXISTS shared_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID REFERENCES flashcard_sets(id) ON DELETE CASCADE,
  shared_by UUID, -- User who shared
  access_code TEXT UNIQUE, -- Code to access shared set
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_sets_access_code ON shared_sets(access_code);

-- 18. ADD PERFORMANCE METRICS TO FLASHCARDS
-- Track success rate for each card
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flashcards' AND column_name = 'times_reviewed'
  ) THEN
    ALTER TABLE flashcards
    ADD COLUMN times_reviewed INTEGER DEFAULT 0,
    ADD COLUMN times_correct INTEGER DEFAULT 0;
  END IF;
END $$;

-- 18.5. ADD QUIZ-RELATED COLUMNS
-- Track quiz question counts and manual edits

-- Add question_count to quizzes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'question_count'
  ) THEN
    ALTER TABLE quizzes
    ADD COLUMN question_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add description to quizzes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'description'
  ) THEN
    ALTER TABLE quizzes
    ADD COLUMN description TEXT;
  END IF;
END $$;

-- Add total_questions to quiz_attempts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempts' AND column_name = 'total_questions'
  ) THEN
    ALTER TABLE quiz_attempts
    ADD COLUMN total_questions INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add manually_edited to quiz_attempts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempts' AND column_name = 'manually_edited'
  ) THEN
    ALTER TABLE quiz_attempts
    ADD COLUMN manually_edited BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Update existing quizzes with question counts
UPDATE quizzes q
SET question_count = (
  SELECT COUNT(*)
  FROM quiz_questions qq
  WHERE qq.quiz_id = q.id
)
WHERE question_count = 0 OR question_count IS NULL;

-- Update existing quiz attempts with total questions
UPDATE quiz_attempts qa
SET total_questions = (
  SELECT COUNT(*)
  FROM quiz_questions qq
  WHERE qq.quiz_id = qa.quiz_id
)
WHERE total_questions = 0 OR total_questions IS NULL;

-- 18.6. ADD CLOZE FLASHCARD SUPPORT
-- Allows Anki-style cloze deletion flashcards with multiple blanks

-- Add card_type column to distinguish standard vs cloze cards
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flashcards' AND column_name = 'card_type'
  ) THEN
    ALTER TABLE flashcards
    ADD COLUMN card_type TEXT DEFAULT 'standard' CHECK (card_type IN ('standard', 'cloze'));
  END IF;
END $$;

-- Add cloze_data JSONB column for storing cloze card data
-- Structure: { source_text: string, cloze_number: number, extractions: [{number, word}] }
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flashcards' AND column_name = 'cloze_data'
  ) THEN
    ALTER TABLE flashcards
    ADD COLUMN cloze_data JSONB;
  END IF;
END $$;

-- Index for filtering by card type
CREATE INDEX IF NOT EXISTS idx_flashcards_card_type ON flashcards(card_type);

-- 19. CREATE VIEW FOR DIFFICULT CARDS
-- Easily find cards that need more practice
CREATE OR REPLACE VIEW difficult_flashcards AS
SELECT
  f.*,
  fs.name as set_name,
  CASE
    WHEN f.times_reviewed = 0 THEN 0
    ELSE ROUND((f.times_correct::NUMERIC / f.times_reviewed::NUMERIC) * 100)
  END as success_rate
FROM flashcards f
LEFT JOIN flashcard_sets fs ON f.set_id = fs.id
WHERE f.times_reviewed >= 3  -- Only cards reviewed at least 3 times
  AND (f.times_correct::NUMERIC / NULLIF(f.times_reviewed, 0)::NUMERIC) < 0.7  -- Less than 70% success
ORDER BY success_rate ASC;

-- 20. GRANT PERMISSIONS (if using RLS)
-- Note: Adjust these based on your security requirements
-- ALTER TABLE flashcard_sets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE study_streaks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shared_sets ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '📊 Tables created: flashcard_sets, study_streaks, shared_sets';
  RAISE NOTICE '🔧 Columns added: set_id, file_type, tags, difficulty, notes, performance metrics';
  RAISE NOTICE '📈 Views created: flashcard_set_stats, difficult_flashcards';
  RAISE NOTICE '⚡ Triggers created: Auto-update timestamps and study streaks';
  RAISE NOTICE '🎯 Default sets created: Anatomy, Physiology, Pharmacology, Pathology, Clinical Skills';
END $$;

-- Query to verify flashcard sets were created
SELECT
  name,
  description,
  color,
  icon,
  created_at
FROM flashcard_sets
ORDER BY created_at;

-- Query to check table structure
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('flashcard_sets', 'flashcards', 'presentations', 'study_streaks')
ORDER BY table_name, ordinal_position;
