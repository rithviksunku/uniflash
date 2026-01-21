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
  const [editingSlide, setEditingSlide] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

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

    navigate('/flashcards/from-slides', {
      state: { slideIds: Array.from(selectedSlides) }
    });
  };

  const handleEditSlide = (slide, e) => {
    e.stopPropagation();
    setEditingSlide(slide.id);
    setEditTitle(slide.title || '');
    setEditContent(slide.content || '');
  };

  const handleCancelEdit = () => {
    setEditingSlide(null);
    setEditTitle('');
    setEditContent('');
  };

  const handleSaveEdit = async (slideId, e) => {
    e.stopPropagation();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('slides')
        .update({
          title: editTitle.trim(),
          content: editContent.trim()
        })
        .eq('id', slideId);

      if (error) throw error;

      // Update local state
      const updatedSlides = slides.map(s =>
        s.id === slideId
          ? { ...s, title: editTitle.trim(), content: editContent.trim() }
          : s
      );
      setSlides(updatedSlides);
      setEditingSlide(null);
      setEditTitle('');
      setEditContent('');
    } catch (error) {
      alert(`Failed to save slide: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlide = async (slideId, e) => {
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this slide?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('slides')
        .delete()
        .eq('id', slideId);

      if (error) throw error;

      // Update local state
      setSlides(slides.filter(s => s.id !== slideId));

      // Remove from selected if it was selected
      const newSelected = new Set(selectedSlides);
      newSelected.delete(slideId);
      setSelectedSlides(newSelected);
    } catch (error) {
      alert(`Failed to delete slide: ${error.message}`);
    }
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
            className={`slide-card ${selectedSlides.has(slide.id) ? 'selected' : ''} ${editingSlide === slide.id ? 'editing' : ''}`}
            onClick={() => editingSlide !== slide.id && toggleSlide(slide.id)}
          >
            <div className="slide-number">Slide {slide.slide_number}</div>

            {editingSlide === slide.id ? (
              <div className="slide-edit-mode" onClick={(e) => e.stopPropagation()}>
                <div className="edit-field">
                  <label>Title:</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Enter slide title..."
                    className="edit-input"
                  />
                </div>
                <div className="edit-field">
                  <label>Content:</label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Enter slide content..."
                    className="edit-textarea"
                    rows={8}
                  />
                </div>
                <div className="edit-actions">
                  <button
                    className="btn-secondary btn-sm"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary btn-sm"
                    onClick={(e) => handleSaveEdit(slide.id, e)}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="slide-title">{slide.title || 'Untitled'}</div>
                <div className="slide-content">
                  {slide.content.substring(0, 150)}
                  {slide.content.length > 150 ? '...' : ''}
                </div>
                <div className="slide-actions">
                  <button
                    className="btn-icon btn-edit"
                    onClick={(e) => handleEditSlide(slide, e)}
                    title="Edit slide"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon btn-delete"
                    onClick={(e) => handleDeleteSlide(slide.id, e)}
                    title="Delete slide"
                  >
                    🗑️
                  </button>
                </div>
                {selectedSlides.has(slide.id) && (
                  <div className="selected-indicator">✓</div>
                )}
              </>
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
