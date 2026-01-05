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
    // Fetch unique slide sources as "sets"
    const { data, error } = await supabase
      .from('flashcards')
      .select(`
        slides (
          id,
          title,
          presentation_id,
          presentations (
            title
          )
        )
      `)
      .not('slide_id', 'is', null);

    if (!error && data) {
      // Group by presentation
      const presentations = new Map();
      data.forEach(item => {
        if (item.slides?.presentations) {
          const presId = item.slides.presentation_id;
          if (!presentations.has(presId)) {
            presentations.set(presId, {
              id: presId,
              title: item.slides.presentations.title,
            });
          }
        }
      });
      setFlashcardSets([
        { id: 'all', title: 'All Flashcards' },
        ...Array.from(presentations.values())
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
      .select(`
        *,
        slides!inner (
          presentation_id
        )
      `)
      .eq('slides.presentation_id', setId);

    if (!error) {
      setCards(data);
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
                {set.title}
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

      <div className="practice-card">
        <div className="card-front">
          <div className="card-label">Question:</div>
          <div className="card-text">{currentCard.front}</div>
        </div>

        {showAnswer && (
          <div className="card-back">
            <div className="card-label">Answer:</div>
            <div className="card-text">{currentCard.back}</div>
          </div>
        )}

        <div className="practice-actions">
          {!showAnswer ? (
            <button
              className="btn-primary btn-large"
              onClick={() => setShowAnswer(true)}
            >
              Show Answer
            </button>
          ) : (
            <div className="navigation-buttons">
              <button
                className="btn-secondary"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                ← Previous
              </button>
              <button
                className="btn-primary"
                onClick={handleNext}
              >
                {currentIndex === cards.length - 1 ? 'Finish' : 'Next →'}
              </button>
            </div>
          )}
        </div>

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
