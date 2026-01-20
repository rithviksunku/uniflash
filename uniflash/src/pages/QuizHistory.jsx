import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const QuizHistory = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);

  useEffect(() => {
    fetchQuizHistory();
  }, []);

  useEffect(() => {
    filterQuizzes();
  }, [quizzes, searchTerm]);

  const fetchQuizHistory = async () => {
    setLoading(true);

    // Fetch all quizzes with their attempts
    const { data: quizzesData, error: quizzesError } = await supabase
      .from('quizzes')
      .select(`
        *,
        quiz_attempts (
          id,
          score,
          total_questions,
          completed_at
        )
      `)
      .order('created_at', { ascending: false });

    if (!quizzesError) {
      setQuizzes(quizzesData || []);
    }

    setLoading(false);
  };

  const filterQuizzes = () => {
    if (!searchTerm.trim()) {
      setFilteredQuizzes(quizzes);
      return;
    }

    const search = searchTerm.toLowerCase();
    const filtered = quizzes.filter(quiz =>
      quiz.title?.toLowerCase().includes(search) ||
      quiz.description?.toLowerCase().includes(search)
    );
    setFilteredQuizzes(filtered);
  };

  const handleRetakeQuiz = (quizId) => {
    navigate(`/quiz/${quizId}`);
  };

  const handleViewResults = (quizId, attemptId) => {
    navigate(`/quiz/${quizId}/results/${attemptId}`);
  };

  const handleDeleteQuiz = async (quizId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}" and all its attempts?`)) {
      return;
    }

    // Delete quiz attempts first
    await supabase
      .from('quiz_attempts')
      .delete()
      .eq('quiz_id', quizId);

    // Delete quiz questions
    await supabase
      .from('quiz_questions')
      .delete()
      .eq('quiz_id', quizId);

    // Delete quiz
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (!error) {
      fetchQuizHistory();
    } else {
      alert(`Failed to delete quiz: ${error.message}`);
    }
  };

  const getBestScore = (attempts) => {
    if (!attempts || attempts.length === 0) return null;
    const completed = attempts.filter(a => a.completed_at);
    if (completed.length === 0) return null;

    const best = completed.reduce((max, attempt) =>
      (attempt.score / attempt.total_questions) > (max.score / max.total_questions) ? attempt : max
    );

    return {
      score: best.score,
      total: best.total_questions,
      percentage: Math.round((best.score / best.total_questions) * 100)
    };
  };

  const getLatestAttempt = (attempts) => {
    if (!attempts || attempts.length === 0) return null;
    const completed = attempts.filter(a => a.completed_at);
    if (completed.length === 0) return null;

    return completed.sort((a, b) =>
      new Date(b.completed_at) - new Date(a.completed_at)
    )[0];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="quiz-history">
        <div className="loading-state">Loading quiz history...</div>
      </div>
    );
  }

  return (
    <div className="quiz-history">
      <div className="history-header">
        <h1>📊 Quiz History</h1>
        <p>View your past quizzes and retake them anytime</p>
      </div>

      <div className="history-actions">
        <div className="search-section">
          <input
            type="text"
            placeholder="🔍 Search quizzes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate('/quiz/generate')}
        >
          ➕ Generate New Quiz
        </button>
      </div>

      {filteredQuizzes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h2>No quizzes found</h2>
          <p>{searchTerm ? 'Try a different search term' : 'Generate your first quiz to get started!'}</p>
          {!searchTerm && (
            <button
              className="btn-primary"
              onClick={() => navigate('/quiz/generate')}
            >
              Generate Quiz
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="history-info">
            Showing {filteredQuizzes.length} of {quizzes.length} quizzes
          </div>

          <div className="quizzes-grid">
            {filteredQuizzes.map(quiz => {
              const bestScore = getBestScore(quiz.quiz_attempts);
              const latestAttempt = getLatestAttempt(quiz.quiz_attempts);
              const attemptCount = quiz.quiz_attempts?.filter(a => a.completed_at).length || 0;

              return (
                <div key={quiz.id} className="quiz-card">
                  <div className="quiz-header">
                    <h3>{quiz.title || 'Untitled Quiz'}</h3>
                    {quiz.description && (
                      <p className="quiz-description">{quiz.description}</p>
                    )}
                  </div>

                  <div className="quiz-stats">
                    <div className="stat-item">
                      <span className="stat-label">Questions:</span>
                      <span className="stat-value">{quiz.question_count || 0}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Attempts:</span>
                      <span className="stat-value">{attemptCount}</span>
                    </div>
                    {bestScore && (
                      <div className="stat-item">
                        <span className="stat-label">Best Score:</span>
                        <span className="stat-value score-highlight">
                          {bestScore.percentage}% ({bestScore.score}/{bestScore.total})
                        </span>
                      </div>
                    )}
                  </div>

                  {latestAttempt && (
                    <div className="quiz-meta">
                      <span className="meta-label">Last attempt:</span>
                      <span className="meta-value">{formatDate(latestAttempt.completed_at)}</span>
                    </div>
                  )}

                  <div className="quiz-actions">
                    <button
                      className="btn-primary"
                      onClick={() => handleRetakeQuiz(quiz.id)}
                    >
                      {attemptCount > 0 ? '🔄 Retake Quiz' : '▶️ Take Quiz'}
                    </button>
                    {latestAttempt && (
                      <button
                        className="btn-secondary"
                        onClick={() => handleViewResults(quiz.id, latestAttempt.id)}
                      >
                        📈 View Results
                      </button>
                    )}
                    <button
                      className="btn-danger btn-sm"
                      onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                      title="Delete quiz"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default QuizHistory;
