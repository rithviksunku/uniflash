import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const Dashboard = () => {
  const navigate = useNavigate();
  const [dueCount, setDueCount] = useState(0);
  const [reviewStats, setReviewStats] = useState({
    cardsReviewed: 0,
    timeSpent: 0,
  });

  useEffect(() => {
    fetchDueCards();
    fetchReviewStats();
  }, []);

  const fetchDueCards = async () => {
    const { data, error } = await supabase
      .from('flashcards')
      .select('id')
      .lte('next_review', new Date().toISOString());

    if (!error && data) {
      setDueCount(data.length);
    }
  };

  const fetchReviewStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('review_sessions')
      .select('cards_reviewed, time_spent')
      .gte('created_at', today);

    if (!error && data) {
      const stats = data.reduce((acc, session) => ({
        cardsReviewed: acc.cardsReviewed + session.cards_reviewed,
        timeSpent: acc.timeSpent + session.time_spent,
      }), { cardsReviewed: 0, timeSpent: 0 });

      setReviewStats(stats);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>✨ Uniflash Dashboard</h1>
        <p className="subtitle">🦄 Learn smarter, not harder</p>
      </div>

      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon">🎴</div>
          <div className="stat-value">{dueCount}</div>
          <div className="stat-label">Due Flashcards</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-value">{Math.round(reviewStats.timeSpent / 60)}m</div>
          <div className="stat-label">Time Reviewed Today</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-value">{reviewStats.cardsReviewed}</div>
          <div className="stat-label">Cards Reviewed Today</div>
        </div>
      </div>

      <div className="action-cards">
        <button
          className="action-card primary"
          onClick={() => navigate('/review')}
          disabled={dueCount === 0}
        >
          <span className="action-icon">🔥</span>
          <h3>Start Review</h3>
          <p>{dueCount > 0 ? `${dueCount} cards waiting` : 'No cards due'}</p>
        </button>

        <button
          className="action-card"
          onClick={() => navigate('/flashcards/practice')}
        >
          <span className="action-icon">📖</span>
          <h3>Practice Mode</h3>
          <p>Review all flashcards</p>
        </button>

        <button
          className="action-card"
          onClick={() => navigate('/upload')}
        >
          <span className="action-icon">📤</span>
          <h3>Upload Slides</h3>
          <p>Import PowerPoint or PDF</p>
        </button>

        <button
          className="action-card"
          onClick={() => navigate('/presentations')}
        >
          <span className="action-icon">📚</span>
          <h3>My Presentations</h3>
          <p>View and manage files</p>
        </button>

        <button
          className="action-card"
          onClick={() => navigate('/flashcards/create')}
        >
          <span className="action-icon">➕</span>
          <h3>Create Flashcards</h3>
          <p>Manual entry</p>
        </button>

        <button
          className="action-card"
          onClick={() => navigate('/quiz/generate')}
        >
          <span className="action-icon">🎯</span>
          <h3>Generate Quiz</h3>
          <p>Test your knowledge</p>
        </button>

        <button
          className="action-card"
          onClick={() => navigate('/quiz/history')}
        >
          <span className="action-icon">📊</span>
          <h3>Quiz History</h3>
          <p>View and retake quizzes</p>
        </button>

        <button
          className="action-card"
          onClick={() => navigate('/flashcards')}
        >
          <span className="action-icon">📋</span>
          <h3>Manage Flashcards</h3>
          <p>View and edit</p>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
