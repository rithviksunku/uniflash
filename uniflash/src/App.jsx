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
  const [navCollapsed, setNavCollapsed] = useState(() => {
    return localStorage.getItem('navCollapsed') === 'true';
  });
  const [forceMobileView, setForceMobileView] = useState(() => {
    return localStorage.getItem('forceMobileView') === 'true';
  });
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    // Check if user is already authenticated via session
    const authStatus = sessionStorage.getItem('isAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    } else {
      // Check for "Remember me" authentication
      const rememberAuth = localStorage.getItem('rememberAuth');
      if (rememberAuth) {
        try {
          const { authenticated, expires } = JSON.parse(rememberAuth);
          const expirationDate = new Date(expires);
          const now = new Date();

          if (authenticated && expirationDate > now) {
            // Valid remembered auth - restore session
            sessionStorage.setItem('isAuthenticated', 'true');
            setIsAuthenticated(true);
          } else {
            // Expired - clear the remembered auth
            localStorage.removeItem('rememberAuth');
          }
        } catch (e) {
          // Invalid data - clear it
          localStorage.removeItem('rememberAuth');
        }
      }
    }

    // Listen for nav toggle events
    const handleNavToggle = (e) => {
      setNavCollapsed(e.detail.collapsed);
    };
    window.addEventListener('navToggle', handleNavToggle);

    // Listen for view mode changes
    const handleViewModeChange = (e) => {
      setForceMobileView(e.detail.mobile);
    };
    window.addEventListener('viewModeChange', handleViewModeChange);

    // Listen for dark mode changes
    const handleDarkModeChange = (e) => {
      setDarkMode(e.detail.darkMode);
    };
    window.addEventListener('darkModeChange', handleDarkModeChange);

    return () => {
      window.removeEventListener('navToggle', handleNavToggle);
      window.removeEventListener('viewModeChange', handleViewModeChange);
      window.removeEventListener('darkModeChange', handleDarkModeChange);
    };
  }, []);

  const handleLogin = (status) => {
    setIsAuthenticated(status);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    localStorage.removeItem('rememberAuth');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const toggleMobileView = () => {
    const newValue = !forceMobileView;
    setForceMobileView(newValue);
    localStorage.setItem('forceMobileView', newValue.toString());
  };

  return (
    <Router>
      <div className={`App ${navCollapsed ? 'nav-collapsed' : ''} ${forceMobileView ? 'force-mobile' : ''} ${darkMode ? 'dark-mode' : ''}`}>
        <button
          className="mobile-view-toggle"
          onClick={toggleMobileView}
          title={forceMobileView ? 'Switch to Desktop View' : 'Switch to Mobile View (bottom navigation)'}
        >
          {forceMobileView ? '🖥️' : '📱'}
        </button>
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
            <Route path="/flashcards/edit/:cardId" element={<CreateFlashcard />} />
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
