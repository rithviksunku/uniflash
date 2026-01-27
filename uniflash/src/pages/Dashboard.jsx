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
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    longestStreak: 0,
  });
  const [weeklyData, setWeeklyData] = useState([]);

  useEffect(() => {
    fetchDueCards();
    fetchReviewStats();
    fetchStreakData();
    fetchWeeklyData();
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

  const fetchStreakData = async () => {
    const { data, error } = await supabase
      .from('study_streaks')
      .select('current_streak, longest_streak')
      .single();

    if (!error && data) {
      setStreakData({
        currentStreak: data.current_streak || 0,
        longestStreak: data.longest_streak || 0,
      });
    }
  };

  const fetchWeeklyData = async () => {
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      days.push({
        date: dateStr,
        dayName: dayNames[date.getDay()],
        isToday: i === 0,
      });
    }

    const startDate = days[0].date;
    const { data, error } = await supabase
      .from('review_sessions')
      .select('created_at, cards_reviewed')
      .gte('created_at', startDate);

    if (!error) {
      const cardsByDay = {};
      (data || []).forEach(session => {
        const day = session.created_at.split('T')[0];
        cardsByDay[day] = (cardsByDay[day] || 0) + session.cards_reviewed;
      });

      const weekData = days.map(day => ({
        ...day,
        cards: cardsByDay[day.date] || 0,
      }));

      setWeeklyData(weekData);
    }
  };

  const getMaxCards = () => Math.max(...weeklyData.map(d => d.cards), 1);

  const getMotivationalMessage = () => {
    const totalWeek = weeklyData.reduce((sum, d) => sum + d.cards, 0);
    const todayCards = weeklyData.find(d => d.isToday)?.cards || 0;

    if (todayCards > 50) return { emoji: '🚀', message: "You're on fire today!" };
    if (todayCards > 20) return { emoji: '⭐', message: 'Great progress today!' };
    if (totalWeek > 100) return { emoji: '🏆', message: 'Amazing week so far!' };
    if (streakData.currentStreak >= 7) return { emoji: '🔥', message: 'Keep that streak alive!' };
    if (dueCount > 0) return { emoji: '📚', message: `${dueCount} cards waiting for you!` };
    return { emoji: '🌟', message: 'Ready to learn something new?' };
  };

  const getStreakEmoji = (streak) => {
    if (streak >= 30) return '👑';
    if (streak >= 14) return '🔥';
    if (streak >= 7) return '⭐';
    if (streak >= 3) return '✨';
    return '🌱';
  };

  const getStreakMessage = (streak) => {
    if (streak >= 30) return 'Legendary!';
    if (streak >= 14) return 'On Fire!';
    if (streak >= 7) return 'Great Week!';
    if (streak >= 3) return 'Building Momentum!';
    if (streak >= 1) return 'Keep Going!';
    return 'Start Today!';
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>✨ Uniflash Dashboard</h1>
        <p className="subtitle">🦄 Learn smarter, not harder</p>
      </div>

      <div className="stats-container">
        <div className={`stat-card streak-card ${streakData.currentStreak >= 7 ? 'streak-fire' : ''}`}>
          <div className="stat-icon streak-icon">{getStreakEmoji(streakData.currentStreak)}</div>
          <div className="stat-value streak-value">{streakData.currentStreak}</div>
          <div className="stat-label">Day Streak</div>
          <div className="streak-message">{getStreakMessage(streakData.currentStreak)}</div>
          {streakData.longestStreak > 0 && (
            <div className="streak-best">Best: {streakData.longestStreak} days</div>
          )}
        </div>

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

      {/* Primary Actions - Start Review & Practice Mode */}
      <div className="primary-actions">
        <button
          className="action-card-large primary"
          onClick={() => navigate('/review')}
          disabled={dueCount === 0}
        >
          <span className="action-icon-large">🔥</span>
          <div className="action-content">
            <h3>Start Review</h3>
            <p>{dueCount > 0 ? `${dueCount} cards waiting` : 'No cards due'}</p>
          </div>
        </button>

        <button
          className="action-card-large"
          onClick={() => navigate('/flashcards/practice')}
        >
          <span className="action-icon-large">📖</span>
          <div className="action-content">
            <h3>Practice Mode</h3>
            <p>Study without spaced repetition</p>
          </div>
        </button>
      </div>

      {/* Quick Links */}
      <div className="quick-links">
        <button className="quick-link" onClick={() => navigate('/flashcards/create')}>
          ➕ Create Cards
        </button>
        <button className="quick-link" onClick={() => navigate('/upload')}>
          📤 Upload Slides
        </button>
        <button className="quick-link" onClick={() => navigate('/quiz/generate')}>
          🎯 Take Quiz
        </button>
        <button className="quick-link" onClick={() => navigate('/flashcards')}>
          📋 My Cards
        </button>
        <button className="quick-link" onClick={() => navigate('/sets')}>
          📚 Flashcard Sets
        </button>
        <button className="quick-link" onClick={() => navigate('/presentations')}>
          🗂️ Presentations
        </button>
        <button className="quick-link" onClick={() => navigate('/quiz/history')}>
          📊 Quiz History
        </button>
      </div>

      {/* Weekly Study Chart */}
      {weeklyData.length > 0 && (
        <div className="weekly-chart-card">
          <div className="chart-header">
            <h3>📈 Your Week</h3>
            <div className="chart-motivation">
              <span className="motivation-emoji">{getMotivationalMessage().emoji}</span>
              <span className="motivation-text">{getMotivationalMessage().message}</span>
            </div>
          </div>
          <div className="weekly-chart">
            {weeklyData.map((day, index) => (
              <div key={index} className={`chart-bar-container ${day.isToday ? 'today' : ''}`}>
                <div className="chart-bar-wrapper">
                  <div
                    className="chart-bar"
                    style={{ height: `${(day.cards / getMaxCards()) * 100}%` }}
                  >
                    {day.cards > 0 && <span className="bar-value">{day.cards}</span>}
                  </div>
                </div>
                <span className="chart-day">{day.dayName}</span>
              </div>
            ))}
          </div>
          <div className="chart-footer">
            <span className="chart-total">
              🎯 {weeklyData.reduce((sum, d) => sum + d.cards, 0)} cards this week
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
