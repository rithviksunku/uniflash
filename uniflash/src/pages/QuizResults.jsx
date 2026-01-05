import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const QuizResults = () => {
  const { quizId, attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [missedQuestions, setMissedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [attemptId]);

  const fetchResults = async () => {
    const { data: attemptData, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    const { data: questionsData, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('question_number');

    if (!attemptError && !questionsError) {
      setAttempt(attemptData);
      setQuestions(questionsData);

      // Find missed questions
      const missed = questionsData.filter(q => {
        const answer = attemptData.answers[q.id];
        return answer && !answer.correct;
      });
      setMissedQuestions(missed);
    }
    setLoading(false);
  };

  const handleCreateFlashcard = async (question) => {
    const { error } = await supabase
      .from('flashcards')
      .insert([
        {
          front: question.question_text,
          back: question.correct_answer,
          slide_id: question.source_type === 'slide' ? question.source_id : null,
          next_review: new Date().toISOString(),
          interval_days: 1,
        }
      ]);

    if (!error) {
      alert('Flashcard created successfully!');
    }
  };

  const handleViewSource = async (question) => {
    if (question.source_type === 'flashcard') {
      navigate('/flashcards');
    } else if (question.source_type === 'slide') {
      const { data, error } = await supabase
        .from('slides')
        .select('*, presentations(*)')
        .eq('id', question.source_id)
        .single();

      if (!error && data) {
        navigate(`/slides/${data.presentation_id}`);
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading results...</div>;
  }

  const totalQuestions = questions.length;
  const correctCount = Object.values(attempt.answers).filter(a => a.correct).length;
  const scorePercentage = attempt.score;

  return (
    <div className="quiz-results">
      <div className="results-header">
        <h1>🎯 Quiz Results</h1>
      </div>

      <div className="score-summary">
        <div className="score-circle">
          <div className="score-percentage">{scorePercentage}%</div>
          <div className="score-fraction">
            {correctCount} / {totalQuestions}
          </div>
        </div>

        <div className="score-message">
          {scorePercentage >= 90 && '🌟 Excellent work!'}
          {scorePercentage >= 70 && scorePercentage < 90 && '👍 Good job!'}
          {scorePercentage >= 50 && scorePercentage < 70 && '📚 Keep studying!'}
          {scorePercentage < 50 && '💪 Review the material and try again!'}
        </div>
      </div>

      {missedQuestions.length > 0 && (
        <div className="missed-questions">
          <h2>Missed Questions ({missedQuestions.length})</h2>
          <p className="section-subtitle">Review these to improve your understanding</p>

          {missedQuestions.map((question, index) => {
            const userAnswer = attempt.answers[question.id]?.selected;

            return (
              <div key={question.id} className="missed-question-card">
                <div className="question-header">
                  <span className="question-number">Question {question.question_number}</span>
                </div>

                <div className="question-content">
                  <div className="question-text">{question.question_text}</div>

                  <div className="answer-comparison">
                    <div className="answer-item incorrect">
                      <div className="answer-label">Your Answer:</div>
                      <div className="answer-value">❌ {userAnswer}</div>
                    </div>

                    <div className="answer-item correct">
                      <div className="answer-label">Correct Answer:</div>
                      <div className="answer-value">✅ {question.correct_answer}</div>
                    </div>
                  </div>

                  <div className="question-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => handleCreateFlashcard(question)}
                    >
                      ➕ Create Flashcard
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => handleViewSource(question)}
                    >
                      📄 View Source
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {missedQuestions.length === 0 && (
        <div className="perfect-score">
          <h2>🎉 Perfect Score!</h2>
          <p>You got all questions correct!</p>
        </div>
      )}

      <div className="results-actions">
        <button
          className="btn-secondary"
          onClick={() => navigate('/quiz/generate')}
        >
          Create New Quiz
        </button>
        <button
          className="btn-primary"
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default QuizResults;
