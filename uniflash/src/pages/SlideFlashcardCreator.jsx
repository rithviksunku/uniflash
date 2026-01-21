import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { generateFlashcardsFromSlides } from '../services/openai';
import MultiSetSelector from '../components/MultiSetSelector';

const SlideFlashcardCreator = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { slideIds } = location.state || { slideIds: [] };

  // State management
  const [slides, setSlides] = useState([]);
  const [sets, setSets] = useState([]);
  const [selectedSetIds, setSelectedSetIds] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [flashcards, setFlashcards] = useState([]);
  const [generatingForSlide, setGeneratingForSlide] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newCard, setNewCard] = useState({ front: '', back: '' });
  const [showNewCardForm, setShowNewCardForm] = useState(false);

  // Ref for scrolling to cards
  const flashcardsRef = useRef(null);

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

  const handleGenerateForCurrentSlide = async () => {
    const currentSlide = slides[currentSlideIndex];
    setGeneratingForSlide(currentSlide.id);

    try {
      const aiGeneratedCards = await generateFlashcardsFromSlides([currentSlide]);

      // Add to flashcards with temp IDs and slide association
      const newCards = aiGeneratedCards.map((card, idx) => ({
        tempId: `ai-${currentSlide.id}-${Date.now()}-${idx}`,
        front: card.front || '',
        back: card.back || '',
        slide_id: currentSlide.id,
        isAiGenerated: true,
        isNew: true
      }));

      setFlashcards([...flashcards, ...newCards]);

      // Scroll to flashcards section
      setTimeout(() => {
        flashcardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);

    } catch (error) {
      console.error('Error generating flashcards:', error);
      alert(`Failed to generate flashcards: ${error.message}`);
    } finally {
      setGeneratingForSlide(null);
    }
  };

  const handleCreateManualCard = () => {
    if (!newCard.front.trim() || !newCard.back.trim()) {
      alert('Please fill in both front and back');
      return;
    }

    const currentSlide = slides[currentSlideIndex];
    const manualCard = {
      tempId: `manual-${currentSlide.id}-${Date.now()}`,
      front: newCard.front.trim(),
      back: newCard.back.trim(),
      slide_id: currentSlide.id,
      isAiGenerated: false,
      isNew: true
    };

    setFlashcards([...flashcards, manualCard]);
    setNewCard({ front: '', back: '' });
    setShowNewCardForm(false);

    // Scroll to flashcards section
    setTimeout(() => {
      flashcardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleEditCard = (tempId, field, value) => {
    setFlashcards(flashcards.map(card =>
      card.tempId === tempId ? { ...card, [field]: value } : card
    ));
  };

  const handleDeleteCard = (tempId) => {
    setFlashcards(flashcards.filter(card => card.tempId !== tempId));
  };

  const navigateToCardSlide = (slideId) => {
    const slideIndex = slides.findIndex(s => s.id === slideId);
    if (slideIndex !== -1) {
      setCurrentSlideIndex(slideIndex);
    }
  };

  const getSlideByCardId = (card) => {
    return slides.find(s => s.id === card.slide_id);
  };

  const handleSaveAll = async () => {
    if (flashcards.length === 0) {
      alert('No flashcards to save. Create some flashcards first!');
      return;
    }

    const validCards = flashcards.filter(card => card.front.trim() && card.back.trim());

    if (validCards.length === 0) {
      alert('No valid flashcards to save. Please ensure cards have both front and back content.');
      return;
    }

    setSaving(true);

    try {
      const cardsToSave = [];

      if (selectedSetIds.length > 0) {
        // Create a copy of each card for each selected set
        validCards.forEach(card => {
          selectedSetIds.forEach(setId => {
            const { tempId, isAiGenerated, isNew, ...cleanCard } = card;
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
          const { tempId, isAiGenerated, isNew, ...cleanCard } = card;
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

  if (slides.length === 0) {
    return (
      <div className="loading">Loading slides...</div>
    );
  }

  const currentSlide = slides[currentSlideIndex];
  const currentSlideCards = flashcards.filter(card => card.slide_id === currentSlide.id);
  const allCardsCount = flashcards.length;

  return (
    <div className="slide-flashcard-creator">
      <div className="creator-header">
        <div className="header-content">
          <h1>✨ Create Flashcards from Slides</h1>
          <p>Review each slide and create flashcards - AI-generated or manual</p>
        </div>
        <div className="header-actions">
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
            onClick={handleSaveAll}
            disabled={flashcards.length === 0 || saving}
          >
            {saving ? 'Saving...' : `💾 Save All (${allCardsCount})`}
          </button>
        </div>
      </div>

      <div className="creator-container">
        {/* Slide Viewer Panel */}
        <div className="slide-viewer-panel">
          <div className="panel-header">
            <h2>📄 Slide Viewer</h2>
            <div className="slide-navigation">
              <button
                className="btn-nav"
                onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                disabled={currentSlideIndex === 0}
              >
                ← Previous
              </button>
              <span className="slide-counter">
                {currentSlideIndex + 1} / {slides.length}
              </span>
              <button
                className="btn-nav"
                onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                disabled={currentSlideIndex === slides.length - 1}
              >
                Next →
              </button>
            </div>
          </div>

          <div className="slide-display">
            <div className="slide-number-badge">
              Slide {currentSlide.slide_number}
            </div>
            <h3 className="slide-title">{currentSlide.title || 'Untitled'}</h3>
            <div className="slide-content-viewer">
              {currentSlide.content}
            </div>
          </div>

          <div className="slide-actions">
            <button
              className="btn-ai-generate"
              onClick={handleGenerateForCurrentSlide}
              disabled={generatingForSlide === currentSlide.id}
            >
              {generatingForSlide === currentSlide.id ? (
                <>🤖 Generating...</>
              ) : (
                <>🤖 AI Generate Flashcards</>
              )}
            </button>
            <button
              className="btn-manual-create"
              onClick={() => setShowNewCardForm(!showNewCardForm)}
            >
              ➕ Create Manual Flashcard
            </button>
          </div>

          {showNewCardForm && (
            <div className="manual-card-form">
              <h4>Create Flashcard for This Slide</h4>
              <div className="form-group">
                <label>Front (Question):</label>
                <textarea
                  value={newCard.front}
                  onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                  placeholder="Enter the question..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Back (Answer):</label>
                <textarea
                  value={newCard.back}
                  onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                  placeholder="Enter the answer..."
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowNewCardForm(false);
                    setNewCard({ front: '', back: '' });
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleCreateManualCard}
                >
                  Add Flashcard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Flashcards Panel */}
        <div className="flashcards-panel" ref={flashcardsRef}>
          <div className="panel-header">
            <h2>🎴 Flashcards</h2>
            <div className="flashcard-stats">
              <span className="stat">
                <strong>{currentSlideCards.length}</strong> for this slide
              </span>
              <span className="stat">
                <strong>{allCardsCount}</strong> total
              </span>
            </div>
          </div>

          {currentSlideCards.length === 0 ? (
            <div className="empty-flashcards">
              <p>No flashcards yet for this slide</p>
              <p className="hint">Use AI Generate or create manually</p>
            </div>
          ) : (
            <div className="flashcards-list">
              {currentSlideCards.map((card) => (
                <div
                  key={card.tempId}
                  className={`flashcard-item ${card.isAiGenerated ? 'ai-generated' : 'manual'}`}
                >
                  <div className="flashcard-badge">
                    {card.isAiGenerated ? '🤖 AI' : '✍️ Manual'}
                    {card.isNew && <span className="new-badge">NEW</span>}
                  </div>

                  <div className="flashcard-content-wrapper">
                    {editingCard === card.tempId ? (
                      <div className="edit-mode-split">
                        <div className="edit-fields">
                          <div className="edit-field">
                            <label>Front:</label>
                            <textarea
                              value={card.front}
                              onChange={(e) => handleEditCard(card.tempId, 'front', e.target.value)}
                              rows={3}
                            />
                          </div>
                          <div className="edit-field">
                            <label>Back:</label>
                            <textarea
                              value={card.back}
                              onChange={(e) => handleEditCard(card.tempId, 'back', e.target.value)}
                              rows={3}
                            />
                          </div>
                          <div className="edit-actions">
                            <button
                              onClick={() => setEditingCard(null)}
                              className="btn-secondary btn-sm"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                        <div className="source-slide-view">
                          <div className="source-label">📄 Source Slide:</div>
                          <div className="source-slide-content">
                            <div className="source-slide-title">
                              {getSlideByCardId(card)?.title || 'Untitled'}
                            </div>
                            <div className="source-slide-text">
                              {getSlideByCardId(card)?.content}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="view-mode-split">
                        <div className="flashcard-preview">
                          <div className="flashcard-side">
                            <div className="side-label">Front:</div>
                            <div className="side-content">{card.front}</div>
                          </div>
                          <div className="flashcard-divider">•••</div>
                          <div className="flashcard-side">
                            <div className="side-label">Back:</div>
                            <div className="side-content">{card.back}</div>
                          </div>
                          <div className="card-actions">
                            <button
                              onClick={() => setEditingCard(card.tempId)}
                              className="btn-icon"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteCard(card.tempId)}
                              className="btn-icon btn-danger"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <div className="source-slide-view">
                          <div className="source-label">📄 Source Slide:</div>
                          <div className="source-slide-content">
                            <div className="source-slide-title">
                              {getSlideByCardId(card)?.title || 'Untitled'}
                            </div>
                            <div className="source-slide-text">
                              {getSlideByCardId(card)?.content}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {allCardsCount > currentSlideCards.length && (
            <div className="other-slides-section">
              <div className="other-slides-header">
                <h3>📚 All Flashcards ({allCardsCount})</h3>
                <p className="hint">Click on a card to view its source slide</p>
              </div>
              <div className="all-flashcards-list">
                {flashcards.map((card) => {
                  const sourceSlide = getSlideByCardId(card);
                  const isCurrentSlide = card.slide_id === slides[currentSlideIndex]?.id;
                  return (
                    <div
                      key={card.tempId}
                      className={`flashcard-compact ${isCurrentSlide ? 'current' : ''}`}
                      onClick={() => navigateToCardSlide(card.slide_id)}
                    >
                      <div className="compact-header">
                        <span className="compact-badge">
                          {card.isAiGenerated ? '🤖' : '✍️'}
                        </span>
                        <span className="compact-slide-ref">
                          Slide {sourceSlide?.slide_number}
                        </span>
                        {isCurrentSlide && <span className="current-badge">CURRENT</span>}
                      </div>
                      <div className="compact-content">
                        <div className="compact-front">{card.front}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="creator-footer">
        <button
          className="btn-secondary"
          onClick={() => navigate('/dashboard')}
        >
          Cancel
        </button>
        <div className="footer-info">
          {allCardsCount === 0 ? (
            <span className="hint">Create some flashcards to save</span>
          ) : (
            <span className="ready">Ready to save {allCardsCount} flashcard(s)</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SlideFlashcardCreator;
