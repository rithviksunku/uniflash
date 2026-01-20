-- =====================================================
-- ADD MISSING COLUMNS FOR QUIZ FUNCTIONALITY
-- =====================================================
-- Run this in your Supabase SQL Editor
-- This adds support for:
-- 1. Quiz question count tracking
-- 2. Quiz attempt total questions tracking
-- 3. Manual quiz score editing
-- =====================================================

-- 1. Add question_count to quizzes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'question_count'
  ) THEN
    ALTER TABLE quizzes
    ADD COLUMN question_count INTEGER DEFAULT 0;

    RAISE NOTICE '✅ Column question_count added to quizzes table';
  ELSE
    RAISE NOTICE 'ℹ️  Column question_count already exists in quizzes table';
  END IF;
END $$;

-- 2. Add total_questions to quiz_attempts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempts' AND column_name = 'total_questions'
  ) THEN
    ALTER TABLE quiz_attempts
    ADD COLUMN total_questions INTEGER DEFAULT 0;

    RAISE NOTICE '✅ Column total_questions added to quiz_attempts table';
  ELSE
    RAISE NOTICE 'ℹ️  Column total_questions already exists in quiz_attempts table';
  END IF;
END $$;

-- 3. Add manually_edited to quiz_attempts table
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

-- 4. Add description to quizzes table (optional, for better quiz organization)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'description'
  ) THEN
    ALTER TABLE quizzes
    ADD COLUMN description TEXT;

    RAISE NOTICE '✅ Column description added to quizzes table';
  ELSE
    RAISE NOTICE 'ℹ️  Column description already exists in quizzes table';
  END IF;
END $$;

-- 5. Update existing quizzes with question counts
UPDATE quizzes q
SET question_count = (
  SELECT COUNT(*)
  FROM quiz_questions qq
  WHERE qq.quiz_id = q.id
)
WHERE question_count = 0 OR question_count IS NULL;

RAISE NOTICE '✅ Updated existing quiz question counts';

-- 6. Update existing quiz attempts with total questions
UPDATE quiz_attempts qa
SET total_questions = (
  SELECT COUNT(*)
  FROM quiz_questions qq
  WHERE qq.quiz_id = qa.quiz_id
)
WHERE total_questions = 0 OR total_questions IS NULL;

RAISE NOTICE '✅ Updated existing quiz attempt total questions';

-- Verify the columns were added
SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE (table_name = 'quizzes' AND column_name IN ('question_count', 'description'))
   OR (table_name = 'quiz_attempts' AND column_name IN ('total_questions', 'manually_edited'))
ORDER BY table_name, column_name;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ All quiz columns added successfully!';
  RAISE NOTICE '📊 Added to quizzes: question_count, description';
  RAISE NOTICE '📝 Added to quiz_attempts: total_questions, manually_edited';
  RAISE NOTICE '🔄 Updated existing records with calculated values';
END $$;
