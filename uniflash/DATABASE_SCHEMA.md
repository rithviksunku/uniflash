# Uniflash Database Schema

This document outlines the Supabase database schema needed for the Uniflash MVP.

## Tables

### 1. presentations
Stores uploaded PowerPoint presentations.

```sql
CREATE TABLE presentations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. slides
Stores individual slides extracted from presentations.

```sql
CREATE TABLE slides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  presentation_id UUID REFERENCES presentations(id) ON DELETE CASCADE,
  slide_number INTEGER NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_slides_presentation ON slides(presentation_id);
```

### 3. flashcards
Stores flashcards (both manually created and auto-generated).

```sql
CREATE TABLE flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  slide_id UUID REFERENCES slides(id) ON DELETE SET NULL,
  next_review TIMESTAMP WITH TIME ZONE NOT NULL,
  interval_days INTEGER DEFAULT 1,
  last_reviewed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_flashcards_next_review ON flashcards(next_review);
CREATE INDEX idx_flashcards_slide ON flashcards(slide_id);
```

### 4. review_sessions
Tracks review session statistics.

```sql
CREATE TABLE review_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cards_reviewed INTEGER NOT NULL,
  time_spent INTEGER NOT NULL, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_review_sessions_created ON review_sessions(created_at);
```

### 5. quizzes
Stores generated quizzes.

```sql
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 6. quiz_questions
Stores individual quiz questions.

```sql
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of answer options
  source_id UUID, -- References either flashcards or slides
  source_type TEXT, -- 'flashcard' or 'slide'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);
```

### 7. quiz_attempts
Stores quiz attempt results.

```sql
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL, -- Percentage
  answers JSONB NOT NULL, -- Stores all answers
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
```

## Storage Buckets

### presentations
For storing uploaded PowerPoint files.

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('presentations', 'presentations', false);

-- Set up RLS policies
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'presentations');

CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'presentations');
```

## Row Level Security (RLS)

For the MVP, we'll use simple public access policies. In production, you should add user authentication and restrict access accordingly.

```sql
-- Enable RLS on all tables
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Create public access policies for MVP
CREATE POLICY "Public access" ON presentations FOR ALL TO public USING (true);
CREATE POLICY "Public access" ON slides FOR ALL TO public USING (true);
CREATE POLICY "Public access" ON flashcards FOR ALL TO public USING (true);
CREATE POLICY "Public access" ON review_sessions FOR ALL TO public USING (true);
CREATE POLICY "Public access" ON quizzes FOR ALL TO public USING (true);
CREATE POLICY "Public access" ON quiz_questions FOR ALL TO public USING (true);
CREATE POLICY "Public access" ON quiz_attempts FOR ALL TO public USING (true);
```

## Setup Instructions

1. Create a new Supabase project at https://supabase.com
2. Go to the SQL Editor in your Supabase dashboard
3. Run all the CREATE TABLE statements above
4. Create the storage bucket for presentations
5. Set up RLS policies
6. Copy your project URL and anon key
7. Create a `.env` file in your project root:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Notes

- The schema supports linking flashcards to source slides for the "Don't understand" feature
- Quiz questions store their options as JSONB for flexibility
- Review sessions track time spent (excluding idle time should be handled in the frontend)
- All timestamps use `TIMESTAMP WITH TIME ZONE` for proper timezone handling

---

## MIGRATION GUIDE - Healthcare Student Edition

### 🚀 Quick Migration Steps

1. **Backup Your Database** (Recommended)
   - Go to Supabase Dashboard → Database → Backups
   - Create a manual backup before proceeding

2. **Run Migration SQL**
   - Open `DATABASE_MIGRATION.sql` file
   - Copy entire contents
   - Go to Supabase SQL Editor
   - Paste and click **Run**

3. **Verify Success**
   - Check for "✅ Migration completed successfully!" message
   - Verify 5 default sets created

### ✨ New Features After Migration

#### **Flashcard Sets** - Organize by Topic
Students can now create sets like:
- "Anatomy Chapter 5"
- "Pharmacology Exam 2"
- "Clinical Skills Practice"

#### **Performance Tracking**
- Success rate per card
- Times reviewed/correct
- Identify difficult cards automatically

#### **Study Streaks**
- Track consecutive days studied
- Motivation through gamification
- See longest streak

#### **PDF Support**
- Upload PDF lecture notes
- AI extracts key concepts
- Same workflow as PowerPoint

---

## New Table Structures

### flashcard_sets
```sql
id          | UUID    | Primary key
name        | TEXT    | "Anatomy Chapter 5"
description | TEXT    | "Cardiovascular system"
color       | TEXT    | "#ef4444" (red)
icon        | TEXT    | "🫀" (heart emoji)
created_at  | TIMESTAMP
updated_at  | TIMESTAMP | Auto-updated
```

### flashcards (NEW COLUMNS)
```sql
set_id         | UUID    | Links to flashcard_sets
tags           | TEXT[]  | ["exam1", "difficult"]
difficulty     | TEXT    | "easy" | "medium" | "hard"
notes          | TEXT    | Personal study notes
times_reviewed | INTEGER | Performance tracking
times_correct  | INTEGER | Success tracking
```

### study_streaks
```sql
current_streak  | INTEGER | Days in a row
longest_streak  | INTEGER | Best streak ever
last_study_date | DATE    | Last study day
```

---

## Default Healthcare Sets

After migration, you'll have these pre-created sets:

| Set | Icon | Color | Description |
|-----|------|-------|-------------|
| Anatomy | 🫀 | Red | Body systems & structures |
| Physiology | ⚡ | Blue | Body functions |
| Pharmacology | 💊 | Green | Medications & drugs |
| Pathology | 🦠 | Purple | Disease processes |
| Clinical Skills | 🩺 | Orange | Patient care |

---

## Usage Examples

### Create a New Set
```javascript
const { data } = await supabase
  .from('flashcard_sets')
  .insert([{
    name: 'Cardiology Exam 1',
    description: 'Heart anatomy and physiology',
    color: '#ef4444',
    icon: '❤️'
  }])
  .select()
  .single();
