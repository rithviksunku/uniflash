# Uniflash Setup Guide

## Overview

Uniflash is an AI-powered flashcard and quiz generation app that parses PowerPoint presentations and creates study materials using OpenAI's GPT-3.5 Turbo.

## Features

✅ **PowerPoint Parsing**: Upload .pptx files and automatically extract slide content
✅ **AI Flashcard Generation**: Generate flashcards from slides using OpenAI
✅ **AI Quiz Generation**: Create quizzes from flashcards or slides using OpenAI
✅ **Spaced Repetition**: Smart review system with SRS algorithm
✅ **Active Time Tracking**: Tracks only active study time (excludes idling)
✅ **Practice Mode**: Review flashcards without affecting SRS schedule

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Supabase Account** - for database and storage
3. **OpenAI API Key** - for AI-powered quiz and flashcard generation

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

**Getting your credentials:**

- **Supabase**: Sign up at [supabase.com](https://supabase.com), create a project, and find your URL and anon key in Project Settings > API
- **OpenAI**: Sign up at [platform.openai.com](https://platform.openai.com), create an API key in API Keys section

### 3. Set Up Supabase Database

Run the following SQL in your Supabase SQL Editor to create the required tables:

```sql
-- Presentations table
CREATE TABLE presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Slides table
CREATE TABLE slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID REFERENCES presentations(id) ON DELETE CASCADE,
  slide_number INTEGER NOT NULL,
  title TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flashcards table
CREATE TABLE flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  slide_id UUID REFERENCES slides(id) ON DELETE SET NULL,
  interval_days INTEGER DEFAULT 1,
  next_review TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_reviewed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Review sessions table
CREATE TABLE review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cards_reviewed INTEGER NOT NULL,
  time_spent INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quizzes table
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz questions table
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  options JSONB NOT NULL,
  source_id UUID,
  source_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz attempts table
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  answers JSONB NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_flashcards_next_review ON flashcards(next_review);
CREATE INDEX idx_flashcards_slide_id ON flashcards(slide_id);
CREATE INDEX idx_slides_presentation_id ON slides(presentation_id);
CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
```

### 4. Set Up Supabase Storage

1. Go to your Supabase project dashboard
2. Navigate to **Storage**
3. Create a new bucket called `presentations`
4. Set the bucket to **Public** (or configure appropriate RLS policies)

### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Usage Guide

### Uploading PowerPoint Files

1. Click "Upload Slides" on the dashboard
2. Select a `.pptx` file
3. Click "Upload & Parse"
4. The app will automatically parse slides and save them to the database
5. Select which slides to use for flashcard generation

### Generating Flashcards with AI

1. After uploading a presentation, select slides
2. Click "Generate Flashcards"
3. OpenAI will create 2-3 flashcards per slide
4. Review and edit the generated flashcards
5. Select which ones to save

### Generating Quizzes with AI

1. Go to "Generate Quiz"
2. Choose source: Flashcards or Slides
3. Select items to include
4. Set number of questions
5. Click "Generate Quiz"
6. OpenAI will create multiple-choice questions with plausible distractors

### Review System

- **Start Review**: Study cards that are due using spaced repetition
- **Practice Mode**: Review any flashcard set without affecting SRS schedule
- **Time Tracking**: Only tracks active study time (when you're actually reviewing cards)

## Key Features Explained

### PowerPoint Parsing

- Extracts text from `.pptx` files using JSZip
- Parses slide titles and content
- Stores in Supabase for easy retrieval

### AI-Powered Generation

- Uses OpenAI GPT-3.5 Turbo for content generation
- Generates contextually relevant flashcards
- Creates quiz questions with plausible distractors
- Prompts optimized for educational content

### Active Time Tracking

The review system now only tracks time when you're actively studying:
- Timer starts when a card is shown
- Timer pauses when viewing source slides
- Timer accumulates only active review time
- Excludes idle time between cards

### Spaced Repetition System (SRS)

- Simple SRS algorithm that doubles intervals on success
- "Again" button resets interval to 1 day
- "Good" button doubles the review interval
- Optimized for long-term retention

## API Costs

**OpenAI API Costs** (approximate):
- Flashcard generation: ~$0.002-0.005 per slide
- Quiz generation: ~$0.003-0.007 per quiz
- Uses GPT-3.5 Turbo for cost efficiency

Monitor your usage at [platform.openai.com/usage](https://platform.openai.com/usage)

## Troubleshooting

### "OpenAI API key not found"
- Make sure `VITE_OPENAI_API_KEY` is in your `.env` file
- Restart the dev server after adding environment variables

### "Failed to parse PowerPoint file"
- Ensure the file is a valid `.pptx` format (not `.ppt`)
- Some heavily formatted slides may not parse correctly

### Supabase errors
- Check that all tables are created correctly
- Verify your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Make sure the `presentations` storage bucket exists

### Build warnings about chunk size
- This is normal due to OpenAI SDK size
- Consider code-splitting if bundle size is a concern

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Tech Stack

- **Frontend**: React 18, React Router
- **Build Tool**: Vite
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **AI**: OpenAI GPT-3.5 Turbo
- **PPTX Parsing**: JSZip
- **Styling**: CSS (custom)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the Supabase and OpenAI documentation
3. Create an issue in the repository

## License

MIT
