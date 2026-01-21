# Uniflash 🦄✨

A powerful, AI-enhanced flashcard application for medical students and healthcare professionals. Built with React, Vite, Supabase, and OpenAI.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rithviksunku/uniflash)

## ✨ Features

### 🎴 Smart Flashcard Creation
- **Interactive Editor** - Edit flashcards side-by-side with source documents
- **AI Generation** - Automatically create flashcards from PDFs and PowerPoints
- **AI Suggestions** - Get instant improvements with grammar and clarity
- **Manual Creation** - Full control with manual card creation
- **Source References** - Every card links back to its source material

### 📚 Document Management
- **PDF & PowerPoint Support** - Upload and parse both file types
- **Presentations Library** - Browse and reuse all uploaded documents
- **Persistent Storage** - Documents saved for future flashcard generation
- **Smart Parsing** - AI extracts key concepts and definitions

### 🧠 Study Tools
- **Spaced Repetition** - SM-2 algorithm for optimal review scheduling
- **Practice Mode** - Casual review without affecting SRS schedule
- **Flagged Cards** - Mark difficult cards and create targeted study sets
- **Flashcard Sets** - Organize by topic, chapter, or exam
- **Quiz Generation** - Auto-generate multiple-choice quizzes

### 🎯 Advanced Features
- **Password Protection** - Secure your study materials
- **Progress Tracking** - Monitor review performance
- **Mobile Responsive** - Study anywhere on any device
- **Beautiful UI** - Modern gradient design with smooth animations

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Supabase Account** - [Sign up free](https://supabase.com)
- **OpenAI API Key** - [Get your key](https://platform.openai.com/api-keys)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rithviksunku/uniflash.git
   cd uniflash
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run migrations in SQL Editor:
     - `DATABASE_SCHEMA.md` (base schema)
     - `DATABASE_MIGRATION.sql` (sets and features)
     - `ADD_FLAGGED_FLASHCARDS.sql` (flagging feature)
     - `FIX_RLS_POLICIES.sql` (permissions - CRITICAL!)
   - Create storage bucket named `presentations`

4. **Configure environment**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_OPENAI_API_KEY=your_openai_api_key
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   Open http://localhost:3000

### Default Login

**Password:** `unicorn_mara_poptart_1234!!`

> ⚠️ This is for demo/personal use. See [FLAGGED_CARDS_AND_AUTH_GUIDE.md](FLAGGED_CARDS_AND_AUTH_GUIDE.md) for production authentication setup.

## 📖 Documentation

### User Guides
- **[FINAL_IMPLEMENTATION_SUMMARY.md](FINAL_IMPLEMENTATION_SUMMARY.md)** - Complete overview of all features
- **[INTERACTIVE_EDITOR_GUIDE.md](INTERACTIVE_EDITOR_GUIDE.md)** - How to use the interactive flashcard editor
- **[FLAGGED_CARDS_AND_AUTH_GUIDE.md](FLAGGED_CARDS_AND_AUTH_GUIDE.md)** - Flagging cards and authentication

### Developer Guides
- **[VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md)** - Deploy to production (step-by-step)
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - Database structure and setup
- **[DATABASE_SETUP_QUICK_START.md](DATABASE_SETUP_QUICK_START.md)** - Quick database setup
- **[PDF_FIX_TESTING.md](PDF_FIX_TESTING.md)** - PDF parsing troubleshooting

### SQL Migrations
- **[DATABASE_MIGRATION.sql](DATABASE_MIGRATION.sql)** - Sets and advanced features
- **[ADD_FLAGGED_FLASHCARDS.sql](ADD_FLAGGED_FLASHCARDS.sql)** - Flagging system
- **[FIX_RLS_POLICIES.sql](FIX_RLS_POLICIES.sql)** - Row Level Security fixes (REQUIRED!)

## 🎯 Key Workflows

### Creating Flashcards from Documents

1. **Upload** - Go to "Upload Slides" and select PDF or PowerPoint
2. **Select** - Choose which slides/pages to use
3. **Generate** - Click "Generate Flashcards"
4. **Interactive Editor Opens:**
   - **Left panel:** View source document
   - **Right panel:** AI-generated flashcards
5. **Review & Edit:**
   - Check each card against source
   - Click 🤖 for AI suggestions
   - Edit questions and answers
   - Click slide references to see context
6. **Save** - Select cards to keep and save to database

### Studying with Spaced Repetition

1. **Review** - Go to "Review" mode
2. **Rate Cards** - Mark how well you knew each card
3. **Flag Difficult** - Use flag button on challenging cards
4. **Create Sets** - Make sets from flagged cards for extra practice
5. **Practice** - Use Practice Mode for casual review

### Document Reuse

1. **Library** - Go to "📚 Presentations"
2. **Browse** - See all uploaded documents
3. **Generate** - Click "View & Generate" on any document
4. **Create** - Make new flashcard sets from the same material

## 🏗️ Project Structure

```
uniflash/
├── src/
│   ├── components/          # Reusable components
│   │   └── Navigation.jsx   # Main navigation
│   ├── pages/               # Page components
│   │   ├── Dashboard.jsx
│   │   ├── UploadSlides.jsx
│   │   ├── PresentationsLibrary.jsx
│   │   ├── SlideSelection.jsx
│   │   ├── InteractiveFlashcardEditor.jsx  # NEW! Interactive editor
│   │   ├── FlashcardList.jsx
│   │   ├── FlashcardSets.jsx
│   │   ├── CreateFlashcard.jsx
│   │   ├── Review.jsx
│   │   ├── PracticeMode.jsx
│   │   ├── GenerateQuiz.jsx
│   │   ├── TakeQuiz.jsx
│   │   ├── QuizResults.jsx
│   │   └── Login.jsx
│   ├── services/            # API integrations
│   │   ├── supabase.js      # Supabase client
│   │   ├── openai.js        # OpenAI/AI services
│   │   ├── pdfParser.js     # PDF parsing
│   │   └── pptxParser.js    # PowerPoint parsing
│   ├── styles/              # CSS files
│   │   ├── App.css
│   │   ├── InteractiveEditor.css  # NEW! Editor styles
│   │   ├── Login.css
│   │   └── Navigation.css
│   ├── App.jsx              # Main app with routing
│   └── main.jsx             # Entry point
├── public/                  # Static assets
├── vercel.json              # Vercel deployment config
├── package.json             # Dependencies
└── vite.config.js           # Vite configuration
```

## 🛠️ Technologies

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing

### Backend & Services
- **Supabase** - Database, storage, and auth
- **OpenAI API** - AI flashcard generation and suggestions
- **PDF.js** - PDF parsing
- **PptxGenJS** - PowerPoint parsing

### Deployment
- **Vercel** - Hosting and continuous deployment
- **GitHub** - Version control and CI/CD

## 📱 Pages Overview

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Overview with quick actions |
| Upload Slides | `/upload` | Upload PDFs and PowerPoints |
| Presentations | `/presentations` | Browse document library |
| Slide Selection | `/slides/:id` | Select slides to use |
| **Interactive Editor** | `/flashcards/editor` | **NEW!** Edit with document context |
| My Flashcards | `/flashcards` | Manage all flashcards |
| Flashcard Sets | `/sets` | Organize by topic/exam |
| Create Flashcard | `/flashcards/create` | Manual creation |
| Review | `/review` | Spaced repetition mode |
| Practice | `/flashcards/practice` | Casual review mode |
| Generate Quiz | `/quiz/generate` | Create quizzes |
| Take Quiz | `/quiz/:id` | Answer quiz questions |
| Quiz Results | `/quiz/:id/results/:attemptId` | View scores |
| Quiz History | `/quiz/history` | Past quiz attempts |

## 🚀 Deployment to Vercel

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rithviksunku/uniflash)

### Option 2: Manual Deploy

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository

2. **Configure Environment Variables**
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   VITE_OPENAI_API_KEY=your_openai_key
   ```

3. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app is live! 🎉

See **[VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md)** for detailed instructions.

## 🐛 Troubleshooting

### PDF Worker Failed to Load

**Solution:**
1. Clear Vite cache: `rm -rf node_modules/.vite`
2. Restart dev server
3. See [PDF_FIX_TESTING.md](PDF_FIX_TESTING.md)

### RLS Policy Errors

**Error:** "new row violates row-level security policy"

**Solution:**
Run `FIX_RLS_POLICIES.sql` in Supabase SQL Editor (CRITICAL!)

### Environment Variables Not Working

**Solution:**
- Verify names start with `VITE_`
- Check spelling matches exactly
- Restart dev server after changes

## 📊 Database Schema

### Main Tables

- **presentations** - Uploaded documents
- **slides** - Parsed slide/page content
- **flashcards** - Study cards (manual + AI-generated)
- **flashcard_sets** - Organization by topic
- **quizzes** - Generated quizzes
- **quiz_questions** - Quiz Q&A
- **quiz_attempts** - Score tracking
- **review_sessions** - Study statistics

See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for complete schema.

## 🎨 Features Highlight

### Interactive Flashcard Editor

The crown jewel of Uniflash - a split-panel interface that revolutionizes flashcard creation:

```
┌───────────────────────────────────────────┐
│  📄 Document          │  🎴 Flashcards    │
│                      │                   │
│  • View all slides   │  • Edit cards     │
│  • Click to jump     │  • AI suggestions │
│  • Add cards         │  • Select/Delete  │
│  • See context       │  • Save selected  │
└───────────────────────────────────────────┘
```

**Why it's amazing:**
- ✨ See source while editing
- 🎯 Verify accuracy instantly
- 🤖 AI helps improve quality
- 📚 Add context from document
- 🔗 Maintain source references

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with [React](https://react.dev/)
- Powered by [Supabase](https://supabase.com)
- AI by [OpenAI](https://openai.com)
- Deployed on [Vercel](https://vercel.com)

## 📞 Support

- **Documentation:** See guides in repository root
- **Issues:** [GitHub Issues](https://github.com/rithviksunku/uniflash/issues)
- **Deployment:** See [VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md)

---

**Made with ❤️ for medical students and healthcare professionals**

**Ready to deploy?** See [VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md)

**Ready to study?** Start at http://localhost:3000
