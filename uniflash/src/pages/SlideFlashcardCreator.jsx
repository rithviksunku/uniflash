import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { generateFlashcardsFromSlides } from '../services/openai';
import { renderPDFPageToImage } from '../services/pdfParser';
import MultiSetSelector from '../components/MultiSetSelector';
import ImageCropper from '../components/ImageCropper';

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
  const [newCard, setNewCard] = useState({ front: '', back: '', image_url: null });
  const [showAllCards, setShowAllCards] = useState(false);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [showCropper, setShowCropper] = useState(false);

  // PDF preview state
  const [presentation, setPresentation] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const [pageImages, setPageImages] = useState({});
  const [loadingImage, setLoadingImage] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

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
      .select('*, presentations(*)')
      .in('id', slideIds)
      .order('slide_number');

    if (!error && data) {
      setSlides(data);
      // Get presentation info for PDF preview
      if (data.length > 0 && data[0].presentations) {
        const pres = data[0].presentations;
        setPresentation(pres);
        // Load PDF data if it's a PDF file
        if (pres.file_type === 'pdf') {
          loadPdfData(pres.file_path);
        }
      }
    }
  };

  const loadPdfData = async (filePath) => {
    try {
      console.log('Loading PDF from path:', filePath);
      const { data, error } = await supabase.storage
        .from('presentations')
        .download(filePath);

      if (error) {
        console.error('Error downloading PDF:', error);
        return;
      }

      if (!data) {
        console.error('No data returned from storage');
        return;
      }

      console.log('PDF blob received, size:', data.size);
      const arrayBuffer = await data.arrayBuffer();
      console.log('ArrayBuffer created, size:', arrayBuffer.byteLength);
      setPdfData(arrayBuffer);
    } catch (err) {
      console.error('Error loading PDF data:', err);
    }
  };

  const loadPageImage = async (pageNumber) => {
    if (!pdfData || pageImages[pageNumber] || loadingImage) return;

    setLoadingImage(true);
    try {
      // Use scale 1.5 for good quality without being too slow
      const imageUrl = await renderPDFPageToImage(pdfData, pageNumber, 1.5);
      setPageImages(prev => ({ ...prev, [pageNumber]: imageUrl }));
    } catch (err) {
      console.error('Error rendering PDF page:', err);
      // Try again with lower scale if failed
      try {
        const imageUrl = await renderPDFPageToImage(pdfData, pageNumber, 1.0);
        setPageImages(prev => ({ ...prev, [pageNumber]: imageUrl }));
      } catch (retryErr) {
        console.error('Retry also failed:', retryErr);
      }
    } finally {
      setLoadingImage(false);
    }
  };

  // Load image when slide changes
  useEffect(() => {
    if (pdfData && slides.length > 0 && showPreview) {
      const currentSlide = slides[currentSlideIndex];
      if (currentSlide) {
        loadPageImage(currentSlide.slide_number);
      }
    }
  }, [pdfData, currentSlideIndex, slides, showPreview]);

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
        image_url: null, // Can be set to slide image if needed
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

  // Add image from current slide to a flashcard
  const handleAddImageToCard = (tempId) => {
    const currentSlide = slides[currentSlideIndex];
    const imageUrl = pageImages[currentSlide.slide_number];
    if (imageUrl) {
      setFlashcards(flashcards.map(card =>
        card.tempId === tempId ? { ...card, image_url: imageUrl } : card
      ));
    }
  };

  // Remove image from a flashcard
  const handleRemoveImageFromCard = (tempId) => {
    setFlashcards(flashcards.map(card =>
      card.tempId === tempId ? { ...card, image_url: null } : card
    ));
  };

  // Open cropper to create image flashcard
  const handleCreateImageCard = () => {
    const currentSlide = slides[currentSlideIndex];
    const imageUrl = pageImages[currentSlide.slide_number];
    if (!imageUrl) {
      alert('Please wait for the slide image to load first');
      return;
    }
    setShowCropper(true);
  };

  // Handle cropped image from cropper
  const handleCroppedImage = (croppedImageUrl) => {
    const currentSlide = slides[currentSlideIndex];

    const imageCard = {
      tempId: `image-${currentSlide.id}-${Date.now()}`,
      front: `What is shown in this diagram from Slide ${currentSlide.slide_number}?`,
      back: '',
      slide_id: currentSlide.id,
      image_url: croppedImageUrl,
      isAiGenerated: false,
      isNew: true
    };

    setFlashcards([...flashcards, imageCard]);
    setEditingCard(imageCard.tempId);
    setShowCropper(false);
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
      image_url: newCard.image_url || null,
      isAiGenerated: false,
      isNew: true
    };

    setFlashcards([...flashcards, manualCard]);
    setNewCard({ front: '', back: '', image_url: null });
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
            <div className="slide-display-header">
              <div className="slide-number-badge">
                Slide {currentSlide.slide_number}
              </div>
              {presentation?.file_type === 'pdf' && (
                <button
                  className={`btn-toggle-preview ${showPreview ? 'active' : ''}`}
                  onClick={() => setShowPreview(!showPreview)}
                  title={showPreview ? 'Hide PDF Preview' : 'Show PDF Preview'}
                >
                  {showPreview ? '📄 Hide Preview' : '📄 Show Preview'}
                </button>
              )}
            </div>

            {/* PDF Preview */}
            {showPreview && presentation?.file_type === 'pdf' && (
              <div className="pdf-preview-container">
                {pageImages[currentSlide.slide_number] ? (
                  <img
                    src={pageImages[currentSlide.slide_number]}
                    alt={`Page ${currentSlide.slide_number}`}
                    className="pdf-preview-image"
                  />
                ) : loadingImage ? (
                  <div className="pdf-preview-loading">
                    <span className="loading-spinner">🔄</span> Loading preview...
                  </div>
                ) : (
                  <div className="pdf-preview-placeholder">
                    <span>📄</span>
                    <p>PDF Preview</p>
                  </div>
                )}
              </div>
            )}

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
                <>🤖 AI Generate</>
              )}
            </button>
            <button
              className="btn-manual-create"
              onClick={() => setShowNewCardForm(!showNewCardForm)}
            >
              ➕ Manual Card
            </button>
            {presentation?.file_type === 'pdf' && pageImages[currentSlide.slide_number] && (
              <button
                className="btn-image-card"
                onClick={handleCreateImageCard}
                title="Create flashcard with this slide's image"
              >
                🖼️ Image Card
              </button>
            )}
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
                      <div className="edit-mode">
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
                          {card.image_url && (
                            <div className="card-image-preview">
                              <img src={card.image_url} alt="Card" />
                              <button
                                className="btn-remove-image"
                                onClick={() => handleRemoveImageFromCard(card.tempId)}
                              >
                                ✕ Remove Image
                              </button>
                            </div>
                          )}
                          <div className="edit-actions">
                            {!card.image_url && pageImages[currentSlide.slide_number] && (
                              <button
                                onClick={() => handleAddImageToCard(card.tempId)}
                                className="btn-secondary btn-sm"
                              >
                                🖼️ Add Slide Image
                              </button>
                            )}
                            <button
                              onClick={() => setEditingCard(null)}
                              className="btn-primary btn-sm"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="view-mode">
                        {card.image_url && (
                          <div className="card-image-thumbnail">
                            <img src={card.image_url} alt="Card" />
                          </div>
                        )}
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
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {allCardsCount > currentSlideCards.length && (
            <div className={`other-slides-section ${showAllCards ? 'expanded' : 'collapsed'}`}>
              <button
                className="other-slides-toggle"
                onClick={() => setShowAllCards(!showAllCards)}
              >
                <span>📚 All Flashcards ({allCardsCount})</span>
                <span className="toggle-icon">{showAllCards ? '▼' : '▶'}</span>
              </button>
              {showAllCards && (
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
                            {card.image_url && ' 🖼️'}
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
              )}
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

      {/* Image Cropper Modal */}
      {showCropper && pageImages[currentSlide.slide_number] && (
        <ImageCropper
          imageUrl={pageImages[currentSlide.slide_number]}
          onCrop={handleCroppedImage}
          onCancel={() => setShowCropper(false)}
        />
      )}
    </div>
  );
};

export default SlideFlashcardCreator;
