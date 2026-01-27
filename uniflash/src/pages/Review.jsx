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
  const [reverseMode, setReverseMode] = useState(false); // Review back-to-front
  const [showSettings, setShowSettings] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [autoShuffle, setAutoShuffle] = useState(() => {
    return localStorage.getItem('autoShuffleReview') === 'true';
  });
  const [showCelebration, setShowCelebration] = useState(false);
  const [streakData, setStreakData] = useState({ currentStreak: 0 });
  const [showShortcuts, setShowShortcuts] = useState(() => {
    return localStorage.getItem('showKeyboardHints') !== 'false';
  });

  // Customizable spaced repetition settings
  const [intervalSettings, setIntervalSettings] = useState(() => {
    const saved = localStorage.getItem('srsIntervalSettings');
    return saved ? JSON.parse(saved) : {
      again: { value: 1, unit: 'minutes' },     // 1 minute
      hard: { value: 6, unit: 'minutes' },      // 6 minutes
      good: { value: 10, unit: 'minutes' },     // 10 minutes
      easy: { value: 4, unit: 'days' },         // 4 days
      maxDays: 365                               // Maximum interval cap
    };
  });

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
      // Ignore if in slide view
      if (showSlide) return;

      // Spacebar shows answer (works whether answer is shown or not)
      if (e.key === ' ') {
        e.preventDefault();
        if (!showAnswer) {
          setShowAnswer(true);
        }
        return;
      }

      // Rating shortcuts only work when answer is shown
      if (!showAnswer) return;

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
        case 'f':
        case 'F':
          e.preventDefault();
          if (cards[currentIndex]) {
            toggleFlag(cards[currentIndex].id, cards[currentIndex].is_flagged);
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

  // Helper to convert interval setting to days
  const getIntervalInDays = (setting, currentIntervalDays = 1) => {
    const { value, unit } = setting;
    switch (unit) {
      case 'minutes':
        return Math.max(1, Math.round(value / 1440)); // Convert minutes to days (min 1 day)
      case 'hours':
        return Math.max(1, Math.round(value / 24));
      case 'days':
        return value;
      case 'multiplier':
        return Math.max(1, Math.round(currentIntervalDays * value));
      default:
        return 1;
    }
  };

  // Helper to get next review time (for sub-day intervals, still schedule for today/soon)
  const getNextReviewTime = (setting) => {
    const { value, unit } = setting;
    const now = new Date();
    switch (unit) {
      case 'minutes':
        now.setMinutes(now.getMinutes() + value);
        return now;
      case 'hours':
        now.setHours(now.getHours() + value);
        return now;
      case 'days':
        now.setDate(now.getDate() + value);
        return now;
      case 'multiplier':
        // Multiplier-based intervals use days
        return now;
      default:
        now.setDate(now.getDate() + 1);
        return now;
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
    let nextReview;

    // Use customizable intervals
    const setting = intervalSettings[rating];

    if (setting.unit === 'multiplier') {
      // Multiplier-based (traditional Anki-style)
      newInterval = Math.max(1, Math.round(currentInterval * setting.value));
      nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + Math.min(newInterval, intervalSettings.maxDays));
    } else {
      // Fixed interval
      newInterval = getIntervalInDays(setting, currentInterval);
      nextReview = getNextReviewTime(setting);

      // For multiplier-based progression on future reviews
      if (setting.unit === 'minutes' || setting.unit === 'hours') {
        // Keep interval_days small for recently-reviewed cards
        newInterval = Math.max(1, Math.ceil(getIntervalInDays(setting)));
      }
    }

    // Apply max days cap
    newInterval = Math.min(newInterval, intervalSettings.maxDays);

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

  // Fisher-Yates shuffle algorithm
  const shuffleCards = (cardsToShuffle) => {
    const shuffledCards = [...cardsToShuffle];
    for (let i = shuffledCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
    }
    return shuffledCards;
  };

  const handleShuffle = () => {
    setCards(shuffleCards(cards));
    setCurrentIndex(0);
    setShowAnswer(false);
    setShuffled(true);
  };

  const toggleAutoShuffle = () => {
    const newValue = !autoShuffle;
    setAutoShuffle(newValue);
    localStorage.setItem('autoShuffleReview', newValue.toString());
  };

  const saveIntervalSettings = (newSettings) => {
    setIntervalSettings(newSettings);
    localStorage.setItem('srsIntervalSettings', JSON.stringify(newSettings));
  };

  const formatIntervalDisplay = (setting) => {
    const { value, unit } = setting;
    if (unit === 'multiplier') {
      return `×${value}`;
    }
    if (unit === 'minutes' && value < 60) {
      return `${value}m`;
    }
    if (unit === 'minutes' && value >= 60) {
      return `${Math.round(value / 60)}h`;
    }
    if (unit === 'hours') {
      return `${value}h`;
    }
    return `${value}d`;
  };

  const getIntervalPreview = (rating) => {
    const setting = intervalSettings[rating];
    const currentInterval = cards[currentIndex]?.interval_days || 1;

    if (setting.unit === 'multiplier') {
      const newInterval = Math.min(Math.max(1, Math.round(currentInterval * setting.value)), intervalSettings.maxDays);
      return `${newInterval} day${newInterval !== 1 ? 's' : ''}`;
    }
    if (setting.unit === 'minutes') {
      return `${setting.value} min`;
    }
    if (setting.unit === 'hours') {
      return `${setting.value} hr${setting.value !== 1 ? 's' : ''}`;
    }
    return `${setting.value} day${setting.value !== 1 ? 's' : ''}`;
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

    // Fetch updated streak data
    const { data: streakResult } = await supabase
      .from('study_streaks')
      .select('current_streak')
      .single();

    if (streakResult) {
      setStreakData({ currentStreak: streakResult.current_streak });
    }

    // Show celebration before navigating
    setShowCelebration(true);
    setTimeout(() => {
      navigate('/dashboard');
    }, 2500);
  };

  // Create confetti pieces
  const createConfetti = () => {
    const colors = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'];
    const pieces = [];
    for (let i = 0; i < 50; i++) {
      pieces.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
      });
    }
    return pieces;
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
              <kbd>1</kbd>
              <span>Again</span>
            </div>
            <div className="shortcut-legend-item">
              <kbd>2</kbd>
              <span>Hard</span>
            </div>
            <div className="shortcut-legend-item">
              <kbd>3</kbd>
              <span>Good</span>
            </div>
            <div className="shortcut-legend-item">
              <kbd>4</kbd>
              <span>Easy</span>
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
          className={`btn-toggle ${reverseMode ? 'active' : ''}`}
          onClick={() => setReverseMode(!reverseMode)}
          title={reverseMode ? 'Currently: Answer → Question' : 'Currently: Question → Answer'}
        >
          🔄 {reverseMode ? 'Back → Front' : 'Front → Back'}
        </button>
        <button
          className="btn-secondary"
          onClick={handleShuffle}
          title="Shuffle cards randomly"
        >
          🔀 Shuffle
        </button>
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
              <div className="card-label">{reverseMode ? 'Answer:' : 'Question:'}</div>
              <div className="card-text">{reverseMode ? currentCard.back : currentCard.front}</div>
            </div>

            {showAnswer && (
              <div className="card-back">
                <div className="card-label">{reverseMode ? 'Question:' : 'Answer:'}</div>
                <div className="card-text">{reverseMode ? currentCard.front : currentCard.back}</div>
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
                      <span className="rating-time">{getIntervalPreview('again')}</span>
                    </button>
                    <button
                      className="btn-rating btn-hard"
                      onClick={() => handleRating('hard')}
                    >
                      <span className="keyboard-hint">2</span>
                      <span className="rating-label">Hard</span>
                      <span className="rating-time">{getIntervalPreview('hard')}</span>
                    </button>
                    <button
                      className="btn-rating btn-good"
                      onClick={() => handleRating('good')}
                    >
                      <span className="keyboard-hint">3</span>
                      <span className="rating-label">Good</span>
                      <span className="rating-time">{getIntervalPreview('good')}</span>
                    </button>
                    <button
                      className="btn-rating btn-easy"
                      onClick={() => handleRating('easy')}
                    >
                      <span className="keyboard-hint">4</span>
                      <span className="rating-label">Easy</span>
                      <span className="rating-time">{getIntervalPreview('easy')}</span>
                    </button>
                  </div>
                  <button
                    className="btn-text btn-settings"
                    onClick={() => setShowSettings(true)}
                  >
                    ⚙️ Customize Intervals
                  </button>
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

      {/* Interval Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
            <h2>⚙️ Customize Spaced Repetition Intervals</h2>
            <p className="modal-subtitle">Adjust how long until cards reappear based on your rating</p>

            <div className="interval-settings">
              {['again', 'hard', 'good', 'easy'].map(rating => (
                <div key={rating} className={`interval-setting interval-${rating}`}>
                  <label className="interval-label">
                    {rating === 'again' && '🔴 Again (Forgot)'}
                    {rating === 'hard' && '🟠 Hard (Difficult)'}
                    {rating === 'good' && '🟢 Good (Normal)'}
                    {rating === 'easy' && '🟣 Easy (Very Easy)'}
                  </label>
                  <div className="interval-inputs">
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={intervalSettings[rating].value}
                      onChange={(e) => saveIntervalSettings({
                        ...intervalSettings,
                        [rating]: { ...intervalSettings[rating], value: parseInt(e.target.value) || 1 }
                      })}
                    />
                    <select
                      value={intervalSettings[rating].unit}
                      onChange={(e) => saveIntervalSettings({
                        ...intervalSettings,
                        [rating]: { ...intervalSettings[rating], unit: e.target.value }
                      })}
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="multiplier">× Multiplier</option>
                    </select>
                  </div>
                </div>
              ))}

              <div className="interval-setting interval-max">
                <label className="interval-label">📅 Maximum Interval (Days)</label>
                <div className="interval-inputs">
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={intervalSettings.maxDays}
                    onChange={(e) => saveIntervalSettings({
                      ...intervalSettings,
                      maxDays: parseInt(e.target.value) || 365
                    })}
                  />
                  <span className="interval-unit">days max</span>
                </div>
              </div>

              <div className="setting-toggle">
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={autoShuffle}
                    onChange={toggleAutoShuffle}
                  />
                  <span className="toggle-label">🔀 Auto-shuffle after completing all cards</span>
                </label>
              </div>
            </div>

            <div className="settings-presets">
              <p>Quick Presets:</p>
              <div className="preset-buttons">
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => saveIntervalSettings({
                    again: { value: 1, unit: 'minutes' },
                    hard: { value: 6, unit: 'minutes' },
                    good: { value: 10, unit: 'minutes' },
                    easy: { value: 4, unit: 'days' },
                    maxDays: 365
                  })}
                >
                  Short Term
                </button>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => saveIntervalSettings({
                    again: { value: 1, unit: 'days' },
                    hard: { value: 1.2, unit: 'multiplier' },
                    good: { value: 2.5, unit: 'multiplier' },
                    easy: { value: 4, unit: 'multiplier' },
                    maxDays: 365
                  })}
                >
                  Anki Default
                </button>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => saveIntervalSettings({
                    again: { value: 10, unit: 'minutes' },
                    hard: { value: 1, unit: 'days' },
                    good: { value: 3, unit: 'days' },
                    easy: { value: 7, unit: 'days' },
                    maxDays: 30
                  })}
                >
                  Exam Cram
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setShowSettings(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Celebration Overlay */}
      {showCelebration && (
        <>
          <div className="celebration-overlay">
            {createConfetti().map(piece => (
              <div
                key={piece.id}
                className="confetti-piece"
                style={{
                  left: `${piece.left}%`,
                  backgroundColor: piece.color,
                  animationDelay: `${piece.delay}s`,
                  transform: `rotate(${piece.rotation}deg)`,
                }}
              />
            ))}
          </div>
          <div className="celebration-modal">
            <div className="celebration-content">
              <div className="celebration-emoji">🎉</div>
              <h2>Amazing Work!</h2>
              <p>You reviewed {reviewedCount + 1} cards!</p>
              {streakData.currentStreak > 0 && (
                <div className="streak-celebration">
                  <span className="streak-fire-emoji">🔥</span>
                  <span>{streakData.currentStreak} Day Streak!</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Review;
