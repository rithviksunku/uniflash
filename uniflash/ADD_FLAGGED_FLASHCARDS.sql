-- Migration: Add flagged flashcards feature
-- This allows users to flag difficult flashcards and create a set from them

-- Add is_flagged column to flashcards table
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;

-- Create index for faster queries on flagged cards
CREATE INDEX IF NOT EXISTS idx_flashcards_is_flagged ON flashcards(is_flagged);

-- Create a view to easily see all flagged flashcards
CREATE OR REPLACE VIEW flagged_flashcards AS
SELECT
  f.*,
  fs.name as set_name,
  fs.color as set_color,
  fs.icon as set_icon
FROM flashcards f
LEFT JOIN flashcard_sets fs ON f.set_id = fs.id
WHERE f.is_flagged = true
ORDER BY f.created_at DESC;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Flagged flashcards feature added successfully!';
  RAISE NOTICE 'Users can now:';
  RAISE NOTICE '  - Flag difficult flashcards during practice/review';
  RAISE NOTICE '  - Create a new set from all flagged cards';
  RAISE NOTICE '  - Unflag cards after mastering them';
END $$;
