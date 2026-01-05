import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import UploadSlides from './pages/UploadSlides';
import SlideSelection from './pages/SlideSelection';
import FlashcardList from './pages/FlashcardList';
import CreateFlashcard from './pages/CreateFlashcard';
import GenerateFlashcards from './pages/GenerateFlashcards';
import Review from './pages/Review';
import PracticeMode from './pages/PracticeMode';
import GenerateQuiz from './pages/GenerateQuiz';
import TakeQuiz from './pages/TakeQuiz';
import QuizResults from './pages/QuizResults';
import './styles/App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Slide Routes */}
          <Route path="/upload" element={<UploadSlides />} />
          <Route path="/slides/:presentationId" element={<SlideSelection />} />

          {/* Flashcard Routes */}
          <Route path="/flashcards" element={<FlashcardList />} />
          <Route path="/flashcards/create" element={<CreateFlashcard />} />
          <Route path="/flashcards/generate" element={<GenerateFlashcards />} />
          <Route path="/flashcards/practice" element={<PracticeMode />} />

          {/* Review Routes */}
          <Route path="/review" element={<Review />} />

          {/* Quiz Routes */}
          <Route path="/quiz/generate" element={<GenerateQuiz />} />
          <Route path="/quiz/:quizId" element={<TakeQuiz />} />
          <Route path="/quiz/:quizId/results/:attemptId" element={<QuizResults />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
