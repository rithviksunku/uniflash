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
  const [editedAnswers, setEditedAnswers] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const toggleAnswerCorrectness = (questionId) => {
    setEditedAnswers(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const handleSaveEdits = async () => {
    setSaving(true);

    // Create updated answers object
    const updatedAnswers = { ...attempt.answers };

    // Apply all edits
    Object.keys(editedAnswers).forEach(questionId => {
      if (updatedAnswers[questionId]) {
        updatedAnswers[questionId].correct = editedAnswers[questionId];
      }
    });

    // Recalculate score
    const newCorrectCount = Object.values(updatedAnswers).filter(a => a.correct).length;
    const newScore = Math.round((newCorrectCount / questions.length) * 100);

    // Update database
    const { error } = await supabase
      .from('quiz_attempts')
      .update({
        answers: updatedAnswers,
        score: newScore,
        manually_edited: true
      })
      .eq('id', attemptId);

    if (!error) {
      // Refresh data
      await fetchResults();
      setEditedAnswers({});
      setIsEditing(false);
      alert('Score updated successfully!');
    } else {
      alert(`Failed to save changes: ${error.message}`);
    }

    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditedAnswers({});
    setIsEditing(false);
  };

  if (loading) {
    return <div className="loading">Loading results...</div>;
  }

  const totalQuestions = questions.length;
  const correctCount = Object.values(attempt.answers).filter(a => a.correct).length;
  const scorePercentage = attempt.score;

  // Calculate current score with edits
  const getCurrentCorrectCount = () => {
    let count = 0;
    Object.keys(attempt.answers).forEach(qId => {
      const isCorrect = editedAnswers.hasOwnProperty(qId)
        ? editedAnswers[qId]
        : attempt.answers[qId].correct;
      if (isCorrect) count++;
    });
    return count;
  };

  const currentCorrectCount = isEditing ? getCurrentCorrectCount() : correctCount;
  const currentScorePercentage = isEditing
    ? Math.round((currentCorrectCount / totalQuestions) * 100)
    : scorePercentage;

  return (
    <div className="quiz-results">
      <div className="results-header">
        <h1>🎯 Quiz Results</h1>
        {attempt.manually_edited && !isEditing && (
          <div className="edited-badge">✏️ Manually Edited</div>
        )}
      </div>

      <div className="score-summary">
        <div className="score-circle">
          <div className="score-percentage">{currentScorePercentage}%</div>
          <div className="score-fraction">
            {currentCorrectCount} / {totalQuestions}
          </div>
          {isEditing && Object.keys(editedAnswers).length > 0 && (
            <div className="edit-indicator">Unsaved changes</div>
          )}
        </div>

        <div className="score-message">
          {currentScorePercentage >= 90 && '🌟 Excellent work!'}
          {currentScorePercentage >= 70 && currentScorePercentage < 90 && '👍 Good job!'}
          {currentScorePercentage >= 50 && currentScorePercentage < 70 && '📚 Keep studying!'}
          {currentScorePercentage < 50 && '💪 Review the material and try again!'}
        </div>
      </div>

      {!isEditing && (
        <div className="edit-score-actions">
          <button
            className="btn-secondary"
            onClick={() => setIsEditing(true)}
          >
            ✏️ Edit Score
          </button>
        </div>
      )}

      {isEditing && (
        <div className="edit-mode-banner">
          <span className="banner-text">📝 Edit Mode: Click on any answer to toggle correctness</span>
          <div className="edit-actions">
            <button
              className="btn-secondary"
              onClick={handleCancelEdit}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSaveEdits}
              disabled={saving || Object.keys(editedAnswers).length === 0}
            >
              {saving ? 'Saving...' : `Save Changes (${Object.keys(editedAnswers).length})`}
            </button>
          </div>
        </div>
      )}

      {isEditing ? (
        <div className="all-questions">
          <h2>All Questions ({questions.length})</h2>
          <p className="section-subtitle">Click on any answer to mark it as correct/incorrect</p>

          {questions.map((question) => {
            const userAnswer = attempt.answers[question.id]?.selected;
            const originallyCorrect = attempt.answers[question.id]?.correct;
            const isCurrentlyCorrect = editedAnswers.hasOwnProperty(question.id)
              ? editedAnswers[question.id]
              : originallyCorrect;
            const wasEdited = editedAnswers.hasOwnProperty(question.id);

            return (
              <div
                key={question.id}
                className={`question-card editable ${isCurrentlyCorrect ? 'correct-answer' : 'incorrect-answer'} ${wasEdited ? 'edited' : ''}`}
                onClick={() => toggleAnswerCorrectness(question.id)}
              >
                <div className="question-header">
                  <span className="question-number">Question {question.question_number}</span>
                  {wasEdited && <span className="edited-indicator">Modified</span>}
                  <span className={`correctness-badge ${isCurrentlyCorrect ? 'correct' : 'incorrect'}`}>
                    {isCurrentlyCorrect ? '✅ Correct' : '❌ Incorrect'}
                  </span>
                </div>

                <div className="question-content">
                  <div className="question-text">{question.question_text}</div>

                  <div className="answer-comparison">
                    <div className="answer-item">
                      <div className="answer-label">User Answer:</div>
                      <div className="answer-value">{userAnswer}</div>
                    </div>

                    <div className="answer-item">
                      <div className="answer-label">Correct Answer:</div>
                      <div className="answer-value">{question.correct_answer}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        missedQuestions.length > 0 && (
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
        )
      )}

      {!isEditing && missedQuestions.length === 0 && (
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
