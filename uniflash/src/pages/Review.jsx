import React, { useState, useEffect, useRef } from 'react';
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

  // Touch/swipe handling for mobile
  const cardRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Notes feature
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

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

  // Refresh interval settings from localStorage when component mounts or regains focus
  useEffect(() => {
    const refreshSettings = () => {
      const saved = localStorage.getItem('srsIntervalSettings');
      if (saved) {
        setIntervalSettings(JSON.parse(saved));
      }
    };

    // Refresh on mount
    refreshSettings();

    // Also refresh when window gains focus (user returns from Settings)
    window.addEventListener('focus', refreshSettings);
    return () => window.removeEventListener('focus', refreshSettings);
  }, []);

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
        case 'n':
        case 'N':
          e.preventDefault();
          if (!editingNote) {
            setEditingNote(true);
            setNoteText(cards[currentIndex]?.notes || '');
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showAnswer, showSlide, cards, currentIndex]);

  // Touch event handlers for mobile swipe
  const minSwipeDistance = 50;

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);

    // Calculate swipe offset for visual feedback
    if (touchStart) {
      const offset = currentTouch - touchStart;
      setSwipeOffset(offset);

      // Determine swipe direction for visual cues
      if (Math.abs(offset) > 30) {
        if (showAnswer) {
          // When answer is shown, swipe determines rating
          if (offset > 0) {
            setSwipeDirection('right'); // Good/Easy
          } else {
            setSwipeDirection('left'); // Again/Hard
          }
        }
      } else {
        setSwipeDirection(null);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setSwipeOffset(0);
      setSwipeDirection(null);
      return;
    }

    const distance = touchEnd - touchStart;
    const isSwipe = Math.abs(distance) > minSwipeDistance;

    if (isSwipe) {
      if (!showAnswer) {
        // If answer not shown, tap to show (swipe up gesture)
        setShowAnswer(true);
      } else {
        // When answer is shown, swipe to rate
        if (distance > 0) {
          // Swipe right = Good
          handleRating('good');
        } else {
          // Swipe left = Again
          handleRating('again');
        }
      }
    }

    // Reset swipe state
    setTouchStart(null);
    setTouchEnd(null);
    setSwipeOffset(0);
    setSwipeDirection(null);
  };

  // Reset note editing state when card changes
  useEffect(() => {
    setEditingNote(false);
    setNoteText(cards[currentIndex]?.notes || '');
  }, [currentIndex, cards]);

  // Save note to database
  const handleSaveNote = async () => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    setSavingNote(true);
    try {
      const { error } = await supabase
        .from('flashcards')
        .update({ notes: noteText.trim() || null })
        .eq('id', currentCard.id);

      if (!error) {
        // Update local state
        setCards(cards.map(card =>
          card.id === currentCard.id
            ? { ...card, notes: noteText.trim() || null }
            : card
        ));
        setEditingNote(false);
      }
    } catch (err) {
      console.error('Error saving note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleCancelNote = () => {
    setNoteText(cards[currentIndex]?.notes || '');
    setEditingNote(false);
  };

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
            <div className="shortcut-legend-item">
              <kbd>N</kbd>
              <span>Add note</span>
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
                  onChange={() => toggleSetSelection(set.id)}
                  onClick={(e) => e.stopPropagation()}
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
          <div
            ref={cardRef}
            className={`review-card ${swipeDirection ? `swipe-${swipeDirection}` : ''}`}
            style={{
              transform: swipeOffset ? `translateX(${swipeOffset * 0.3}px) rotate(${swipeOffset * 0.02}deg)` : 'none',
              transition: swipeOffset ? 'none' : 'transform 0.3s ease'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Swipe indicator overlays */}
            {swipeDirection === 'right' && showAnswer && (
              <div className="swipe-indicator swipe-good">
                <span>Good</span>
              </div>
            )}
            {swipeDirection === 'left' && showAnswer && (
              <div className="swipe-indicator swipe-again">
                <span>Again</span>
              </div>
            )}

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

            {/* Notes Section - shown after answer */}
            {showAnswer && (
              <div className="card-notes-section">
                <div className="notes-header">
                  <span className="notes-label">📝 Personal Notes</span>
                  {!editingNote && (
                    <button
                      className="btn-edit-note"
                      onClick={() => {
                        setEditingNote(true);
                        setNoteText(currentCard.notes || '');
                      }}
                    >
                      {currentCard.notes ? '✏️ Edit' : '➕ Add Note'}
                    </button>
                  )}
                </div>
                {editingNote ? (
                  <div className="notes-editor">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="What was challenging about this card? Add reminders, mnemonics, or explanations..."
                      rows={3}
                      autoFocus
                    />
                    <div className="notes-editor-actions">
                      <button
                        className="btn-secondary btn-sm"
                        onClick={handleCancelNote}
                        disabled={savingNote}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn-primary btn-sm"
                        onClick={handleSaveNote}
                        disabled={savingNote}
                      >
                        {savingNote ? 'Saving...' : 'Save Note'}
                      </button>
                    </div>
                  </div>
                ) : currentCard.notes ? (
                  <div className="notes-content">
                    {currentCard.notes}
                  </div>
                ) : (
                  <div className="notes-empty">
                    <span>No notes yet. Press <kbd>N</kbd> or click "Add Note" to add one.</span>
                  </div>
                )}
              </div>
            )}

            <div className="mobile-swipe-hint">
              {!showAnswer ? (
                <span>Tap card or swipe to show answer</span>
              ) : (
                <span>Swipe left (Again) or right (Good)</span>
              )}
            </div>

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