```

### Assign Flashcard to Set
```javascript
await supabase
  .from('flashcards')
  .update({ set_id: setId })
  .eq('id', flashcardId);
```

### Get Cards from Multiple Sets
```javascript
const { data } = await supabase
  .from('flashcards')
  .select('*, flashcard_sets(name, color)')
  .in('set_id', [setId1, setId2])
  .lte('next_review', new Date().toISOString());
```

### Check Study Streak
```javascript
const { data } = await supabase
  .from('study_streaks')
  .select('*')
  .is('user_id', null)
  .single();

// Returns: { current_streak: 5, longest_streak: 12, ... }
```

---

## Migration Checklist

After running `DATABASE_MIGRATION.sql`:

- [ ] 5 default sets visible in flashcard_sets table
- [ ] flashcards table has new columns (set_id, tags, etc.)
- [ ] presentations table has file_type column
- [ ] study_streaks table created
- [ ] shared_sets table created (for future)
- [ ] Views created (flashcard_set_stats, difficult_flashcards)
- [ ] No SQL errors in output
- [ ] Test creating a new set
- [ ] Test assigning flashcard to set
- [ ] Test viewing set statistics

---

## Troubleshooting

### Error: "relation already exists"
- ✅ This is OK! It means tables already exist
- Migration uses `IF NOT EXISTS` to be safe

### Error: "column already exists"
- ✅ This is OK! Migration checks before adding
- Your database is likely up to date

### No Default Sets Created
```sql
-- Manually insert if needed:
INSERT INTO flashcard_sets (name, description, color, icon)
VALUES
  ('Anatomy', 'Human anatomy', '#ef4444', '🫀'),
  ('Physiology', 'Body functions', '#3b82f6', '⚡'),
  ('Pharmacology', 'Medications', '#10b981', '💊'),
  ('Pathology', 'Diseases', '#8b5cf6', '🦠'),
  ('Clinical Skills', 'Patient care', '#f59e0b', '🩺');
```

### Rollback Migration
See rollback SQL in DATABASE_MIGRATION.sql comments

---

## Performance Notes

### Indexes Created
- Fast lookups by set
- Fast filtered reviews
- Fast tag searches
- Optimized for healthcare student workflows

### Auto-Updated Fields
- `updated_at` on sets and presentations
- `study_streaks` after each review
- Performance metrics on flashcards

---

## Next Steps

1. ✅ Run migration
2. Create FlashcardSets page (see IMPLEMENTATION_GUIDE.md)
3. Update UploadSlides for PDF support
4. Add AI grammar cleanup to CreateFlashcard
5. Update Review to filter by sets
6. Update Quiz generation for multi-set selection

All code examples in **IMPLEMENTATION_GUIDE.md**!
