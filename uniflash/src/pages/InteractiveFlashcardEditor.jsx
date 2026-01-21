import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { generateFlashcardsFromSlides, cleanupFlashcardGrammar } from '../services/openai';
import MultiSetSelector from '../components/MultiSetSelector';

const InteractiveFlashcardEditor = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { slideIds } = location.state || { slideIds: [] };

  // State management
  const [slides, setSlides] = useState([]);
  const [sets, setSets] = useState([]);
  const [selectedSetIds, setSelectedSetIds] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [editingCard, setEditingCard] = useState(null);
  const [aiSuggesting, setAiSuggesting] = useState(null);
  const [selectedSlideId, setSelectedSlideId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (slideIds.length > 0) {
      fetchSlides();
      fetchSets();
    }
  }, [slideIds]);

  const fetchSlides = async () => {
    const { data, error } = await supabase
      .from('slides')
      .select('*')
      .in('id', slideIds)
      .order('slide_number');

    if (!error && data) {
      setSlides(data);
    }
  };

  const fetchSets = async () => {
    const { data, error } = await supabase
      .from('flashcard_sets')
      .select('*')
      .order('name');

    if (!error) {
      setSets(data || []);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      const aiGeneratedCards = await generateFlashcardsFromSlides(slides);

      const cards = aiGeneratedCards.map((card, idx) => ({
        ...card,
        tempId: `ai-${idx}`,
        front: card.front || '',
        back: card.back || '',
        slide_id: card.slide_id,
        isEdited: false,
        originalFront: card.front || '',
        originalBack: card.back || ''
      }));

      setGeneratedCards(cards);
      setSelectedCards(new Set(cards.map(c => c.tempId)));
    } catch (error) {
      console.error('Error generating flashcards:', error);
      alert(`Failed to generate flashcards: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const toggleCard = (tempId) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(tempId)) {
      newSelected.delete(tempId);
    } else {
      newSelected.add(tempId);
    }
    setSelectedCards(newSelected);
  };

  const handleEditCard = (tempId, field, value) => {
    setGeneratedCards(generatedCards.map(card => {
      if (card.tempId === tempId) {
        const isChanged = value !== card[`original${field.charAt(0).toUpperCase() + field.slice(1)}`];
        return {
          ...card,
          [field]: value,
          isEdited: isChanged || (field === 'front' ? card.back !== card.originalBack : card.front !== card.originalFront)
        };
      }
      return card;
    }));
  };

  const handleAiSuggest = async (card) => {
    setAiSuggesting(card.tempId);

    try {
      const improved = await cleanupFlashcardGrammar(card.front, card.back);

      setGeneratedCards(generatedCards.map(c =>
        c.tempId === card.tempId
          ? {
              ...c,
              aiSuggestion: improved,
              showSuggestion: true
            }
          : c
      ));
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
      alert('Failed to get AI suggestion. Please try again.');
    } finally {
      setAiSuggesting(null);
    }
  };

  const applyAiSuggestion = (tempId) => {
    setGeneratedCards(generatedCards.map(card => {
      if (card.tempId === tempId && card.aiSuggestion) {
        return {
          ...card,
          front: card.aiSuggestion.front,
          back: card.aiSuggestion.back,
          isEdited: true,
          showSuggestion: false
        };
      }
      return card;
    }));
  };

  const dismissAiSuggestion = (tempId) => {
    setGeneratedCards(generatedCards.map(card =>
      card.tempId === tempId ? { ...card, showSuggestion: false } : card
    ));
  };

  const deleteCard = (tempId) => {
    setGeneratedCards(generatedCards.filter(card => card.tempId !== tempId));
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      newSet.delete(tempId);
      return newSet;
    });
  };

  const addNewCard = (slideId = null) => {
    const tempId = `manual-${Date.now()}`;
    const newCard = {
      tempId,
      front: '',
      back: '',
      slide_id: slideId,
      isEdited: false,
      originalFront: '',
      originalBack: ''
    };

    setGeneratedCards([...generatedCards, newCard]);
    setSelectedCards(prev => new Set([...prev, tempId]));
    setEditingCard(tempId);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const validCards = generatedCards
        .filter(card => selectedCards.has(card.tempId))
        .filter(card => card.front.trim() && card.back.trim()); // Only save cards with content

      if (validCards.length === 0) {
        alert('No valid flashcards to save. Please ensure cards have both front and back content.');
        setSaving(false);
        return;
      }

      // If multiple sets selected, create copies for each set
      // If no sets selected, create one unassigned copy
      const cardsToSave = [];

      if (selectedSetIds.length > 0) {
        // Create a copy of each card for each selected set
        validCards.forEach(card => {
          selectedSetIds.forEach(setId => {
            const { tempId, isEdited, originalFront, originalBack, aiSuggestion, showSuggestion, ...cleanCard } = card;
            cardsToSave.push({
              ...cleanCard,
              set_id: setId,
              next_review: new Date().toISOString(),
              interval_days: 1,
              is_flagged: false
            });
          });
        });
      } else {
        // No sets selected, create unassigned cards
        validCards.forEach(card => {
          const { tempId, isEdited, originalFront, originalBack, aiSuggestion, showSuggestion, ...cleanCard } = card;
          cardsToSave.push({
            ...cleanCard,
            set_id: null,
            next_review: new Date().toISOString(),
            interval_days: 1,
            is_flagged: false
          });
        });
      }

      const { error } = await supabase
        .from('flashcards')
        .insert(cardsToSave);

      if (!error) {
        navigate('/flashcards');
      } else {
        throw error;
      }
    } catch (error) {
      console.error('Error saving flashcards:', error);
      alert(`Failed to save flashcards: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const highlightSlide = (slideId) => {
    setSelectedSlideId(slideId);
    // Scroll to slide
    const slideElement = document.getElementById(`slide-${slideId}`);
    if (slideElement) {
      slideElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const getSlideForCard = (card) => {
    return slides.find(s => s.id === card.slide_id);
  };

  return (
    <div className="interactive-editor">
      <div className="editor-header">
        <div className="header-content">
          <h1>✨ Interactive Flashcard Editor</h1>
          <p>
            {generatedCards.length === 0
              ? `Generate flashcards from ${slides.length} selected ${slides.length === 1 ? 'slide' : 'slides'}`
              : `Review and edit ${generatedCards.length} AI-generated flashcards`}
          </p>
        </div>
        <div className="header-actions">
          {generatedCards.length > 0 && (
            <>
              <div style={{ minWidth: '300px' }}>
                <MultiSetSelector
                  selectedSets={selectedSetIds}
                  onSelectionChange={setSelectedSetIds}
                  sets={sets}
                  label="Assign to Sets"
                />
                {selectedSetIds.length > 1 && (
                  <div className="multi-set-info" style={{ marginTop: '0.5rem' }}>
                    ℹ️ Cards will be added to {selectedSetIds.length} sets
                  </div>
                )}
              </div>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={selectedCards.size === 0 || saving}
              >
                {saving ? 'Saving...' : `💾 Save Selected (${selectedCards.size})`}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="editor-container">
        {/* Document Viewer Panel */}
        <div className="document-panel">
          <div className="panel-header">
            <h2>📄 Source Document</h2>
            <p>{slides.length} {slides.length === 1 ? 'slide' : 'slides'}</p>
          </div>
          <div className="slides-viewer">
            {slides.map((slide) => (
              <div
                key={slide.id}
                id={`slide-${slide.id}`}
                className={`slide-view ${selectedSlideId === slide.id ? 'highlighted' : ''}`}
              >
                <div className="slide-header">
                  <span className="slide-number">Slide {slide.slide_number}</span>
                  <button
                    className="btn-add-card"
                    onClick={() => addNewCard(slide.id)}
                    title="Add flashcard from this slide"
                  >
                    + Add Card
                  </button>
                </div>
                <h3 className="slide-title">{slide.title || 'Untitled'}</h3>
                <div className="slide-content">
                  {slide.content}
                </div>
                <div className="slide-stats">
                  {generatedCards.filter(c => c.slide_id === slide.id).length} flashcard(s) from this slide
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Flashcards Editor Panel */}
        <div className="flashcards-panel">
          <div className="panel-header">
            <h2>🎴 Flashcards</h2>
            <div className="panel-actions">
              {generatedCards.length === 0 ? (
                <button
                  className="btn-generate"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? '⏳ Generating with AI...' : '✨ Generate Flashcards'}
                </button>
              ) : (
                <>
                  <button
                    className="btn-secondary"
                    onClick={() => addNewCard()}
                  >
                    + Add Card Manually
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={handleGenerate}
                    disabled={generating}
                  >
                    {generating ? '⏳ Regenerating...' : '🔄 Regenerate All'}
                  </button>
                </>
              )}
            </div>
          </div>

          {generatedCards.length > 0 && (
            <div className="selection-bar">
              <div className="selection-info">
                <input
                  type="checkbox"
                  checked={selectedCards.size === generatedCards.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCards(new Set(generatedCards.map(c => c.tempId)));
                    } else {
                      setSelectedCards(new Set());
                    }
                  }}
                />
                <span>{selectedCards.size} of {generatedCards.length} selected</span>
              </div>
            </div>
          )}

          <div className="flashcards-list">
            {generatedCards.map((card, index) => {
              const sourceSlide = getSlideForCard(card);

              return (
                <div
                  key={card.tempId}
                  className={`flashcard-editor ${selectedCards.has(card.tempId) ? 'selected' : ''} ${editingCard === card.tempId ? 'editing' : ''}`}
                >
                  <div className="card-header">
                    <div className="card-header-left">
                      <input
                        type="checkbox"
                        checked={selectedCards.has(card.tempId)}
                        onChange={() => toggleCard(card.tempId)}
                      />
                      <span className="card-number">Card {index + 1}</span>
                      {card.isEdited && <span className="edited-badge">✏️ Edited</span>}
                    </div>
                    <div className="card-header-right">
                      {sourceSlide && (
                        <button
                          className="btn-source"
                          onClick={() => highlightSlide(sourceSlide.id)}
                          title="Show source slide"
                        >
                          📍 Slide {sourceSlide.slide_number}
                        </button>
                      )}
                      <button
                        className="btn-icon"
                        onClick={() => handleAiSuggest(card)}
                        disabled={aiSuggesting === card.tempId}
                        title="Get AI suggestions"
                      >
                        {aiSuggesting === card.tempId ? '⏳' : '🤖'}
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        onClick={() => deleteCard(card.tempId)}
                        title="Delete card"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {card.showSuggestion && card.aiSuggestion && (
                    <div className="ai-suggestion">
                      <div className="suggestion-header">
                        <span className="suggestion-title">🤖 AI Suggestion</span>
                        <div className="suggestion-actions">
                          <button
                            className="btn-apply"
                            onClick={() => applyAiSuggestion(card.tempId)}
                          >
                            ✓ Apply
                          </button>
                          <button
                            className="btn-dismiss"
                            onClick={() => dismissAiSuggestion(card.tempId)}
                          >
                            ✗ Dismiss
                          </button>
                        </div>
                      </div>
                      <div className="suggestion-content">
                        <div className="suggestion-field">
                          <strong>Front:</strong> {card.aiSuggestion.front}
                        </div>
                        <div className="suggestion-field">
                          <strong>Back:</strong> {card.aiSuggestion.back}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="card-fields">
                    <div className="edit-field">
                      <label>Front (Question):</label>
                      <textarea
                        value={card.front}
                        onChange={(e) => handleEditCard(card.tempId, 'front', e.target.value)}
                        onFocus={() => setEditingCard(card.tempId)}
                        onBlur={() => setEditingCard(null)}
                        placeholder="Enter the question or prompt..."
                        rows={3}
                      />
                    </div>
                    <div className="edit-field">
                      <label>Back (Answer):</label>
                      <textarea
                        value={card.back}
                        onChange={(e) => handleEditCard(card.tempId, 'back', e.target.value)}
                        onFocus={() => setEditingCard(card.tempId)}
                        onBlur={() => setEditingCard(null)}
                        placeholder="Enter the answer or explanation..."
                        rows={3}
                      />
                    </div>
                  </div>

                  {sourceSlide && (
                    <div className="card-source-preview">
                      <span className="source-label">Source:</span>
                      <span className="source-content">
                        "{sourceSlide.content.substring(0, 100)}..."
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {generatedCards.length === 0 && !generating && (
              <div className="empty-state">
                <div className="empty-icon">✨</div>
                <h3>Ready to create flashcards</h3>
                <p>Click "Generate Flashcards" to use AI to automatically create flashcards from your selected slides.</p>
                <p>Or manually add cards by clicking the "+ Add Card" button on any slide.</p>
              </div>
            )}

            {generating && (
              <div className="generating-state">
                <div className="spinner"></div>
                <h3>🤖 AI is generating your flashcards...</h3>
                <p>Analyzing {slides.length} slides and creating smart study materials</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      {generatedCards.length > 0 && (
        <div className="editor-footer">
          <div className="footer-left">
            <button
              className="btn-secondary"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </button>
          </div>
          <div className="footer-right">
            <span className="footer-info">
              {selectedCards.size} flashcard{selectedCards.size !== 1 ? 's' : ''} selected
            </span>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={selectedCards.size === 0 || saving}
            >
              {saving ? 'Saving...' : `💾 Save Selected Flashcards`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveFlashcardEditor;
