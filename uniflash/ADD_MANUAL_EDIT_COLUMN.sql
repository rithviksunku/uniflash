-- =====================================================
-- ADD MANUALLY_EDITED COLUMN TO QUIZ_ATTEMPTS
-- =====================================================
-- Run this in your Supabase SQL Editor
-- This adds support for manually editing quiz scores
-- =====================================================

-- Add manually_edited column to quiz_attempts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempts' AND column_name = 'manually_edited'
  ) THEN
    ALTER TABLE quiz_attempts
    ADD COLUMN manually_edited BOOLEAN DEFAULT false;

    RAISE NOTICE '✅ Column manually_edited added to quiz_attempts table';
  ELSE
    RAISE NOTICE 'ℹ️  Column manually_edited already exists in quiz_attempts table';
  END IF;
END $$;

-- Verify the column was added
SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'quiz_attempts' AND column_name = 'manually_edited';
