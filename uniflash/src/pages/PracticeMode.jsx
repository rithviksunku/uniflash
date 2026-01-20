import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const PracticeMode = () => {
  const navigate = useNavigate();
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState('all');
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isPracticing, setIsPracticing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlashcardSets();
    fetchAllCards();
  }, []);

  const fetchFlashcardSets = async () => {
    const { data, error } = await supabase
      .from('flashcard_sets')
      .select('*')
      .order('name');

    if (!error) {
      setFlashcardSets([
        { id: 'all', name: 'All Flashcards', icon: '📚' },
        ...(data || [])
      ]);
    }
    setLoading(false);
  };

  const fetchAllCards = async () => {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setCards(data);
    }
  };

  const fetchCardsBySet = async (setId) => {
    if (setId === 'all') {
      fetchAllCards();
      return;
    }

    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('set_id', setId)
      .order('created_at', { ascending: false });

    if (!error) {
      setCards(data || []);
    }
  };

  const handleSetChange = (setId) => {
    setSelectedSet(setId);
    fetchCardsBySet(setId);
    setIsPracticing(false);
    setCurrentIndex(0);
    setShowAnswer(false);
  };

  const handleStartPractice = () => {
    if (cards.length > 0) {
      setIsPracticing(true);
      setCurrentIndex(0);
      setShowAnswer(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      setIsPracticing(false);
      setCurrentIndex(0);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswer(false);
    }
  };

  const toggleFlag = async (cardId, currentFlagStatus) => {
    const { error } = await supabase
      .from('flashcards')
      .update({ is_flagged: !currentFlagStatus })
      .eq('id', cardId);

    if (!error) {
      // Update local state
      setCards(cards.map(card =>
        card.id === cardId
          ? { ...card, is_flagged: !currentFlagStatus }
          : card
      ));
    }
  };

  // Keyboard shortcuts for practice mode
  useEffect(() => {
    if (!isPracticing) return;

    const handleKeyPress = (e) => {
      // Prevent default for spacebar to avoid page scroll
      if (e.key === ' ') {
        e.preventDefault();
        if (!showAnswer) {
          setShowAnswer(true);
        }
      }

      // Arrow keys for navigation
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPracticing, showAnswer, currentIndex, cards.length]);

  if (loading) {
    return <div className="loading">Loading flashcards...</div>;
  }

  if (!isPracticing) {
    return (
      <div className="practice-mode">
        <div className="practice-header">
          <h1>📖 Practice Mode</h1>
          <p>Review flashcards without spaced repetition</p>
        </div>

        <div className="set-selection">
          <label htmlFor="set-select">Select a set:</label>
          <select
            id="set-select"
            value={selectedSet}
            onChange={(e) => handleSetChange(e.target.value)}
            className="set-selector"
          >
            {flashcardSets.map(set => (
              <option key={set.id} value={set.id}>
                {set.icon} {set.name}
              </option>
            ))}
          </select>
        </div>

        <div className="practice-info">
          <div className="info-card">
            <div className="info-number">{cards.length}</div>
            <div className="info-label">Cards in this set</div>
          </div>
        </div>

        {cards.length === 0 ? (
          <div className="empty-state">
            <p>No flashcards in this set yet.</p>
            <button
              className="btn-primary"
              onClick={() => navigate('/flashcards/create')}
            >
              Create Flashcards
            </button>
          </div>
        ) : (
          <button
            className="btn-primary btn-large"
            onClick={handleStartPractice}
          >
            Start Practice
          </button>
        )}

        <button
          className="btn-secondary"
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="practice-session">
      <div className="practice-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-text">
          {currentIndex + 1} / {cards.length}
        </div>
      </div>

      <div className="practice-card-container">
        <div className="practice-card-large" onClick={() => !showAnswer && setShowAnswer(true)}>
          <div className="card-front-practice">
            <div className="card-label-practice">Question</div>
            <div className="card-text-practice">{currentCard.front}</div>
          </div>

          {showAnswer && (
            <div className="card-back-practice">
              <div className="divider-practice">•••</div>
              <div className="card-label-practice">Answer</div>
              <div className="card-text-practice">{currentCard.back}</div>
            </div>
          )}

          {!showAnswer && (
            <div className="tap-hint">
              👆 Tap anywhere or press <kbd>Space</kbd> to reveal answer
            </div>
          )}
        </div>

        <button
          className={`flag-btn ${currentCard.is_flagged ? 'flagged' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleFlag(currentCard.id, currentCard.is_flagged);
          }}
          title={currentCard.is_flagged ? 'Unflag this card' : 'Flag as difficult'}
        >
          {currentCard.is_flagged ? '🚩 Flagged' : '🏳️ Flag'}
        </button>
      </div>

      <div className="practice-controls">
        {showAnswer && (
          <>
            <div className="keyboard-hints-practice">
              <span>←  Previous</span>
              <span>→  Next</span>
            </div>
            <div className="navigation-buttons-large">
              <button
                className="btn-nav btn-prev"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                ← Previous Card
              </button>
              <button
                className="btn-nav btn-next"
                onClick={handleNext}
              >
                {currentIndex === cards.length - 1 ? '✓ Finish Practice' : 'Next Card →'}
              </button>
            </div>
          </>
        )}

        <button
          className="btn-text"
          onClick={() => setIsPracticing(false)}
        >
          Exit Practice
        </button>
      </div>
    </div>
  );
};

export default PracticeMode;
