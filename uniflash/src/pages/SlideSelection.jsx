import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const SlideSelection = () => {
  const { presentationId } = useParams();
  const navigate = useNavigate();
  const [presentation, setPresentation] = useState(null);
  const [slides, setSlides] = useState([]);
  const [filteredSlides, setFilteredSlides] = useState([]);
  const [selectedSlides, setSelectedSlides] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPresentation();
    fetchSlides();
  }, [presentationId]);

  useEffect(() => {
    filterSlides();
  }, [slides, searchTerm]);

  const filterSlides = () => {
    if (!searchTerm.trim()) {
      setFilteredSlides(slides);
      return;
    }

    const search = searchTerm.toLowerCase();
    const filtered = slides.filter(slide =>
      slide.title?.toLowerCase().includes(search) ||
      slide.content.toLowerCase().includes(search)
    );
    setFilteredSlides(filtered);
  };

  const fetchPresentation = async () => {
    const { data, error } = await supabase
      .from('presentations')
      .select('*')
      .eq('id', presentationId)
      .single();

    if (!error) {
      setPresentation(data);
    }
  };

  const fetchSlides = async () => {
    const { data, error } = await supabase
      .from('slides')
      .select('*')
      .eq('presentation_id', presentationId)
      .order('slide_number');

    if (!error) {
      setSlides(data);
    }
    setLoading(false);
  };

  const toggleSlide = (slideId) => {
    const newSelected = new Set(selectedSlides);
    if (newSelected.has(slideId)) {
      newSelected.delete(slideId);
    } else {
      newSelected.add(slideId);
    }
    setSelectedSlides(newSelected);
  };

  const selectAll = () => {
    setSelectedSlides(new Set(slides.map(s => s.id)));
  };

  const deselectAll = () => {
    setSelectedSlides(new Set());
  };

  const handleGenerateFlashcards = async () => {
    if (selectedSlides.size === 0) return;

    navigate('/flashcards/generate', {
      state: { slideIds: Array.from(selectedSlides) }
    });
  };

  if (loading) {
    return <div className="loading">Loading slides...</div>;
  }

  return (
    <div className="slide-selection">
      <div className="selection-header">
        <h1>📑 Select Slides</h1>
        <p>{presentation?.title}</p>
      </div>

      <div className="search-section">
        <input
          type="text"
          placeholder="🔍 Search slides by title or content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="selection-actions">
        <div className="selection-info">
          {selectedSlides.size} of {slides.length} slides selected
          {searchTerm && ` • Showing ${filteredSlides.length} matches`}
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

      <div className="slides-grid">
        {filteredSlides.map((slide) => (
          <div
            key={slide.id}
            className={`slide-card ${selectedSlides.has(slide.id) ? 'selected' : ''}`}
            onClick={() => toggleSlide(slide.id)}
          >
            <div className="slide-number">Slide {slide.slide_number}</div>
            <div className="slide-title">{slide.title || 'Untitled'}</div>
            <div className="slide-content">
              {slide.content.substring(0, 150)}
              {slide.content.length > 150 ? '...' : ''}
            </div>
            {selectedSlides.has(slide.id) && (
              <div className="selected-indicator">✓</div>
            )}
          </div>
        ))}
      </div>

      <div className="selection-footer">
        <button
          className="btn-secondary"
          onClick={() => navigate('/dashboard')}
        >
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={handleGenerateFlashcards}
          disabled={selectedSlides.size === 0}
        >
          Generate Flashcards ({selectedSlides.size})
        </button>
      </div>
    </div>
  );
};

export default SlideSelection;
