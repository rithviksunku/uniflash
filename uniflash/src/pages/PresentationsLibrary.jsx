import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const PresentationsLibrary = () => {
  const navigate = useNavigate();
  const [presentations, setPresentations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPresentations, setFilteredPresentations] = useState([]);

  useEffect(() => {
    fetchPresentations();
  }, []);

  useEffect(() => {
    filterPresentations();
  }, [presentations, searchTerm]);

  const fetchPresentations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('presentations')
      .select('*, slides(count)')
      .order('uploaded_at', { ascending: false });

    if (!error) {
      setPresentations(data || []);
    }
    setLoading(false);
  };

  const filterPresentations = () => {
    if (!searchTerm.trim()) {
      setFilteredPresentations(presentations);
      return;
    }

    const search = searchTerm.toLowerCase();
    const filtered = presentations.filter(p =>
      p.title?.toLowerCase().includes(search) ||
      p.file_name?.toLowerCase().includes(search)
    );
    setFilteredPresentations(filtered);
  };

  const handleDelete = async (presentationId, fileName) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"? This will also delete all associated slides and flashcards.`)) {
      return;
    }

    // Delete associated flashcards first
    await supabase
      .from('flashcards')
      .delete()
      .eq('presentation_id', presentationId);

    // Delete slides
    await supabase
      .from('slides')
      .delete()
      .eq('presentation_id', presentationId);

    // Delete presentation
    const { error } = await supabase
      .from('presentations')
      .delete()
      .eq('id', presentationId);

    if (!error) {
      fetchPresentations();
    } else {
      alert(`Failed to delete presentation: ${error.message}`);
    }
  };

  const handleViewSlides = (presentationId) => {
    navigate(`/slides/${presentationId}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileTypeIcon = (fileType) => {
    if (fileType === 'pdf') return '📄';
    if (fileType === 'pptx') return '📊';
    return '📁';
  };

  return (
    <div className="presentations-library">
      <div className="library-header">
        <h1>📚 My Presentations</h1>
        <p>View and manage your uploaded files</p>
      </div>

      <div className="library-actions">
        <div className="search-section">
          <input
            type="text"
            placeholder="🔍 Search presentations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate('/upload')}
        >
          ➕ Upload New
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading presentations...</div>
      ) : filteredPresentations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h2>No presentations found</h2>
          <p>{searchTerm ? 'Try a different search term' : 'Upload your first presentation to get started!'}</p>
          {!searchTerm && (
            <button
              className="btn-primary"
              onClick={() => navigate('/upload')}
            >
              Upload Presentation
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="library-info">
            Showing {filteredPresentations.length} of {presentations.length} presentations
          </div>

          <div className="presentations-grid">
            {filteredPresentations.map(presentation => (
              <div key={presentation.id} className="presentation-card">
                <div className="presentation-icon">
                  {getFileTypeIcon(presentation.file_type)}
                </div>

                <div className="presentation-details">
                  <h3>{presentation.title}</h3>
                  <div className="presentation-meta">
                    <span className="file-type-badge">
                      {presentation.file_type?.toUpperCase() || 'FILE'}
                    </span>
                    <span className="slide-count">
                      {presentation.slides?.[0]?.count || 0} slides
                    </span>
                  </div>
                  <div className="presentation-date">
                    Uploaded: {formatDate(presentation.uploaded_at)}
                  </div>
                </div>

                <div className="presentation-actions">
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => handleViewSlides(presentation.id)}
                    title="View slides"
                  >
                    👁️ View Slides
                  </button>
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => handleDelete(presentation.id, presentation.title)}
                    title="Delete presentation"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PresentationsLibrary;
