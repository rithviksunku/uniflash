import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { generateQuizFromFlashcards, generateQuizFromSlides } from '../services/openai';

const GenerateQuiz = () => {
  const navigate = useNavigate();
  const [source, setSource] = useState('flashcards');
  const [flashcards, setFlashcards] = useState([]);
  const [slides, setSlides] = useState([]);
  const [sets, setSets] = useState([]);
  const [selectedSets, setSelectedSets] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [questionCount, setQuestionCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showSetSelector, setShowSetSelector] = useState(false);

  useEffect(() => {
    fetchSets();
    fetchSlides();
  }, []);

  useEffect(() => {
    if (source === 'flashcards') {
      fetchFlashcards();
    }
  }, [selectedSets, source]);

  const fetchSets = async () => {
    const { data, error } = await supabase
      .from('flashcard_sets')
      .select('*')
      .order('name');

    if (!error) {
      setSets(data || []);
    }
  };

  const fetchFlashcards = async () => {
    let query = supabase
      .from('flashcards')
      .select(`
        *,
        flashcard_sets (
          name,
          color,
          icon
        )
      `);

    // Filter by selected sets if any
    if (selectedSets.length > 0) {
      query = query.in('set_id', selectedSets);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error) {
      setFlashcards(data || []);
    }
  };

  const toggleSetSelection = (setId) => {
    if (selectedSets.includes(setId)) {
      setSelectedSets(selectedSets.filter(id => id !== setId));
    } else {
      setSelectedSets([...selectedSets, setId]);
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

    try {
      const selectedIds = Array.from(selectedItems);
      let sourceData;
      let questions;

      if (source === 'flashcards') {
        const { data } = await supabase
          .from('flashcards')
          .select('*')
          .in('id', selectedIds);
        sourceData = data;

        // Use OpenAI to generate quiz questions from flashcards
        questions = await generateQuizFromFlashcards(sourceData, questionCount);
      } else {
        const { data } = await supabase
          .from('slides')
          .select('*')
          .in('id', selectedIds);
        sourceData = data;

        // Use OpenAI to generate quiz questions from slides
        questions = await generateQuizFromSlides(sourceData, questionCount);
      }

      // Save quiz to database
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert([
          {
            title: `Quiz - ${new Date().toLocaleDateString()}`,
            question_count: questions.length,
            created_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (quizError) throw quizError;

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
    } catch (error) {
      setError(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const items = source === 'flashcards' ? flashcards : slides;

  return (
    <div className="generate-quiz">
      <div className="quiz-header">
        <h1>🎯 Generate Quiz</h1>
        <p>Create a multiple-choice quiz from your content using AI</p>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

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

        {source === 'flashcards' && (
          <div className="config-section">
            <button
              className="btn-secondary"
              onClick={() => setShowSetSelector(!showSetSelector)}
            >
              📚 Filter by Sets {selectedSets.length > 0 && `(${selectedSets.length})`}
            </button>
          </div>
        )}

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

      {showSetSelector && source === 'flashcards' && (
        <div className="set-selector">
          <h3>Select Sets to Include:</h3>
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
                  onChange={() => {}}
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
              Clear All Sets
            </button>
          )}
        </div>
      )}

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
