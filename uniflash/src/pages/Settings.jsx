import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import EmojiPicker from '../components/EmojiPicker';

const Settings = () => {
  const navigate = useNavigate();

  // Spaced repetition interval settings
  const [intervalSettings, setIntervalSettings] = useState(() => {
    const saved = localStorage.getItem('srsIntervalSettings');
    return saved ? JSON.parse(saved) : {
      again: { value: 1, unit: 'minutes' },
      hard: { value: 6, unit: 'minutes' },
      good: { value: 10, unit: 'minutes' },
      easy: { value: 4, unit: 'days' },
      maxDays: 365
    };
  });

  // Auto-shuffle setting
  const [autoShuffle, setAutoShuffle] = useState(() => {
    return localStorage.getItem('autoShuffleReview') === 'true';
  });

  // Default set for new flashcards
  const [defaultSetId, setDefaultSetId] = useState(() => {
    return localStorage.getItem('defaultFlashcardSet') || '';
  });

  // Show keyboard hints
  const [showKeyboardHints, setShowKeyboardHints] = useState(() => {
    return localStorage.getItem('showKeyboardHints') !== 'false';
  });

  // Force mobile view
  const [forceMobileView, setForceMobileView] = useState(() => {
    return localStorage.getItem('forceMobileView') === 'true';
  });

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  // Flashcard sets for dropdown
  const [sets, setSets] = useState([]);
  const [showSetModal, setShowSetModal] = useState(false);
  const [editingSet, setEditingSet] = useState(null);
  const [newSet, setNewSet] = useState({ name: '', description: '', color: '#9333ea', icon: '📚' });

  useEffect(() => {
    fetchSets();
  }, []);

  const fetchSets = async () => {
    const { data, error } = await supabase
      .from('flashcard_set_stats')
      .select('*')
      .order('name');

    if (!error) {
      setSets(data || []);
    }
  };

  const saveIntervalSettings = (newSettings) => {
    setIntervalSettings(newSettings);
    localStorage.setItem('srsIntervalSettings', JSON.stringify(newSettings));
  };

  const saveAutoShuffle = (value) => {
    setAutoShuffle(value);
    localStorage.setItem('autoShuffleReview', value.toString());
  };

  const saveDefaultSet = (setId) => {
    setDefaultSetId(setId);
    localStorage.setItem('defaultFlashcardSet', setId);
  };

  const saveShowKeyboardHints = (value) => {
    setShowKeyboardHints(value);
    localStorage.setItem('showKeyboardHints', value.toString());
  };

  const saveForceMobileView = (value) => {
    setForceMobileView(value);
    localStorage.setItem('forceMobileView', value.toString());
    window.dispatchEvent(new CustomEvent('viewModeChange', { detail: { mobile: value } }));
  };

  const saveDarkMode = (value) => {
    setDarkMode(value);
    localStorage.setItem('darkMode', value.toString());
    window.dispatchEvent(new CustomEvent('darkModeChange', { detail: { darkMode: value } }));
  };

  const handleCreateSet = async () => {
    if (!newSet.name.trim()) {
      alert('Please enter a set name');
      return;
    }

    const { error } = await supabase
      .from('flashcard_sets')
      .insert([newSet]);

    if (!error) {
      await fetchSets();
      setShowSetModal(false);
      setNewSet({ name: '', description: '', color: '#9333ea', icon: '📚' });
    } else {
      alert(`Error creating set: ${error.message}`);
    }
  };

  const handleEditSet = (set) => {
    setEditingSet({
      id: set.id,
      name: set.name,
      description: set.description || '',
      color: set.color || '#9333ea',
      icon: set.icon || '📚'
    });
  };

  const handleUpdateSet = async () => {
    if (!editingSet.name.trim()) {
      alert('Please enter a set name');
      return;
    }

    const { error } = await supabase
      .from('flashcard_sets')
      .update({
        name: editingSet.name,
        description: editingSet.description,
        color: editingSet.color,
        icon: editingSet.icon
      })
      .eq('id', editingSet.id);

    if (!error) {
      await fetchSets();
      setEditingSet(null);
    } else {
      alert(`Error updating set: ${error.message}`);
    }
  };

  const handleDeleteSet = async (id, name) => {
    if (!confirm(`Delete "${name}"? Flashcards will remain but be unassigned.`)) return;

    const { error } = await supabase
      .from('flashcard_sets')
      .delete()
      .eq('id', id);

    if (!error) {
      await fetchSets();
      if (defaultSetId === id) {
        saveDefaultSet('');
      }
    } else {
      alert(`Error deleting set: ${error.message}`);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>⚙️ Settings</h1>
        <p className="subtitle">Customize your learning experience</p>
      </div>

      {/* Flashcard Sets Management */}
      <section className="settings-section">
        <div className="section-header">
          <h2>📚 Flashcard Sets</h2>
          <button className="btn-primary btn-sm" onClick={() => setShowSetModal(true)}>
            ➕ New Set
          </button>
        </div>

        <div className="sets-table">
          <div className="table-header">
            <span className="col-icon">Icon</span>
            <span className="col-name">Name</span>
            <span className="col-cards">Cards</span>
            <span className="col-due">Due</span>
            <span className="col-actions">Actions</span>
          </div>
          {sets.length === 0 ? (
            <div className="empty-row">No flashcard sets yet</div>
          ) : (
            sets.map(set => (
              <div key={set.id} className="table-row" style={{ borderLeftColor: set.color }}>
                {editingSet?.id === set.id ? (
                  <>
                    <span className="col-icon">
                      <EmojiPicker
                        value={editingSet.icon}
                        onChange={(emoji) => setEditingSet({ ...editingSet, icon: emoji })}
                        className="emoji-picker-sm"
                      />
                    </span>
                    <span className="col-name">
                      <input
                        type="text"
                        value={editingSet.name}
                        onChange={(e) => setEditingSet({ ...editingSet, name: e.target.value })}
                        className="name-input"
                      />
                    </span>
                    <span className="col-cards">{set.total_cards || 0}</span>
                    <span className="col-due">{set.due_cards || 0}</span>
                    <span className="col-actions">
                      <input
                        type="color"
                        value={editingSet.color}
                        onChange={(e) => setEditingSet({ ...editingSet, color: e.target.value })}
                        className="color-input-sm"
                      />
                      <button className="btn-icon-sm btn-save" onClick={handleUpdateSet}>✓</button>
                      <button className="btn-icon-sm btn-cancel" onClick={() => setEditingSet(null)}>✕</button>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="col-icon">{set.icon}</span>
                    <span className="col-name">{set.name}</span>
                    <span className="col-cards">{set.total_cards || 0}</span>
                    <span className="col-due">{set.due_cards || 0}</span>
                    <span className="col-actions">
                      <button className="btn-icon-sm" onClick={() => handleEditSet(set)} title="Edit">✏️</button>
                      <button className="btn-icon-sm btn-danger-icon" onClick={() => handleDeleteSet(set.id, set.name)} title="Delete">🗑️</button>
                    </span>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="setting-item">
          <label>Default Set for New Flashcards</label>
          <select value={defaultSetId} onChange={(e) => saveDefaultSet(e.target.value)}>
            <option value="">None (ask each time)</option>
            {sets.map(set => (
              <option key={set.id} value={set.id}>{set.icon} {set.name}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Spaced Repetition Settings */}
      <section className="settings-section">
        <h2>🧠 Spaced Repetition Intervals</h2>
        <p className="section-description">Customize how long until cards reappear based on your rating</p>

        <div className="interval-settings-grid">
          {['again', 'hard', 'good', 'easy'].map(rating => (
            <div key={rating} className={`interval-setting-card interval-${rating}`}>
              <label className="interval-label">
                {rating === 'again' && '🔴 Again'}
                {rating === 'hard' && '🟠 Hard'}
                {rating === 'good' && '🟢 Good'}
                {rating === 'easy' && '🟣 Easy'}
              </label>
              <div className="interval-inputs-row">
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={intervalSettings[rating].value}
                  onChange={(e) => saveIntervalSettings({
                    ...intervalSettings,
                    [rating]: { ...intervalSettings[rating], value: parseInt(e.target.value) || 1 }
                  })}
                />
                <select
                  value={intervalSettings[rating].unit}
                  onChange={(e) => saveIntervalSettings({
                    ...intervalSettings,
                    [rating]: { ...intervalSettings[rating], unit: e.target.value }
                  })}
                >
                  <option value="minutes">min</option>
                  <option value="hours">hrs</option>
                  <option value="days">days</option>
                  <option value="multiplier">×</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="setting-item">
          <label>Maximum Interval</label>
          <div className="setting-input-group">
            <input
              type="number"
              min="1"
              max="3650"
              value={intervalSettings.maxDays}
              onChange={(e) => saveIntervalSettings({
                ...intervalSettings,
                maxDays: parseInt(e.target.value) || 365
              })}
            />
            <span>days</span>
          </div>
        </div>

        <div className="presets-row">
          <span>Quick Presets:</span>
          <button
            className="btn-preset"
            onClick={() => saveIntervalSettings({
              again: { value: 1, unit: 'minutes' },
              hard: { value: 6, unit: 'minutes' },
              good: { value: 10, unit: 'minutes' },
              easy: { value: 4, unit: 'days' },
              maxDays: 365
            })}
          >
            Short Term
          </button>
          <button
            className="btn-preset"
            onClick={() => saveIntervalSettings({
              again: { value: 1, unit: 'days' },
              hard: { value: 1.2, unit: 'multiplier' },
              good: { value: 2.5, unit: 'multiplier' },
              easy: { value: 4, unit: 'multiplier' },
              maxDays: 365
            })}
          >
            Anki Default
          </button>
          <button
            className="btn-preset"
            onClick={() => saveIntervalSettings({
              again: { value: 10, unit: 'minutes' },
              hard: { value: 1, unit: 'days' },
              good: { value: 3, unit: 'days' },
              easy: { value: 7, unit: 'days' },
              maxDays: 30
            })}
          >
            Exam Cram
          </button>
        </div>
      </section>

      {/* General Settings */}
      <section className="settings-section">
        <h2>🎮 General Preferences</h2>

        <div className="setting-toggle-item">
          <div className="setting-info">
            <label>Auto-shuffle after review</label>
            <span className="setting-description">Shuffle cards when completing a review session</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={autoShuffle}
              onChange={(e) => saveAutoShuffle(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-toggle-item">
          <div className="setting-info">
            <label>Show keyboard shortcuts</label>
            <span className="setting-description">Display keyboard hints on buttons</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showKeyboardHints}
              onChange={(e) => saveShowKeyboardHints(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-toggle-item">
          <div className="setting-info">
            <label>📱 Mobile View Mode</label>
            <span className="setting-description">Force mobile-style bottom navigation</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={forceMobileView}
              onChange={(e) => saveForceMobileView(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-toggle-item">
          <div className="setting-info">
            <label>🌙 Dark Mode</label>
            <span className="setting-description">Switch to dark theme for reduced eye strain</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => saveDarkMode(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </section>

      <div className="settings-footer">
        <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
      </div>

      {/* New Set Modal */}
      {showSetModal && (
        <div className="modal-overlay" onClick={() => setShowSetModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create New Set</h2>
            <div className="form-group">
              <label>Set Name *</label>
              <input
                type="text"
                value={newSet.name}
                onChange={(e) => setNewSet({ ...newSet, name: e.target.value })}
                placeholder="e.g., Anatomy Chapter 5"
                autoFocus
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Icon</label>
                <EmojiPicker
                  value={newSet.icon}
                  onChange={(emoji) => setNewSet({ ...newSet, icon: emoji })}
                />
              </div>
              <div className="form-group">
                <label>Color</label>
                <input
                  type="color"
                  value={newSet.color}
                  onChange={(e) => setNewSet({ ...newSet, color: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={newSet.description}
                onChange={(e) => setNewSet({ ...newSet, description: e.target.value })}
                placeholder="Optional description..."
                rows={2}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowSetModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreateSet}>Create Set</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
