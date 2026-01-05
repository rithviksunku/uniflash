import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const GenerateQuiz = () => {
  const navigate = useNavigate();
  const [source, setSource] = useState('flashcards');
  const [flashcards, setFlashcards] = useState([]);
  const [slides, setSlides] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [questionCount, setQuestionCount] = useState(5);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchFlashcards();
    fetchSlides();
  }, []);

  const fetchFlashcards = async () => {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setFlashcards(data);
    }
  };

  const fetchSlides = async () => {
    const { data, error } = await supabase
      .from('slides')
      .select(`
        *,
        presentations (
          title
        )
      `)
      .order('created_at', { ascending: false });

    if (!error) {
      setSlides(data);
    }
  };

  const toggleItem = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    const items = source === 'flashcards' ? flashcards : slides;
    setSelectedItems(new Set(items.map(item => item.id)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const handleGenerate = async () => {
    if (selectedItems.size === 0) return;

    setGenerating(true);

    const selectedIds = Array.from(selectedItems);
    let sourceData;

    if (source === 'flashcards') {
      const { data } = await supabase
        .from('flashcards')
        .select('*')
        .in('id', selectedIds);
      sourceData = data;
    } else {
      const { data } = await supabase
        .from('slides')
        .select('*')
        .in('id', selectedIds);
      sourceData = data;
    }

    // Generate quiz questions
    const questions = generateQuestions(sourceData, questionCount, source);

    // Save quiz to database
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert([
        {
          title: `Quiz - ${new Date().toLocaleDateString()}`,
          created_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (!quizError) {
      // Save questions
      const questionsToInsert = questions.map((q, idx) => ({
        quiz_id: quiz.id,
        question_number: idx + 1,
        question_text: q.question,
        correct_answer: q.correctAnswer,
        options: q.options,
        source_id: q.sourceId,
        source_type: source === 'flashcards' ? 'flashcard' : 'slide',
      }));

      await supabase
        .from('quiz_questions')
        .insert(questionsToInsert);

      navigate(`/quiz/${quiz.id}`);
    }

    setGenerating(false);
  };

  const generateQuestions = (sourceData, count, type) => {
    const questions = [];
    const itemsToUse = sourceData.slice(0, Math.min(count, sourceData.length));

    itemsToUse.forEach(item => {
      let question, correctAnswer;

      if (type === 'flashcards') {
        question = item.front;
        correctAnswer = item.back;
      } else {
        const lines = item.content.split('\n').filter(l => l.trim());
        question = `${item.title}: What is covered in this slide?`;
        correctAnswer = lines[0] || item.title;
      }

      // Generate distractors (simple version - you can enhance this)
      const distractors = generateDistractors(correctAnswer, sourceData, type);
      const options = [correctAnswer, ...distractors]
        .sort(() => Math.random() - 0.5)
        .slice(0, 4);

      questions.push({
        question,
        correctAnswer,
        options,
        sourceId: item.id,
      });
    });

    return questions;
  };

  const generateDistractors = (correctAnswer, allData, type) => {
    const distractors = [];
    const shuffled = [...allData].sort(() => Math.random() - 0.5);

    for (const item of shuffled) {
      if (distractors.length >= 3) break;

      let distractor;
      if (type === 'flashcards') {
        distractor = item.back;
      } else {
        const lines = item.content.split('\n').filter(l => l.trim());
        distractor = lines[0] || item.title;
      }

      if (distractor !== correctAnswer && !distractors.includes(distractor)) {
        distractors.push(distractor);
      }
    }

    // Fill remaining with generic distractors if needed
    while (distractors.length < 3) {
      distractors.push(`Option ${distractors.length + 1}`);
    }

    return distractors;
  };

  const items = source === 'flashcards' ? flashcards : slides;

  return (
    <div className="generate-quiz">
      <div className="quiz-header">
        <h1>🎯 Generate Quiz</h1>
        <p>Create a multiple-choice quiz from your content</p>
      </div>

      <div className="quiz-config">
        <div className="config-section">
          <label>Source:</label>
          <div className="source-options">
            <button
              className={`source-btn ${source === 'flashcards' ? 'active' : ''}`}
              onClick={() => {
                setSource('flashcards');
                setSelectedItems(new Set());
              }}
            >
              🎴 Flashcards
            </button>
            <button
              className={`source-btn ${source === 'slides' ? 'active' : ''}`}
              onClick={() => {
                setSource('slides');
                setSelectedItems(new Set());
              }}
            >
              📄 Slides
            </button>
          </div>
        </div>

        <div className="config-section">
          <label htmlFor="question-count">Number of Questions:</label>
          <input
            id="question-count"
            type="number"
            min="1"
            max={Math.min(20, items.length)}
            value={questionCount}
            onChange={(e) => setQuestionCount(parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="selection-actions">
        <div className="selection-info">
          {selectedItems.size} of {items.length} selected
        </div>
        <div className="selection-buttons">
          <button onClick={selectAll} className="btn-secondary">
            Select All
          </button>
          <button onClick={deselectAll} className="btn-secondary">
            Deselect All
          </button>
        </div>
      </div>

      <div className="items-grid">
        {items.map((item) => (
          <div
            key={item.id}
            className={`item-card ${selectedItems.has(item.id) ? 'selected' : ''}`}
            onClick={() => toggleItem(item.id)}
          >
            {source === 'flashcards' ? (
              <>
                <div className="item-front">{item.front}</div>
                <div className="item-back">{item.back}</div>
              </>
            ) : (
              <>
                <div className="item-title">{item.title}</div>
                <div className="item-preview">
                  {item.content.substring(0, 100)}...
                </div>
              </>
            )}
            {selectedItems.has(item.id) && (
              <div className="selected-indicator">✓</div>
            )}
          </div>
        ))}
      </div>

      <div className="quiz-footer">
        <button
          className="btn-secondary"
          onClick={() => navigate('/dashboard')}
        >
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={handleGenerate}
          disabled={selectedItems.size === 0 || generating}
        >
          {generating ? 'Generating...' : `Generate Quiz (${Math.min(questionCount, selectedItems.size)} questions)`}
        </button>
      </div>
    </div>
  );
};

export default GenerateQuiz;
