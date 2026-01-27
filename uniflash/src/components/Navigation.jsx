import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/Navigation.css';

const Navigation = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="navigation">
      <div className="nav-header">
        <h2 className="nav-logo" onClick={() => navigate('/dashboard')}>
          ✨ Uniflash
        </h2>
        <p className="nav-tagline">Learn Smarter, Study Better</p>
      </div>

      <div className="nav-section">
        <h3 className="nav-section-title">Study</h3>
        <button
          className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
          onClick={() => navigate('/dashboard')}
        >
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Dashboard</span>
        </button>
        <button
          className={`nav-item ${isActive('/review') ? 'active' : ''}`}
          onClick={() => navigate('/review')}
        >
          <span className="nav-icon">🔥</span>
          <span className="nav-label">Review Cards</span>
        </button>
        <button
          className={`nav-item ${isActive('/flashcards/practice') ? 'active' : ''}`}
          onClick={() => navigate('/flashcards/practice')}
        >
          <span className="nav-icon">📖</span>
          <span className="nav-label">Practice Mode</span>
        </button>
        <button
          className={`nav-item ${isActive('/quiz/generate') ? 'active' : ''}`}
          onClick={() => navigate('/quiz/generate')}
        >
          <span className="nav-icon">🎯</span>
          <span className="nav-label">Take Quiz</span>
        </button>
      </div>

      <div className="nav-section">
        <h3 className="nav-section-title">Content</h3>
        <button
          className={`nav-item ${isActive('/upload') ? 'active' : ''}`}
          onClick={() => navigate('/upload')}
        >
          <span className="nav-icon">📤</span>
          <span className="nav-label">Upload Files</span>
        </button>
        <button
          className={`nav-item ${isActive('/flashcards') ? 'active' : ''}`}
          onClick={() => navigate('/flashcards')}
        >
          <span className="nav-icon">📋</span>
          <span className="nav-label">My Flashcards</span>
        </button>
        <button
          className={`nav-item ${isActive('/flashcards/create') ? 'active' : ''}`}
          onClick={() => navigate('/flashcards/create')}
        >
          <span className="nav-icon">➕</span>
          <span className="nav-label">Create Cards</span>
        </button>
      </div>

      <div className="nav-footer">
        <button
          className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
          onClick={() => navigate('/settings')}
        >
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">Settings</span>
        </button>
        <button
          className={`nav-item nav-help-btn ${isActive('/help') ? 'active' : ''}`}
          onClick={() => navigate('/help')}
        >
          <span className="nav-icon">❓</span>
          <span className="nav-label">Help & Guide</span>
        </button>
        <button
          className="nav-item nav-logout-btn"
          onClick={onLogout}
        >
          <span className="nav-icon">🚪</span>
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
