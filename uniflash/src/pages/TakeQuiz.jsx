import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const TakeQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    const { data: questionsData, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('question_number');

    if (!quizError && !questionsError) {
      setQuiz(quizData);
      setQuestions(questionsData);
    }
    setLoading(false);
  };

  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer);
  };

  const handleNext = () => {
    if (selectedAnswer === null) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correct_answer;

    setAnswers({
      ...answers,
      [currentQuestion.id]: {
        selected: selectedAnswer,
        correct: isCorrect,
        questionId: currentQuestion.id,
      }
    });

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correct_answer;

    const finalAnswers = {
      ...answers,
      [currentQuestion.id]: {
        selected: selectedAnswer,
        correct: isCorrect,
        questionId: currentQuestion.id,
      }
    };

    const correctCount = Object.values(finalAnswers).filter(a => a.correct).length;
    const score = Math.round((correctCount / questions.length) * 100);

    // Save quiz attempt
    const { data: attempt, error } = await supabase
      .from('quiz_attempts')
      .insert([
        {
          quiz_id: quizId,
          score: score,
          total_questions: questions.length,
          answers: finalAnswers,
          completed_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error submitting quiz:', error);
      alert(`Failed to submit quiz: ${error.message}\n\nPlease run the ADD_QUIZ_COLUMNS.sql migration in your Supabase dashboard.`);
      return;
    }

    if (attempt) {
      navigate(`/quiz/${quizId}/results/${attempt.id}`);
    }
  };

  if (loading) {
    return <div className="loading">Loading quiz...</div>;
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="quiz-error">
        <h2>Quiz not found</h2>
        <button className="btn-primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="take-quiz">
      <div className="quiz-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-text">
          Question {currentQuestionIndex + 1} of {questions.length}
        </div>
      </div>

      <div className="quiz-question">
        <h2 className="question-text">{currentQuestion.question_text}</h2>

        <div className="answer-options">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              className={`answer-option ${selectedAnswer === option ? 'selected' : ''}`}
              onClick={() => handleAnswerSelect(option)}
            >
              <span className="option-letter">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="option-text">{option}</span>
            </button>
          ))}
        </div>

        <div className="quiz-actions">
          <button
            className="btn-primary btn-large"
            onClick={handleNext}
            disabled={selectedAnswer === null}
          >
            {currentQuestionIndex === questions.length - 1 ? 'Submit Quiz' : 'Next Question →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TakeQuiz;
