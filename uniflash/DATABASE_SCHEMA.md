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
