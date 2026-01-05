import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const GenerateFlashcards = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { slideIds } = location.state || { slideIds: [] };

  const [slides, setSlides] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState(new Set());

  useEffect(() => {
    if (slideIds.length > 0) {
      fetchSlides();
    }
  }, [slideIds]);

  const fetchSlides = async () => {
    const { data, error } = await supabase
      .from('slides')
      .select('*')
      .in('id', slideIds);

    if (!error) {
      setSlides(data);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);

    // TODO: Replace with actual AI generation
    // For now, create simple flashcards from slide content
    const cards = slides.flatMap(slide => {
      const lines = slide.content.split('\n').filter(line => line.trim());
      return lines.slice(0, 3).map((line, idx) => ({
        front: `${slide.title} - Question ${idx + 1}`,
        back: line,
        slide_id: slide.id,
        tempId: `${slide.id}-${idx}`
      }));
    });

    setGeneratedCards(cards);
    setSelectedCards(new Set(cards.map(c => c.tempId)));
    setGenerating(false);
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

  const handleSave = async () => {
    const cardsToSave = generatedCards
      .filter(card => selectedCards.has(card.tempId))
      .map(({ tempId, ...card }) => ({
        ...card,
        next_review: new Date().toISOString(),
        interval_days: 1,
      }));

    const { error } = await supabase
      .from('flashcards')
      .insert(cardsToSave);

    if (!error) {
      navigate('/flashcards');
    }
  };

  const handleEditCard = (tempId, field, value) => {
    setGeneratedCards(generatedCards.map(card =>
      card.tempId === tempId ? { ...card, [field]: value } : card
    ));
  };

  return (
    <div className="generate-flashcards">
      <div className="generate-header">
        <h1>🎴 Generate Flashcards</h1>
        <p>Auto-generate flashcards from {slides.length} selected slides</p>
      </div>

      {generatedCards.length === 0 ? (
        <div className="generate-start">
          <p>Click below to generate flashcards from your slides</p>
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={generating || slides.length === 0}
          >
            {generating ? 'Generating...' : '✨ Generate Flashcards'}
          </button>
        </div>
      ) : (
        <>
          <div className="generate-actions">
            <div className="selection-info">
              {selectedCards.size} of {generatedCards.length} cards selected
            </div>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={selectedCards.size === 0}
            >
              Save Selected ({selectedCards.size})
            </button>
          </div>

          <div className="generated-cards">
            {generatedCards.map((card) => (
              <div
                key={card.tempId}
                className={`generated-card ${selectedCards.has(card.tempId) ? 'selected' : ''}`}
              >
                <div className="card-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedCards.has(card.tempId)}
                    onChange={() => toggleCard(card.tempId)}
                  />
                </div>
                <div className="card-edit">
                  <div className="edit-field">
                    <label>Front:</label>
                    <textarea
                      value={card.front}
                      onChange={(e) => handleEditCard(card.tempId, 'front', e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="edit-field">
                    <label>Back:</label>
                    <textarea
                      value={card.back}
                      onChange={(e) => handleEditCard(card.tempId, 'back', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="generate-footer">
            <button
              className="btn-secondary"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={selectedCards.size === 0}
            >
              Save Selected Flashcards ({selectedCards.size})
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default GenerateFlashcards;
