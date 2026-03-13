-- =====================================================
-- CLOZE FLASHCARD MIGRATION
-- Run this in your Supabase SQL Editor
-- =====================================================

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

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE 'Cloze migration completed!';
  RAISE NOTICE 'Columns added: card_type, cloze_data';
END $$;

-- Check that columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'flashcards'
  AND column_name IN ('card_type', 'cloze_data');
