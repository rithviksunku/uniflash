import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const FlashcardSets = () => {
  const navigate = useNavigate();
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSetsForStudy, setSelectedSetsForStudy] = useState([]);
  const [newSet, setNewSet] = useState({
    name: '',
    description: '',
    color: '#9333ea',
    icon: '📚'
  });

  useEffect(() => {
    fetchSets();
  }, []);

  const fetchSets = async () => {
    const { data, error } = await supabase
      .from('flashcard_set_stats')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setSets(data || []);
    }
    setLoading(false);
  };

  const handleCreateSet = async () => {
    if (!newSet.name.trim()) {
      alert('Please enter a set name');
      return;
    }

    const { data, error } = await supabase
      .from('flashcard_sets')
      .insert([newSet])
      .select()
      .single();

    if (!error) {
      await fetchSets();
      setShowCreateModal(false);
      setNewSet({ name: '', description: '', color: '#9333ea', icon: '📚' });
    } else {
      alert(`Error creating set: ${error.message}`);
    }
  };

  const handleDeleteSet = async (id) => {
    if (!confirm('Delete this set? Flashcards will remain but be unassigned.')) return;

    const { error } = await supabase
      .from('flashcard_sets')
      .delete()
      .eq('id', id);

    if (!error) {
      setSets(sets.filter(s => s.id !== id));
    } else {
      alert(`Error deleting set: ${error.message}`);
    }
  };

  const toggleSetSelection = (setId) => {
    if (selectedSetsForStudy.includes(setId)) {
      setSelectedSetsForStudy(selectedSetsForStudy.filter(id => id !== setId));
    } else {
      setSelectedSetsForStudy([...selectedSetsForStudy, setId]);
    }
  };

  const startMultiSetStudy = () => {
    if (selectedSetsForStudy.length === 0) {
      alert('Please select at least one set to study');
      return;
    }
    const setParams = selectedSetsForStudy.join(',');
    navigate(`/review?sets=${setParams}`);
  };

  const getTotalDueCards = () => {
    return selectedSetsForStudy.reduce((total, setId) => {
      const set = sets.find(s => s.id === setId);
      return total + (set?.due_cards || 0);
    }, 0);
  };

  if (loading) return <div className="loading">Loading sets...</div>;

  return (
    <div className="flashcard-sets">
      <div className="sets-header">
        <div>
          <h1>📚 My Flashcard Sets</h1>
          <p className="subtitle">Organize your study materials by topic</p>
        </div>
        <div className="header-actions">
          {selectedSetsForStudy.length > 0 && (
            <button className="btn-study-multi" onClick={startMultiSetStudy}>
              🎯 Study {selectedSetsForStudy.length} Set{selectedSetsForStudy.length > 1 ? 's' : ''} ({getTotalDueCards()} cards)
            </button>
          )}
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            ➕ Create New Set
          </button>
        </div>
      </div>

      {sets.length > 1 && (
        <div className="multi-set-banner">
          <div className="banner-content">
            <span className="banner-icon">✨</span>
            <div className="banner-text">
              <strong>Study Multiple Sets Together!</strong>
              <p>Click the checkboxes to select multiple sets and study them in a combined session</p>
            </div>
          </div>
        </div>
      )}

      {sets.length === 0 ? (
        <div className="empty-state">
          <p>No flashcard sets yet. Create your first set to get started!</p>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            ➕ Create First Set
          </button>
        </div>
      ) : (
        <div className="sets-grid">
          {sets.map(set => (
            <div
              key={set.id}
              className={`set-card ${selectedSetsForStudy.includes(set.id) ? 'selected-for-study' : ''}`}
              style={{ borderLeft: `4px solid ${set.color}` }}
            >
              <div className="set-header">
                <input
                  type="checkbox"
                  className="set-checkbox"
                  checked={selectedSetsForStudy.includes(set.id)}
                  onChange={() => toggleSetSelection(set.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="set-icon">{set.icon}</span>
                <h3>{set.name}</h3>
              </div>
              {set.description && (
                <p className="set-description">{set.description}</p>
              )}
              <div className="set-stats">
                <div className="stat">
                  <span className="stat-value">{set.total_cards || 0}</span>
                  <span className="stat-label">Total Cards</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{set.due_cards || 0}</span>
                  <span className="stat-label">Due Now</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{set.reviewed_cards || 0}</span>
                  <span className="stat-label">Reviewed</span>
                </div>
              </div>
              <div className="set-actions">
                <button
                  className="btn-secondary"
                  onClick={() => navigate(`/flashcards?set=${set.id}`)}
                >
                  View Cards
                </button>
                {set.due_cards > 0 && (
                  <button
                    className="btn-primary"
                    onClick={() => navigate(`/review?set=${set.id}`)}
                  >
                    Study Now
                  </button>
                )}
                <button
                  className="btn-danger"
                  onClick={() => handleDeleteSet(set.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create New Flashcard Set</h2>
            <div className="form-group">
              <label htmlFor="set-name">Set Name *</label>
              <input
                id="set-name"
                type="text"
                placeholder="e.g., Anatomy Chapter 5"
                value={newSet.name}
                onChange={e => setNewSet({...newSet, name: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label htmlFor="set-description">Description (optional)</label>
              <textarea
                id="set-description"
                placeholder="e.g., Cardiovascular system and blood vessels"
                value={newSet.description}
                onChange={e => setNewSet({...newSet, description: e.target.value})}
                rows={3}
              />
            </div>
            <div className="form-group">
              <label htmlFor="set-icon">Icon (emoji)</label>
              <input
                id="set-icon"
                type="text"
                placeholder="📚"
                value={newSet.icon}
                onChange={e => setNewSet({...newSet, icon: e.target.value})}
                maxLength={2}
              />
            </div>
            <div className="form-group">
              <label htmlFor="set-color">Color</label>
              <div className="color-picker">
                <input
                  id="set-color"
                  type="color"
                  value={newSet.color}
                  onChange={e => setNewSet({...newSet, color: e.target.value})}
                />
                <span style={{ color: newSet.color }}>{newSet.color}</span>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateSet}
              >
                Create Set
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashcardSets;
