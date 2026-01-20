import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { generateFlashcardsFromSlides } from '../services/openai';

const GenerateFlashcards = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { slideIds } = location.state || { slideIds: [] };

  const [slides, setSlides] = useState([]);
  const [presentations, setPresentations] = useState([]);
  const [selectedPresentation, setSelectedPresentation] = useState('all');
  const [filteredSlides, setFilteredSlides] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState(new Set());

  useEffect(() => {
    if (slideIds.length > 0) {
      fetchSlides();
      fetchPresentations();
    }
  }, [slideIds]);

  useEffect(() => {
    filterSlides();
  }, [slides, selectedPresentation]);

  const fetchSlides = async () => {
    const { data, error } = await supabase
      .from('slides')
      .select('*')
      .in('id', slideIds);

    if (!error) {
      setSlides(data);
    }
  };

  const fetchPresentations = async () => {
    const { data, error } = await supabase
      .from('presentations')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (!error) {
      setPresentations(data || []);
    }
  };

  const filterSlides = () => {
    if (selectedPresentation === 'all') {
      setFilteredSlides(slides);
    } else {
      setFilteredSlides(slides.filter(s => s.presentation_id === selectedPresentation));
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      // Use OpenAI to generate flashcards from filtered slides
      const aiGeneratedCards = await generateFlashcardsFromSlides(filteredSlides);

      // Add temporary IDs for UI selection
      const cards = aiGeneratedCards.map((card, idx) => ({
        ...card,
        tempId: `ai-${idx}`
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
        <p>Auto-generate flashcards from {filteredSlides.length} selected slides</p>
      </div>

      <div className="filter-section">
        <label htmlFor="presentation-filter">Filter by Presentation:</label>
        <select
          id="presentation-filter"
          value={selectedPresentation}
          onChange={(e) => setSelectedPresentation(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Presentations</option>
          {presentations.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>

      {generatedCards.length === 0 ? (
        <div className="generate-start">
          <p>Click below to generate flashcards from your slides</p>
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={generating || filteredSlides.length === 0}
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
