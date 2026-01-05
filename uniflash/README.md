# Uniflash 🦄

A beautiful, unicorn-themed flashcard and quiz application built with React, Vite, and Supabase.

## Features

- 📤 Upload PowerPoint presentations and extract slides
- 🎴 Create and manage flashcards (manual and auto-generated)
- 🔥 Spaced repetition review system
- 📖 Practice mode for casual review
- 🎯 Generate and take multiple-choice quizzes
- 📊 Track your learning progress
- 🦄 Beautiful unicorn-themed UI

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account (free tier works)

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd uniflash
```

2. Install dependencies
```bash
npm install
```

3. Set up Supabase
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL from `DATABASE_SCHEMA.md` in the SQL Editor
   - Create a storage bucket named `presentations`
   - Copy your project URL and anon key

4. Create environment file
```bash
cp .env.example .env
```

5. Add your Supabase credentials to `.env`
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

```bash
npm run dev
```

The app will open at http://localhost:3000

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
uniflash/
├── public/              # Static assets
├── src/
│   ├── assets/         # Images, fonts, etc.
│   ├── components/     # Reusable React components
│   ├── contexts/       # React Context providers
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Page components
│   ├── services/       # API services and external integrations
│   ├── styles/         # CSS files
│   ├── utils/          # Utility functions
│   ├── App.jsx         # Main App component
│   └── main.jsx        # Entry point
├── index.html          # HTML template
├── package.json        # Dependencies and scripts
└── vite.config.js      # Vite configuration
```

## Technologies

- React 18
- Vite
- React Router
- Supabase (Database & Storage)
- ESLint

## Pages

- **Dashboard** - Overview with stats and quick actions
- **Upload Slides** - Upload PowerPoint presentations
- **Slide Selection** - Select slides for flashcard generation
- **Flashcard List** - View, edit, and delete flashcards
- **Create Flashcard** - Manually create flashcards
- **Generate Flashcards** - Auto-generate from slides
- **Review** - Spaced repetition review mode
- **Practice Mode** - Casual review without SRS
- **Generate Quiz** - Create quizzes from flashcards or slides
- **Take Quiz** - Answer quiz questions
- **Quiz Results** - View scores and create flashcards from missed questions

## Database Schema

See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for complete database setup instructions.

## Development Notes

- All styling is done with vanilla CSS using CSS custom properties
- The app uses a purple/pink gradient unicorn theme
- Supabase handles authentication, database, and file storage
- PowerPoint parsing will need to be implemented (currently placeholder)
