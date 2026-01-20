# Uniflash Setup Guide

## Database Migration Required

To enable all quiz features (Quiz History, Edit Quiz Scores, etc.), you need to run a database migration.

### Quick Setup (Recommended)

Run the comprehensive migration file in your Supabase SQL Editor:

**File:** `ADD_QUIZ_COLUMNS.sql`

This single file will:
- ✅ Add `question_count` to `quizzes` table
- ✅ Add `description` to `quizzes` table
- ✅ Add `total_questions` to `quiz_attempts` table
- ✅ Add `manually_edited` to `quiz_attempts` table
- ✅ Update all existing records with calculated values

### How to Run the Migration

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `ADD_QUIZ_COLUMNS.sql`
4. Paste into the SQL Editor
5. Click **Run**

You should see success messages like:
```
✅ Column question_count added to quizzes table
✅ Column total_questions added to quiz_attempts table
✅ Column manually_edited added to quiz_attempts table
✅ Updated existing quiz question counts
✅ Updated existing quiz attempt total questions
```

### Alternative: Full Migration

If you're setting up the entire database from scratch or want all features, run:

**File:** `DATABASE_MIGRATION.sql`

This includes all database enhancements including flashcard sets, study streaks, tags, and more.

## Features Now Available

After running the migration:

### 1. Quiz History Page
- View all past quizzes
- See best scores and attempt counts
- Retake any quiz
- Search and filter quizzes
- Delete old quizzes

**Access:** Dashboard → Quiz History or navigate to `/quiz/history`

### 2. Edit Quiz Scores
- Manually correct AI grading mistakes
- Click any question to toggle correct/incorrect
- Real-time score recalculation
- Visual indicators for edited scores

**How to use:**
1. Take a quiz
2. View results
3. Click "Edit Score" button
4. Click on any question to toggle correctness
5. Save changes

### 3. Enhanced PDF Support
- Better error handling
- Validation for corrupted files
- Support for password-protected PDFs (with error message)
- File size validation (max 50MB)

## Troubleshooting

### Error: "Could not find column in schema cache"

This means you haven't run the database migration yet. Run `ADD_QUIZ_COLUMNS.sql` in Supabase SQL Editor.

### Quiz history not showing up

Make sure you:
1. Ran the migration
2. Generated quizzes AFTER running the migration
3. Completed at least one quiz attempt

### Edit Score button doesn't work

Verify the `manually_edited` column exists:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'quiz_attempts' AND column_name = 'manually_edited';
```

If empty, run the migration.

## Next Steps

1. ✅ Run `ADD_QUIZ_COLUMNS.sql` in Supabase
2. ✅ Generate a new quiz to test
3. ✅ Complete the quiz
4. ✅ Check Quiz History page
5. ✅ Try editing the score on results page

Enjoy your enhanced Uniflash experience!
