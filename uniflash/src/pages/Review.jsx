import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import ClozeCardDisplay from '../components/ClozeCardDisplay';

const Review = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // sessionCards: [{card, dueAt}] sorted by dueAt ascending
  // Cards rated Again/Hard come back with dueAt = now + configured interval
  // Cards rated Good/Easy are removed from session (done)
  const [sessionCards, setSessionCards] = useState([]);
  const [doneInSession, setDoneInSession] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);

  const [loading, setLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [ratingCounts, setRatingCounts] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [showSlide, setShowSlide] = useState(false);
  const [slideContent, setSlideContent] = useState(null);
  const [sets, setSets] = useState([]);
  const [selectedSets, setSelectedSets] = useState([]);
  const [showSetSelector, setShowSetSelector] = useState(false);
  const [reverseMode, setReverseMode] = useState(false);
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
  const [focusMode, setFocusMode] = useState(false);

  // Touch/swipe
  const cardRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Notes
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Timing
  const cardStartTimeRef = useRef(null);
  const activeTimeRef = useRef(0);

  // Forces re-render every second during countdown so the timer display updates
  const [, setTick] = useState(0);

  const [intervalSettings, setIntervalSettings] = useState(() => {
    const saved = localStorage.getItem('srsIntervalSettings');
    return saved ? JSON.parse(saved) : {
      again: { value: 1, unit: 'minutes' },
      hard: { value: 6, unit: 'minutes' },
      good: { value: 10, unit: 'minutes' },
      easy: { value: 4, unit: 'days' },
      maxDays: 365
    };
  });

  useEffect(() => {
    const refreshSettings = () => {
      const saved = localStorage.getItem('srsIntervalSettings');
      if (saved) setIntervalSettings(JSON.parse(saved));
    };
    refreshSettings();
    window.addEventListener('focus', refreshSettings);
    return () => window.removeEventListener('focus', refreshSettings);
  }, []);

  useEffect(() => {
    fetchSets();
    fetchDueCards();
    const setParam = searchParams.get('set');
    const setsParam = searchParams.get('sets');
    if (setsParam) {
      setSelectedSets(setsParam.split(','));
    } else if (setParam) {
      setSelectedSets([setParam]);
    }
  }, []);

  useEffect(() => {
    fetchDueCards();
  }, [selectedSets]);

  // Countdown ticker: fires every second while waiting for the next card to become due
  useEffect(() => {
    if (sessionComplete || sessionCards.length === 0) return;
    const firstDueAt = sessionCards[0]?.dueAt;
    if (!firstDueAt || firstDueAt <= new Date()) return;

    const timer = setInterval(() => {
      setTick(t => t + 1);
      if (new Date() >= firstDueAt) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionCards, sessionComplete]);

  // Reset timer when current card changes
  useEffect(() => {
    const currentCard = sessionCards[0];
    if (!loading && currentCard && currentCard.dueAt <= new Date() && !showSlide) {
      cardStartTimeRef.current = Date.now();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCards[0]?.card?.id, loading, showSlide]);

  // Reset note when card changes
  useEffect(() => {
    setEditingNote(false);
    setNoteText(sessionCards[0]?.card?.notes || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCards[0]?.card?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (showSlide) return;
      if (e.key === 'Escape' || e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        setFocusMode(prev => !prev);
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        if (!showAnswer && !isWaiting()) setShowAnswer(true);
        return;
      }
      if (!showAnswer || isWaiting()) return;
      switch (e.key) {
        case '1': handleRating('again'); break;
        case '2': handleRating('hard'); break;
        case '3': handleRating('good'); break;
        case '4': handleRating('easy'); break;
        case 'f': case 'F':
          e.preventDefault();
          if (sessionCards[0]?.card) toggleFlag(sessionCards[0].card.id, sessionCards[0].card.is_flagged);
          break;
        case 'n': case 'N':
          e.preventDefault();
          if (!editingNote) {
            setEditingNote(true);
            setNoteText(sessionCards[0]?.card?.notes || '');
          }
          break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showAnswer, showSlide, sessionCards, editingNote]);

  const minSwipeDistance = 50;
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const handleTouchMove = (e) => {
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    if (touchStart) {
      const offset = currentTouch - touchStart;
      setSwipeOffset(offset);
      if (Math.abs(offset) > 30 && showAnswer) {
        setSwipeDirection(offset > 0 ? 'right' : 'left');
      } else {
        setSwipeDirection(null);
      }
    }
  };
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) { setSwipeOffset(0); setSwipeDirection(null); return; }
    const distance = touchEnd - touchStart;
    if (Math.abs(distance) > minSwipeDistance) {
      if (!showAnswer) setShowAnswer(true);
      else if (distance > 0) handleRating('good');
      else handleRating('again');
    }
    setTouchStart(null); setTouchEnd(null); setSwipeOffset(0); setSwipeDirection(null);
  };

  const handleSaveNote = async () => {
    const currentCard = sessionCards[0]?.card;
    if (!currentCard) return;
    setSavingNote(true);
    try {
      const { error } = await supabase
        .from('flashcards')
        .update({ notes: noteText.trim() || null })
        .eq('id', currentCard.id);
      if (!error) {
        setSessionCards(prev => prev.map(item =>
          item.card.id === currentCard.id
            ? { ...item, card: { ...item.card, notes: noteText.trim() || null } }
            : item
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
    setNoteText(sessionCards[0]?.card?.notes || '');
    setEditingNote(false);
  };

  const fetchSets = async () => {
    const { data, error } = await supabase.from('flashcard_sets').select('*').order('name');
    if (!error) setSets(data || []);
  };

  const fetchDueCards = async () => {
    let query = supabase
      .from('flashcards')
      .select(`*, slides (title, content, slide_number), flashcard_sets (name, color, icon)`)
      .lte('next_review', new Date().toISOString());
    if (selectedSets.length > 0) query = query.in('set_id', selectedSets);
    const { data, error } = await query.order('next_review');
    if (!error && data) {
      const now = new Date();
      const initial = data.map(card => ({ card, dueAt: now }));
      setSessionCards(initial);
      setSessionTotal(data.length);
      setDoneInSession(0);
      setSessionComplete(false);
      activeTimeRef.current = 0;
    }
    setLoading(false);
  };

  const toggleSetSelection = (setId) => {
    setSelectedSets(prev =>
      prev.includes(setId) ? prev.filter(id => id !== setId) : [...prev, setId]
    );
  };

  const getIntervalInDays = (setting, currentIntervalDays = 1) => {
    const { value, unit } = setting;
    switch (unit) {
      case 'minutes': return Math.max(1, Math.round(value / 1440));
      case 'hours': return Math.max(1, Math.round(value / 24));
      case 'days': return value;
      case 'multiplier': return Math.max(1, Math.round(currentIntervalDays * value));
      default: return 1;
    }
  };

  // Returns the Date when this card should next be reviewed
  const getNextReviewTime = (setting) => {
    const { value, unit } = setting;
    const now = new Date();
    switch (unit) {
      case 'minutes': now.setMinutes(now.getMinutes() + value); return now;
      case 'hours': now.setHours(now.getHours() + value); return now;
      case 'days': now.setDate(now.getDate() + value); return now;
      case 'multiplier': return now;
      default: now.setDate(now.getDate() + 1); return now;
    }
  };

  const handleRating = async (rating) => {
    const sessionItem = sessionCards[0];
    if (!sessionItem) return;
    const { card } = sessionItem;

    if (cardStartTimeRef.current) {
      activeTimeRef.current += Date.now() - cardStartTimeRef.current;
      cardStartTimeRef.current = Date.now();
    }

    const currentInterval = card.interval_days || 1;
    const setting = intervalSettings[rating];
    let newInterval;
    let nextReviewDate;

    if (setting.unit === 'multiplier') {
      newInterval = Math.max(1, Math.round(currentInterval * setting.value));
      nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + Math.min(newInterval, intervalSettings.maxDays));
    } else {
      newInterval = getIntervalInDays(setting, currentInterval);
      nextReviewDate = getNextReviewTime(setting);
      if (setting.unit === 'minutes' || setting.unit === 'hours') {
        newInterval = Math.max(1, Math.ceil(getIntervalInDays(setting)));
      }
    }
    newInterval = Math.min(newInterval, intervalSettings.maxDays);

    await supabase
      .from('flashcards')
      .update({
        interval_days: newInterval,
        next_review: nextReviewDate.toISOString(),
        last_reviewed: new Date().toISOString(),
      })
      .eq('id', card.id);

    const newReviewedCount = reviewedCount + 1;
    setReviewedCount(newReviewedCount);
    setRatingCounts(prev => ({ ...prev, [rating]: prev[rating] + 1 }));

    const isCompleted = rating === 'good' || rating === 'easy';

    if (isCompleted) {
      const remaining = sessionCards.slice(1);
      const newDone = doneInSession + 1;
      setDoneInSession(newDone);
      setSessionCards(remaining);
      setShowAnswer(false);
      setShowSlide(false);
      if (remaining.length === 0) {
        setSessionComplete(true);
        finishReview(newReviewedCount);
      }
    } else {
      // Again/Hard: schedule card for later using the configured interval, re-sort by dueAt
      const updatedCard = { ...card, interval_days: newInterval };
      const remaining = sessionCards.slice(1);
      const requeued = [...remaining, { card: updatedCard, dueAt: nextReviewDate }];
      requeued.sort((a, b) => a.dueAt - b.dueAt);
      setSessionCards(requeued);
      setShowAnswer(false);
      setShowSlide(false);
    }
  };

  const handleDontUnderstand = () => {
    const card = sessionCards[0]?.card;
    if (card?.slides) { setSlideContent(card.slides); setShowSlide(true); }
  };

  const toggleFlag = async (cardId, currentFlagStatus) => {
    const { error } = await supabase
      .from('flashcards')
      .update({ is_flagged: !currentFlagStatus })
      .eq('id', cardId);
    if (!error) {
      setSessionCards(prev => prev.map(item =>
        item.card.id === cardId
          ? { ...item, card: { ...item.card, is_flagged: !currentFlagStatus } }
          : item
      ));
    }
  };

  const shuffleCards = (arr) => {
    const s = [...arr];
    for (let i = s.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [s[i], s[j]] = [s[j], s[i]];
    }
    return s;
  };

  const handleShuffle = () => {
    // Shuffle only the cards that are already due; preserve order of future-scheduled cards
    const now = new Date();
    const dueNow = sessionCards.filter(item => item.dueAt <= now);
    const future = sessionCards.filter(item => item.dueAt > now);
    const shuffled = shuffleCards(dueNow);
    setSessionCards([...shuffled, ...future]);
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

  const getIntervalPreview = (rating) => {
    const setting = intervalSettings[rating];
    const currentInterval = sessionCards[0]?.card?.interval_days || 1;
    if (setting.unit === 'multiplier') {
      const n = Math.min(Math.max(1, Math.round(currentInterval * setting.value)), intervalSettings.maxDays);
      return `${n} day${n !== 1 ? 's' : ''}`;
    }
    if (setting.unit === 'minutes') return `${setting.value} min`;
    if (setting.unit === 'hours') return `${setting.value} hr${setting.value !== 1 ? 's' : ''}`;
    return `${setting.value} day${setting.value !== 1 ? 's' : ''}`;
  };

  const finishReview = async (totalRatings) => {
    const timeSpent = Math.round(activeTimeRef.current / 1000);
    await supabase.from('review_sessions').insert([{
      cards_reviewed: totalRatings || reviewedCount,
      time_spent: timeSpent,
      created_at: new Date().toISOString(),
    }]);
    const { data: streakResult } = await supabase
      .from('study_streaks').select('current_streak').single();
    if (streakResult) setStreakData({ currentStreak: streakResult.current_streak });
    setShowCelebration(true);
    setTimeout(() => navigate('/dashboard'), 2500);
  };

  const createConfetti = () => {
    const colors = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'];
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
    }));
  };

  const formatCountdown = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Skip the wait — pull the next card forward to now
  const skipWait = () => {
    setSessionCards(prev => {
      if (prev.length === 0) return prev;
      const [first, ...rest] = prev;
      return [{ ...first, dueAt: new Date() }, ...rest];
    });
  };

  // Helpers recomputed every render so countdown stays current
  const isWaiting = () => {
    const first = sessionCards[0];
    return first && first.dueAt > new Date();
  };
  const msUntilNext = () => {
    const first = sessionCards[0];
    if (!first) return 0;
    return Math.max(0, first.dueAt - new Date());
  };

  if (loading) return <div className="loading">Loading review cards...</div>;

  if (sessionCards.length === 0 && !sessionComplete) {
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

  if (sessionComplete) {
    return (
      <>
        {showCelebration && (
          <>
            <div className="celebration-overlay">
              {createConfetti().map(piece => (
                <div key={piece.id} className="confetti-piece" style={{
                  left: `${piece.left}%`,
                  backgroundColor: piece.color,
                  animationDelay: `${piece.delay}s`,
                  transform: `rotate(${piece.rotation}deg)`,
                }} />
              ))}
            </div>
            <div className="celebration-modal">
              <div className="celebration-content">
                <div className="celebration-emoji">🎉</div>
                <h2>Amazing Work!</h2>
                <p>You completed all {sessionTotal} cards!</p>
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
      </>
    );
  }

  const waiting = isWaiting();
  const currentCard = waiting ? null : sessionCards[0]?.card;
  const progress = sessionTotal > 0 ? (doneInSession / sessionTotal) * 100 : 0;

  const getSelectedSetNames = () =>
    sets.filter(s => selectedSets.includes(s.id)).map(s => `${s.icon} ${s.name}`).join(', ');

  return (
    <div className={`review ${focusMode ? 'focus-mode' : ''}`}>
      <button
        className="btn-focus-toggle"
        onClick={() => setFocusMode(prev => !prev)}
        title={focusMode ? 'Exit Focus Mode (Z)' : 'Enter Focus Mode (Z)'}
      >
        {focusMode ? '🔳' : '🔲'}
      </button>

      {showShortcuts && !focusMode && (
        <div className="shortcuts-legend-float">
          <div className="shortcuts-legend-header">
            <span>⌨️ Shortcuts</span>
            <button className="btn-close-legend" onClick={() => setShowShortcuts(false)}>×</button>
          </div>
          <div className="shortcuts-legend-items">
            {[['Space','Show answer'],['1','Again'],['2','Hard'],['3','Good'],['4','Easy'],['F','Flag'],['N','Note']].map(([key, label]) => (
              <div key={key} className="shortcut-legend-item"><kbd>{key}</kbd><span>{label}</span></div>
            ))}
          </div>
        </div>
      )}

      {!showShortcuts && (
        <button className="btn-show-shortcuts" onClick={() => setShowShortcuts(true)} title="Show keyboard shortcuts">⌨️</button>
      )}

      <div className="review-header">
        <div className="review-info">
          <div className="review-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-text">
              {doneInSession} / {sessionTotal}
              {sessionCards.length > 0 && ` · ${sessionCards.length} remaining`}
            </div>
          </div>
          {selectedSets.length > 0 && (
            <div className="studying-sets"><strong>Studying:</strong> {getSelectedSetNames()}</div>
          )}
        </div>
        <button className={`btn-toggle ${reverseMode ? 'active' : ''}`} onClick={() => setReverseMode(!reverseMode)}>
          🔄 {reverseMode ? 'Back → Front' : 'Front → Back'}
        </button>
        <button className="btn-secondary" onClick={handleShuffle}>🔀 Shuffle</button>
        <button className="btn-secondary" onClick={() => setShowSetSelector(!showSetSelector)}>
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
                <input type="checkbox" checked={selectedSets.includes(set.id)}
                  onChange={() => toggleSetSelection(set.id)} onClick={e => e.stopPropagation()} />
                <span className="set-icon">{set.icon}</span>
                <span className="set-name">{set.name}</span>
              </div>
            ))}
          </div>
          {selectedSets.length > 0 && (
            <button className="btn-text" onClick={() => setSelectedSets([])}>Clear All</button>
          )}
        </div>
      )}

      {/* Break screen — next card not due yet */}
      {waiting ? (
        <div className="review-waiting">
          <div className="waiting-content">
            <div className="waiting-deco">
              <span className="waiting-emoji waiting-emoji-1">☕</span>
              <span className="waiting-emoji waiting-emoji-2">🌿</span>
              <span className="waiting-emoji waiting-emoji-3">✨</span>
            </div>
            <h2 className="waiting-title">Take a break!</h2>
            <p className="waiting-subtext">Next card due in</p>
            <div className="waiting-countdown">{formatCountdown(msUntilNext())}</div>
            <p className="waiting-progress">
              {doneInSession} / {sessionTotal} done · {sessionCards.length} remaining
            </p>
            <button className="btn-skip-wait" onClick={skipWait}>
              Skip break → show card now
            </button>
          </div>
        </div>
      ) : showSlide && slideContent ? (
        <div className="slide-overlay">
          <div className="slide-modal">
            <h3>📄 Source Slide: {slideContent.title}</h3>
            <div className="slide-number">Slide {slideContent.slide_number}</div>
            <div className="slide-text">{slideContent.content}</div>
            <button className="btn-primary" onClick={() => setShowSlide(false)}>Back to Card</button>
          </div>
        </div>
      ) : currentCard && (
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
            {swipeDirection === 'right' && showAnswer && <div className="swipe-indicator swipe-good"><span>Good</span></div>}
            {swipeDirection === 'left' && showAnswer && <div className="swipe-indicator swipe-again"><span>Again</span></div>}

            {currentCard.card_type === 'cloze' && currentCard.cloze_data ? (
              <ClozeCardDisplay clozeData={currentCard.cloze_data} showAnswer={showAnswer} reverseMode={reverseMode} />
            ) : (
              <>
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
              </>
            )}

            {showAnswer && (
              <div className="card-notes-section">
                <div className="notes-header">
                  <span className="notes-label">📝 Personal Notes</span>
                  {!editingNote && (
                    <button className="btn-edit-note" onClick={() => { setEditingNote(true); setNoteText(currentCard.notes || ''); }}>
                      {currentCard.notes ? '✏️ Edit' : '➕ Add Note'}
                    </button>
                  )}
                </div>
                {editingNote ? (
                  <div className="notes-editor">
                    <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                      placeholder="Add reminders, mnemonics, or explanations..." rows={3} autoFocus />
                    <div className="notes-editor-actions">
                      <button className="btn-secondary btn-sm" onClick={handleCancelNote} disabled={savingNote}>Cancel</button>
                      <button className="btn-primary btn-sm" onClick={handleSaveNote} disabled={savingNote}>
                        {savingNote ? 'Saving...' : 'Save Note'}
                      </button>
                    </div>
                  </div>
                ) : currentCard.notes ? (
                  <div className="notes-content">{currentCard.notes}</div>
                ) : (
                  <div className="notes-empty"><span>No notes yet. Press <kbd>N</kbd> to add one.</span></div>
                )}
              </div>
            )}

            <div className="mobile-swipe-hint">
              {!showAnswer ? <span>Tap card or swipe to show answer</span> : <span>Swipe left (Again) or right (Good)</span>}
            </div>

            <div className="review-actions">
              {!showAnswer ? (
                <button className="btn-primary btn-large" onClick={() => setShowAnswer(true)}>Show Answer</button>
              ) : (
                <>
                  <div className="rating-buttons-anki">
                    {['again', 'hard', 'good', 'easy'].map((r, i) => (
                      <button key={r} className={`btn-rating btn-${r}`} onClick={() => handleRating(r)}>
                        <span className="keyboard-hint">{i + 1}</span>
                        <span className="rating-label">{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                        <span className="rating-time">{getIntervalPreview(r)}</span>
                      </button>
                    ))}
                  </div>
                  <button className="btn-text btn-settings" onClick={() => setShowSettings(true)}>
                    ⚙️ Customize Intervals
                  </button>
                  <div className="secondary-actions">
                    <button className="btn-secondary btn-edit-card" onClick={() => navigate(`/flashcards/edit/${currentCard.id}`)}>
                      ✏️ Edit Card
                    </button>
                    <button
                      className={`flag-btn ${currentCard.is_flagged ? 'flagged' : ''}`}
                      onClick={() => toggleFlag(currentCard.id, currentCard.is_flagged)}
                    >
                      {currentCard.is_flagged ? '🚩 Flagged' : '🏳️ Flag as Difficult'}
                    </button>
                    {currentCard.slides && (
                      <button className="btn-secondary" onClick={handleDontUnderstand}>
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

      {reviewedCount > 0 && !focusMode && !waiting && (
        <div className="review-stats-bar">
          <div className="stats-label">Session Stats:</div>
          <div className="stats-items">
            {[['again','🔴'],['hard','🟠'],['good','🟢'],['easy','🟣']].map(([r, dot]) => (
              <div key={r} className={`stat-item stat-${r}`}>
                <span className="stat-dot">{dot}</span>
                <span className="stat-count">{ratingCounts[r]}</span>
                <span className="stat-name">{r.charAt(0).toUpperCase() + r.slice(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
            <h2>⚙️ Customize Spaced Repetition Intervals</h2>
            <p className="modal-subtitle">Adjust how long until cards reappear based on your rating</p>
            <p className="modal-subtitle" style={{ fontStyle: 'italic', color: '#888' }}>
              Again / Hard: card comes back in this session after the configured interval. Good / Easy: scheduled for a future session.
            </p>

            <div className="interval-settings">
              {['again', 'hard', 'good', 'easy'].map(rating => (
                <div key={rating} className={`interval-setting interval-${rating}`}>
                  <label className="interval-label">
                    {rating === 'again' && '🔴 Again (Forgot — returns after interval)'}
                    {rating === 'hard' && '🟠 Hard (Difficult — returns after interval)'}
                    {rating === 'good' && '🟢 Good (Normal — scheduled for later)'}
                    {rating === 'easy' && '🟣 Easy (Very Easy — scheduled for later)'}
                  </label>
                  <div className="interval-inputs">
                    <input type="number" min="1" max="999"
                      value={intervalSettings[rating].value}
                      onChange={e => saveIntervalSettings({
                        ...intervalSettings,
                        [rating]: { ...intervalSettings[rating], value: parseInt(e.target.value) || 1 }
                      })}
                    />
                    <select value={intervalSettings[rating].unit}
                      onChange={e => saveIntervalSettings({
                        ...intervalSettings,
                        [rating]: { ...intervalSettings[rating], unit: e.target.value }
                      })}>
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
                  <input type="number" min="1" max="3650" value={intervalSettings.maxDays}
                    onChange={e => saveIntervalSettings({ ...intervalSettings, maxDays: parseInt(e.target.value) || 365 })}
                  />
                  <span className="interval-unit">days max</span>
                </div>
              </div>

              <div className="setting-toggle">
                <label className="toggle-option">
                  <input type="checkbox" checked={autoShuffle} onChange={toggleAutoShuffle} />
                  <span className="toggle-label">🔀 Auto-shuffle after completing all cards</span>
                </label>
              </div>
            </div>

            <div className="settings-presets">
              <p>Quick Presets:</p>
              <div className="preset-buttons">
                <button className="btn-secondary btn-sm" onClick={() => saveIntervalSettings({
                  again: { value: 1, unit: 'minutes' }, hard: { value: 6, unit: 'minutes' },
                  good: { value: 10, unit: 'minutes' }, easy: { value: 4, unit: 'days' }, maxDays: 365
                })}>Short Term</button>
                <button className="btn-secondary btn-sm" onClick={() => saveIntervalSettings({
                  again: { value: 1, unit: 'days' }, hard: { value: 1.2, unit: 'multiplier' },
                  good: { value: 2.5, unit: 'multiplier' }, easy: { value: 4, unit: 'multiplier' }, maxDays: 365
                })}>Anki Default</button>
                <button className="btn-secondary btn-sm" onClick={() => saveIntervalSettings({
                  again: { value: 10, unit: 'minutes' }, hard: { value: 1, unit: 'days' },
                  good: { value: 3, unit: 'days' }, easy: { value: 7, unit: 'days' }, maxDays: 30
                })}>Exam Cram</button>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setShowSettings(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Review;
