import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const PracticeMode = () => {
  const navigate = useNavigate();
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [selectedSets, setSelectedSets] = useState([]);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isPracticing, setIsPracticing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reverseMode, setReverseMode] = useState(false); // Review back-to-front
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(() => {
    return localStorage.getItem('showKeyboardHints') !== 'false';
  });

  useEffect(() => {
    fetchFlashcardSets();
    fetchAllCards();
  }, []);

  useEffect(() => {
    fetchCardsBySelectedSets();
  }, [selectedSets]);

  const fetchFlashcardSets = async () => {
    const { data, error } = await supabase
      .from('flashcard_set_stats')
      .select('*')
      .order('name');

    if (!error) {
      setFlashcardSets(data || []);
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

  const fetchCardsBySelectedSets = async () => {
    if (selectedSets.length === 0) {
      // If no sets selected, show all cards
      fetchAllCards();
      return;
    }

    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .in('set_id', selectedSets)
      .order('created_at', { ascending: false });

    if (!error) {
      setCards(data || []);
    }
  };

  const toggleSetSelection = (setId) => {
    if (selectedSets.includes(setId)) {
      setSelectedSets(selectedSets.filter(id => id !== setId));
    } else {
      setSelectedSets([...selectedSets, setId]);
    }
  };

  const selectAllSets = () => {
    setSelectedSets(flashcardSets.map(set => set.id));
  };

  const clearAllSets = () => {
    setSelectedSets([]);
  };

  // Fisher-Yates shuffle algorithm
  const shuffleCards = (cardsToShuffle) => {
    const shuffledCards = [...cardsToShuffle];
    for (let i = shuffledCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
    }
    return shuffledCards;
  };

  const handleStartPractice = () => {
    if (cards.length > 0) {
      // Shuffle cards if enabled
      if (shuffleEnabled) {
        setCards(shuffleCards(cards));
      }
      setIsPracticing(true);
      setCurrentIndex(0);
      setShowAnswer(false);
    }
  };

  const handleShuffleNow = () => {
    setCards(shuffleCards(cards));
    setCurrentIndex(0);
    setShowAnswer(false);
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

      // F key to flag card
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFlag(currentCard.id, currentCard.is_flagged);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPracticing, showAnswer, currentIndex, cards]);

  if (loading) {
    return <div className="loading">Loading flashcards...</div>;
  }

  if (!isPracticing) {
    return (
      <div className="practice-mode">
        <div className="practice-header">
          <h1>📖 Practice Mode</h1>
          <p>Review flashcards without spaced repetition - select one or more sets to practice</p>
        </div>

        <div className="set-selection-multi">
          <div className="set-selection-header">
            <h3>Select Sets to Practice:</h3>
            <div className="set-selection-actions">
              <button className="btn-text" onClick={selectAllSets}>
                Select All
              </button>
              <button className="btn-text" onClick={clearAllSets}>
                Clear All
              </button>
            </div>
          </div>

          {flashcardSets.length === 0 ? (
            <div className="empty-state-small">
              <p>No flashcard sets yet. Create sets to organize your flashcards!</p>
            </div>
          ) : (
            <div className="sets-grid-practice">
              {flashcardSets.map(set => (
                <div
                  key={set.id}
                  className={`set-card-practice ${selectedSets.includes(set.id) ? 'selected' : ''}`}
                  onClick={() => toggleSetSelection(set.id)}
                  style={{ borderLeft: `4px solid ${set.color}` }}
                >
                  <input
                    type="checkbox"
                    checked={selectedSets.includes(set.id)}
                    onChange={() => {}}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="set-info-practice">
                    <span className="set-icon-practice">{set.icon}</span>
                    <div className="set-details-practice">
                      <div className="set-name-practice">{set.name}</div>
                      <div className="set-count-practice">{set.total_cards || 0} cards</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="practice-info">
          <div className="info-card">
            <div className="info-number">{cards.length}</div>
            <div className="info-label">
              {selectedSets.length === 0 ? 'Total cards (all sets)' :
               selectedSets.length === 1 ? 'Cards in selected set' :
               `Cards in ${selectedSets.length} selected sets`}
            </div>
          </div>
        </div>

        <div className="practice-options">
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={reverseMode}
              onChange={(e) => setReverseMode(e.target.checked)}
            />
            <span className="toggle-label">🔄 Reverse Mode (Answer → Question)</span>
          </label>
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={shuffleEnabled}
              onChange={(e) => setShuffleEnabled(e.target.checked)}
            />
            <span className="toggle-label">🔀 Shuffle Cards</span>
          </label>
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
      {/* Floating Keyboard Shortcuts Legend */}
      {showShortcuts && (
        <div className="shortcuts-legend-float">
          <div className="shortcuts-legend-header">
            <span>⌨️ Shortcuts</span>
            <button className="btn-close-legend" onClick={() => setShowShortcuts(false)}>×</button>
          </div>
          <div className="shortcuts-legend-items">
            <div className="shortcut-legend-item">
              <kbd>Space</kbd>
              <span>Show answer</span>
            </div>
            <div className="shortcut-legend-item">
              <kbd>←</kbd>
              <span>Previous</span>
            </div>
            <div className="shortcut-legend-item">
              <kbd>→</kbd>
              <span>Next</span>
            </div>
            <div className="shortcut-legend-item">
              <kbd>F</kbd>
              <span>Flag card</span>
            </div>
          </div>
        </div>
      )}

      {!showShortcuts && (
        <button className="btn-show-shortcuts" onClick={() => setShowShortcuts(true)} title="Show keyboard shortcuts">
          ⌨️
        </button>
      )}

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
            <div className="card-label-practice">{reverseMode ? 'Answer' : 'Question'}</div>
            <div className="card-text-practice">{reverseMode ? currentCard.back : currentCard.front}</div>
          </div>

          {showAnswer && (
            <div className="card-back-practice">
              <div className="divider-practice">•••</div>
              <div className="card-label-practice">{reverseMode ? 'Question' : 'Answer'}</div>
              <div className="card-text-practice">{reverseMode ? currentCard.front : currentCard.back}</div>
            </div>
          )}

          {!showAnswer && (
            <div className="tap-hint">
              👆 Tap anywhere or press <kbd>Space</kbd> to reveal {reverseMode ? 'question' : 'answer'}
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

        <div className="practice-extra-controls">
          <button
            className="btn-secondary btn-sm"
            onClick={handleShuffleNow}
            title="Shuffle remaining cards"
          >
            🔀 Shuffle
          </button>
          <button
            className="btn-text"
            onClick={() => setIsPracticing(false)}
          >
            Exit Practice
          </button>
        </div>
      </div>
    </div>
  );
};

export default PracticeMode;
