import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';

const Review = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTime, setActiveTime] = useState(0); // Total active time in milliseconds
  const [cardStartTime, setCardStartTime] = useState(null); // When current card was shown
  const [reviewedCount, setReviewedCount] = useState(0);
  const [showSlide, setShowSlide] = useState(false);
  const [slideContent, setSlideContent] = useState(null);
  const [sets, setSets] = useState([]);
  const [selectedSets, setSelectedSets] = useState([]);
  const [showSetSelector, setShowSetSelector] = useState(false);

  useEffect(() => {
    fetchSets();
    fetchDueCards();
    const setParam = searchParams.get('set');
    const setsParam = searchParams.get('sets');

    if (setsParam) {
      // Handle multiple sets (comma-separated)
      setSelectedSets(setsParam.split(','));
    } else if (setParam) {
      // Handle single set
      setSelectedSets([setParam]);
    }
  }, []);

  useEffect(() => {
    fetchDueCards();
  }, [selectedSets]);

  // Start timing when a card is first shown or when returning from slide view
  useEffect(() => {
    if (!loading && cards.length > 0 && !showSlide) {
      setCardStartTime(Date.now());
    }
  }, [currentIndex, loading, cards, showSlide]);

  // Keyboard shortcuts for Anki-style rating
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only respond to shortcuts when answer is shown and not in a slide view
      if (!showAnswer || showSlide) return;

      switch(e.key) {
        case '1':
          handleRating('again');
          break;
        case '2':
          handleRating('hard');
          break;
        case '3':
          handleRating('good');
          break;
        case '4':
          handleRating('easy');
          break;
        case ' ':
          // Spacebar shows answer
          if (!showAnswer) {
            e.preventDefault();
            setShowAnswer(true);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showAnswer, showSlide, cards, currentIndex]);

  const fetchSets = async () => {
    const { data, error } = await supabase
      .from('flashcard_sets')
      .select('*')
      .order('name');

    if (!error) {
      setSets(data || []);
    }
  };

  const fetchDueCards = async () => {
    let query = supabase
      .from('flashcards')
      .select(`
        *,
        slides (
          title,
          content,
          slide_number
        ),
        flashcard_sets (
          name,
          color,
          icon
        )
      `)
      .lte('next_review', new Date().toISOString());

    // Filter by selected sets if any
    if (selectedSets.length > 0) {
      query = query.in('set_id', selectedSets);
    }

    const { data, error } = await query.order('next_review');

    if (!error && data) {
      setCards(data);
    }
    setLoading(false);
  };

  const toggleSetSelection = (setId) => {
    if (selectedSets.includes(setId)) {
      setSelectedSets(selectedSets.filter(id => id !== setId));
    } else {
      setSelectedSets([...selectedSets, setId]);
    }
  };

  const handleRating = async (rating) => {
    // Add time spent on this card to active time
    if (cardStartTime) {
      const timeOnCard = Date.now() - cardStartTime;
      setActiveTime(activeTime + timeOnCard);
    }

    const currentCard = cards[currentIndex];
    const currentInterval = currentCard.interval_days || 1;
    let newInterval;

    // Anki-style spaced repetition algorithm
    switch (rating) {
      case 'again':
        // Reset to 1 day - card was forgotten
        newInterval = 1;
        break;
      case 'hard':
        // Increase interval by 1.2x - card was difficult
        newInterval = Math.max(1, Math.round(currentInterval * 1.2));
        break;
      case 'good':
        // Increase interval by 2.5x - standard progression
        newInterval = Math.max(1, Math.round(currentInterval * 2.5));
        break;
      case 'easy':
        // Increase interval by 4x - card was very easy
        newInterval = Math.max(1, Math.round(currentInterval * 4));
        break;
      default:
        newInterval = currentInterval;
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + newInterval);

    await supabase
      .from('flashcards')
      .update({
        interval_days: newInterval,
        next_review: nextReview.toISOString(),
        last_reviewed: new Date().toISOString(),
      })
      .eq('id', currentCard.id);

    setReviewedCount(reviewedCount + 1);

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
      setShowSlide(false);
    } else {
      finishReview();
    }
  };

  const handleDontUnderstand = () => {
    const currentCard = cards[currentIndex];
    if (currentCard.slides) {
      setSlideContent(currentCard.slides);
      setShowSlide(true);
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

  const finishReview = async () => {
    // Add time spent on the last card
    let finalActiveTime = activeTime;
    if (cardStartTime) {
      const timeOnLastCard = Date.now() - cardStartTime;
      finalActiveTime += timeOnLastCard;
    }

    // Convert to seconds
    const timeSpent = Math.round(finalActiveTime / 1000);

    await supabase
      .from('review_sessions')
      .insert([
        {
          cards_reviewed: reviewedCount + 1,
          time_spent: timeSpent,
          created_at: new Date().toISOString(),
        }
      ]);

    navigate('/dashboard');
  };

  if (loading) {
    return <div className="loading">Loading review cards...</div>;
  }

  if (cards.length === 0) {
    return (
      <div className="review-empty">
        <h2>🎉 All caught up!</h2>
        <p>No cards due for review right now.</p>
        <button className="btn-primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  const getSelectedSetNames = () => {
    return sets
      .filter(set => selectedSets.includes(set.id))
      .map(set => `${set.icon} ${set.name}`)
      .join(', ');
  };

  return (
    <div className="review">
      <div className="review-header">
        <div className="review-info">
          <div className="review-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-text">
              {currentIndex + 1} / {cards.length}
            </div>
          </div>
          {selectedSets.length > 0 && (
            <div className="studying-sets">
              <strong>Studying:</strong> {getSelectedSetNames()}
            </div>
          )}
        </div>
        <button
          className="btn-secondary"
          onClick={() => setShowSetSelector(!showSetSelector)}
        >
          📚 Filter Sets {selectedSets.length > 0 && `(${selectedSets.length})`}
        </button>
      </div>

      {showSetSelector && (
        <div className="set-selector">
          <h3>Select Sets to Review:</h3>
          <div className="set-filter-list">
            {sets.map(set => (
              <div
                key={set.id}
                className={`set-filter-item ${selectedSets.includes(set.id) ? 'selected' : ''}`}
                onClick={() => toggleSetSelection(set.id)}
                style={{ borderLeft: `4px solid ${set.color}` }}
              >
                <input
                  type="checkbox"
                  checked={selectedSets.includes(set.id)}
                  onChange={() => {}}
                />
                <span className="set-icon">{set.icon}</span>
                <span className="set-name">{set.name}</span>
              </div>
            ))}
          </div>
          {selectedSets.length > 0 && (
            <button
              className="btn-text"
              onClick={() => setSelectedSets([])}
            >
              Clear All
            </button>
          )}
        </div>
      )}

      {showSlide && slideContent ? (
        <div className="slide-overlay">
          <div className="slide-modal">
            <h3>📄 Source Slide: {slideContent.title}</h3>
            <div className="slide-number">Slide {slideContent.slide_number}</div>
            <div className="slide-text">{slideContent.content}</div>
            <button
              className="btn-primary"
              onClick={() => setShowSlide(false)}
            >
              Back to Card
            </button>
          </div>
        </div>
      ) : (
        <div className="review-card-container">
          <div className="review-card">
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

            <div className="review-actions">
              {!showAnswer ? (
                <button
                  className="btn-primary btn-large"
                  onClick={() => setShowAnswer(true)}
                >
                  Show Answer
                </button>
              ) : (
                <>
                  <div className="rating-buttons-anki">
                    <button
                      className="btn-rating btn-again"
                      onClick={() => handleRating('again')}
                    >
                      <span className="keyboard-hint">1</span>
                      <span className="rating-label">Again</span>
                      <span className="rating-time">1 day</span>
                    </button>
                    <button
                      className="btn-rating btn-hard"
                      onClick={() => handleRating('hard')}
                    >
                      <span className="keyboard-hint">2</span>
                      <span className="rating-label">Hard</span>
                      <span className="rating-time">{Math.max(1, Math.round((currentCard.interval_days || 1) * 1.2))} days</span>
                    </button>
                    <button
                      className="btn-rating btn-good"
                      onClick={() => handleRating('good')}
                    >
                      <span className="keyboard-hint">3</span>
                      <span className="rating-label">Good</span>
                      <span className="rating-time">{Math.max(1, Math.round((currentCard.interval_days || 1) * 2.5))} days</span>
                    </button>
                    <button
                      className="btn-rating btn-easy"
                      onClick={() => handleRating('easy')}
                    >
                      <span className="keyboard-hint">4</span>
                      <span className="rating-label">Easy</span>
                      <span className="rating-time">{Math.max(1, Math.round((currentCard.interval_days || 1) * 4))} days</span>
                    </button>
                  </div>
                  <div className="secondary-actions">
                    <button
                      className={`flag-btn ${currentCard.is_flagged ? 'flagged' : ''}`}
                      onClick={() => toggleFlag(currentCard.id, currentCard.is_flagged)}
                      title={currentCard.is_flagged ? 'Unflag this card' : 'Flag as difficult'}
                    >
                      {currentCard.is_flagged ? '🚩 Flagged' : '🏳️ Flag as Difficult'}
                    </button>
                    {currentCard.slides && (
                      <button
                        className="btn-secondary"
                        onClick={handleDontUnderstand}
                      >
                        📄 Don't Understand - View Source Slide
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Review;
