import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const Review = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(Date.now());
  const [reviewedCount, setReviewedCount] = useState(0);
  const [showSlide, setShowSlide] = useState(false);
  const [slideContent, setSlideContent] = useState(null);

  useEffect(() => {
    fetchDueCards();
  }, []);

  const fetchDueCards = async () => {
    const { data, error } = await supabase
      .from('flashcards')
      .select(`
        *,
        slides (
          title,
          content,
          slide_number
        )
      `)
      .lte('next_review', new Date().toISOString())
      .order('next_review');

    if (!error && data) {
      setCards(data);
    }
    setLoading(false);
  };

  const handleRating = async (rating) => {
    const currentCard = cards[currentIndex];
    let newInterval;

    if (rating === 'again') {
      newInterval = 1; // Review tomorrow
    } else if (rating === 'good') {
      // Simple SRS: double the interval
      newInterval = Math.max(1, currentCard.interval_days * 2);
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

  const finishReview = async () => {
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

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

  return (
    <div className="review">
      <div className="review-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-text">
          {currentIndex + 1} / {cards.length}
        </div>
      </div>

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
                <div className="rating-buttons">
                  <button
                    className="btn-rating btn-again"
                    onClick={() => handleRating('again')}
                  >
                    Again
                    <span className="rating-info">Review tomorrow</span>
                  </button>
                  <button
                    className="btn-rating btn-good"
                    onClick={() => handleRating('good')}
                  >
                    Good
                    <span className="rating-info">Review in {currentCard.interval_days * 2} days</span>
                  </button>
                </div>
                {currentCard.slides && (
                  <button
                    className="btn-secondary"
                    onClick={handleDontUnderstand}
                  >
                    📄 Don't Understand - View Source Slide
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Review;
