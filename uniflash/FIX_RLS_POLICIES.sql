-- Fix RLS policies to allow all operations on flashcard_sets and flashcards
-- This ensures users can create sets from flagged cards and update flashcards

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public access" ON flashcard_sets;
DROP POLICY IF EXISTS "Public access" ON flashcards;

-- Recreate comprehensive policies for flashcard_sets
CREATE POLICY "Enable all operations for flashcard_sets"
ON flashcard_sets
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Recreate comprehensive policies for flashcards
CREATE POLICY "Enable all operations for flashcards"
ON flashcards
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Verify RLS is enabled
ALTER TABLE flashcard_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies fixed successfully!';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '  - Create new flashcard sets';
  RAISE NOTICE '  - Update flashcard flags and assignments';
  RAISE NOTICE '  - Perform all CRUD operations';
END $$;
