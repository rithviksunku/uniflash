import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UploadSlides from './pages/UploadSlides';
import PresentationsLibrary from './pages/PresentationsLibrary';
import SlideSelection from './pages/SlideSelection';
import FlashcardSets from './pages/FlashcardSets';
import FlashcardList from './pages/FlashcardList';
import CreateFlashcard from './pages/CreateFlashcard';
import GenerateFlashcards from './pages/GenerateFlashcards';
import InteractiveFlashcardEditor from './pages/InteractiveFlashcardEditor';
import SlideFlashcardCreator from './pages/SlideFlashcardCreator';
import Review from './pages/Review';
import PracticeMode from './pages/PracticeMode';
import GenerateQuiz from './pages/GenerateQuiz';
import TakeQuiz from './pages/TakeQuiz';
import QuizResults from './pages/QuizResults';
import QuizHistory from './pages/QuizHistory';
import Help from './pages/Help';
import Settings from './pages/Settings';
import './styles/App.css';
import './styles/InteractiveEditor.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    const authStatus = sessionStorage.getItem('isAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (status) => {
    setIsAuthenticated(status);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="App">
        <Navigation onLogout={handleLogout} />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Slide Routes */}
            <Route path="/upload" element={<UploadSlides />} />
            <Route path="/presentations" element={<PresentationsLibrary />} />
            <Route path="/slides/:presentationId" element={<SlideSelection />} />

            {/* Flashcard Routes */}
            <Route path="/sets" element={<FlashcardSets />} />
            <Route path="/flashcards" element={<FlashcardList />} />
            <Route path="/flashcards/create" element={<CreateFlashcard />} />
            <Route path="/flashcards/generate" element={<GenerateFlashcards />} />
            <Route path="/flashcards/editor" element={<InteractiveFlashcardEditor />} />
            <Route path="/flashcards/from-slides" element={<SlideFlashcardCreator />} />
            <Route path="/flashcards/practice" element={<PracticeMode />} />

            {/* Review Routes */}
            <Route path="/review" element={<Review />} />

            {/* Quiz Routes */}
            <Route path="/quiz/generate" element={<GenerateQuiz />} />
            <Route path="/quiz/history" element={<QuizHistory />} />
            <Route path="/quiz/:quizId" element={<TakeQuiz />} />
            <Route path="/quiz/:quizId/results/:attemptId" element={<QuizResults />} />

            {/* Help Route */}
            <Route path="/help" element={<Help />} />

            {/* Settings Route */}
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
