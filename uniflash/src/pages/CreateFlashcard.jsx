import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { cleanupFlashcardGrammar } from '../services/openai';
import MultiSetSelector from '../components/MultiSetSelector';
import EmojiPicker from '../components/EmojiPicker';

const CreateFlashcard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [selectedSetIds, setSelectedSetIds] = useState([]);
  const [sets, setSets] = useState([]);
  const [creating, setCreating] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState(null);
  const [showNewSetDialog, setShowNewSetDialog] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetIcon, setNewSetIcon] = useState('📚');
  const [newSetColor, setNewSetColor] = useState('#9333ea');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [originalText, setOriginalText] = useState({ front: '', back: '' });
  const [createReverse, setCreateReverse] = useState(false); // Also create back→front version
  const frontInputRef = useRef(null);

  useEffect(() => {
    fetchSets();
  }, []);

  // Set default set from URL param or localStorage
  useEffect(() => {
    const setParam = searchParams.get('set');
    const defaultSetId = localStorage.getItem('defaultFlashcardSet');

    if (setParam && sets.length > 0) {
      // URL param takes priority
      if (sets.find(s => s.id === setParam)) {
        setSelectedSetIds([setParam]);
      }
    } else if (defaultSetId && sets.length > 0 && selectedSetIds.length === 0) {
      // Fall back to default set from settings
      if (sets.find(s => s.id === defaultSetId)) {
        setSelectedSetIds([defaultSetId]);
      }
    }
  }, [sets, searchParams]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Enter to create flashcard
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (front.trim() && back.trim() && !creating && !cleaning) {
          handleCreate(e);
        }
      }
      // Ctrl/Cmd + Shift + Enter to create and make another
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        if (front.trim() && back.trim() && !creating && !cleaning) {
          handleCreateAnother(e);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [front, back, creating, cleaning]);

  const fetchSets = async () => {
    const { data, error} = await supabase
      .from('flashcard_sets')
      .select('*')
      .order('name');

    if (!error) {
      setSets(data || []);
    }
  };

  const handleCreateNewSet = async () => {
    if (!newSetName.trim()) {
      setError('Set name is required');
      return;
    }

    try {
      const { data, error: createError } = await supabase
        .from('flashcard_sets')
        .insert([
          {
            name: newSetName.trim(),
            icon: newSetIcon,
            color: newSetColor,
            description: ''
          }
        ])
        .select()
        .single();

      if (createError) throw createError;

      // Refresh sets list and select the new set
      await fetchSets();
      setSelectedSetIds([...selectedSetIds, data.id]);
      setShowNewSetDialog(false);
      setNewSetName('');
      setNewSetIcon('📚');
      setNewSetColor('#9333ea');
      setError(null);
    } catch (err) {
      setError(`Failed to create set: ${err.message}`);
    }
  };

  const handleCleanup = async () => {
    if (!front.trim() || !back.trim()) {
      setError('Please enter both front and back before cleaning up');
      return;
    }

    setCleaning(true);
    setError(null);

    try {
      const cleaned = await cleanupFlashcardGrammar(front, back);
      // Store original and suggested text
      setOriginalText({ front, back });
      setSuggestions(cleaned);
      setShowSuggestions(true);
    } catch (err) {
      setError(`AI cleanup failed: ${err.message}`);
    } finally {
      setCleaning(false);
    }
  };

  const handleAcceptSuggestions = () => {
    setFront(suggestions.front);
    setBack(suggestions.back);
    setShowSuggestions(false);
    setSuggestions(null);
    setOriginalText({ front: '', back: '' });
  };

  const handleDeclineSuggestions = () => {
    setShowSuggestions(false);
    setSuggestions(null);
    setOriginalText({ front: '', back: '' });
  };

  const handleKeepBoth = () => {
    // Keep original in front, add suggestions as a note
    setFront(originalText.front);
    setBack(`${originalText.back}\n\n[AI Suggestion: ${suggestions.back}]`);
    setShowSuggestions(false);
    setSuggestions(null);
    setOriginalText({ front: '', back: '' });
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!front.trim() || !back.trim()) {
      setError('Both front and back are required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // If multiple sets selected, create multiple flashcards (one per set)
      // If no sets selected, create one unassigned flashcard
      let flashcardsToCreate = selectedSetIds.length > 0
        ? selectedSetIds.map(setId => ({
            front: front.trim(),
            back: back.trim(),
            set_id: setId,
            next_review: new Date().toISOString(),
            interval_days: 1,
          }))
        : [{
            front: front.trim(),
            back: back.trim(),
            set_id: null,
            next_review: new Date().toISOString(),
            interval_days: 1,
          }];

      // If createReverse is checked, also create reverse cards (back→front)
      if (createReverse) {
        const reverseCards = selectedSetIds.length > 0
          ? selectedSetIds.map(setId => ({
              front: back.trim(),
              back: front.trim(),
              set_id: setId,
              next_review: new Date().toISOString(),
              interval_days: 1,
            }))
          : [{
              front: back.trim(),
              back: front.trim(),
              set_id: null,
              next_review: new Date().toISOString(),
              interval_days: 1,
            }];
        flashcardsToCreate = [...flashcardsToCreate, ...reverseCards];
      }

      const { error: insertError } = await supabase
        .from('flashcards')
        .insert(flashcardsToCreate);

      if (insertError) throw insertError;

      navigate('/flashcards');
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  const handleCreateAnother = async (e) => {
    e.preventDefault();

    if (!front.trim() || !back.trim()) {
      setError('Both front and back are required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // If multiple sets selected, create multiple flashcards (one per set)
      // If no sets selected, create one unassigned flashcard
      let flashcardsToCreate = selectedSetIds.length > 0
        ? selectedSetIds.map(setId => ({
            front: front.trim(),
            back: back.trim(),
            set_id: setId,
            next_review: new Date().toISOString(),
            interval_days: 1,
          }))
        : [{
            front: front.trim(),
            back: back.trim(),
            set_id: null,
            next_review: new Date().toISOString(),
            interval_days: 1,
          }];

      // If createReverse is checked, also create reverse cards (back→front)
      if (createReverse) {
        const reverseCards = selectedSetIds.length > 0
          ? selectedSetIds.map(setId => ({
              front: back.trim(),
              back: front.trim(),
              set_id: setId,
              next_review: new Date().toISOString(),
              interval_days: 1,
            }))
          : [{
              front: back.trim(),
              back: front.trim(),
              set_id: null,
              next_review: new Date().toISOString(),
              interval_days: 1,
            }];
        flashcardsToCreate = [...flashcardsToCreate, ...reverseCards];
      }

      const { error: insertError } = await supabase
        .from('flashcards')
        .insert(flashcardsToCreate);

      if (insertError) throw insertError;

      // Reset form but keep set selection and createReverse option
      setFront('');
      setBack('');
      setCreating(false);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  return (
    <div className="create-flashcard create-flashcard-layout">
      <div className="create-main">
        <div className="create-header">
          <h1>➕ Create Flashcard</h1>
          <p>Manually create a new flashcard</p>
        </div>

        <form className="create-form">
        <div className="form-group">
          <div className="set-selection-row">
            <MultiSetSelector
              selectedSets={selectedSetIds}
              onSelectionChange={setSelectedSetIds}
              sets={sets}
              label="Assign to Sets (optional - can select multiple)"
            />
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setShowNewSetDialog(true)}
              disabled={creating}
            >
              ➕ New Set
            </button>
          </div>
          {selectedSetIds.length > 1 && (
            <div className="multi-set-info">
              ℹ️ This flashcard will be added to {selectedSetIds.length} sets
            </div>
          )}
        </div>

        {showNewSetDialog && (
          <div className="new-set-dialog">
            <h3>Create New Set</h3>
            <div className="form-group">
              <label>Set Name:</label>
              <input
                type="text"
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                placeholder="e.g., Anatomy Chapter 5"
                autoFocus
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Icon:</label>
                <EmojiPicker
                  value={newSetIcon}
                  onChange={(emoji) => setNewSetIcon(emoji)}
                />
              </div>
              <div className="form-group">
                <label>Color:</label>
                <input
                  type="color"
                  value={newSetColor}
                  onChange={(e) => setNewSetColor(e.target.value)}
                  style={{ width: '80px', height: '40px' }}
                />
              </div>
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowNewSetDialog(false);
                  setNewSetName('');
                  setNewSetIcon('📚');
                  setNewSetColor('#9333ea');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCreateNewSet}
              >
                Create Set
              </button>
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="front">Front (Question):</label>
          <textarea
            id="front"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Enter the question or prompt..."
            rows={4}
            disabled={creating || cleaning}
          />
        </div>

        <div className="form-group">
          <label htmlFor="back">Back (Answer):</label>
          <textarea
            id="back"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Enter the answer..."
            rows={4}
            disabled={creating || cleaning}
          />
        </div>

        <div className="form-group">
          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={createReverse}
              onChange={(e) => setCreateReverse(e.target.checked)}
              disabled={creating || cleaning}
            />
            <span className="checkbox-label">
              🔄 Also create reverse card (Answer → Question)
            </span>
          </label>
          {createReverse && (
            <p className="option-hint">
              This will create 2 cards: one normal and one with front/back swapped
            </p>
          )}
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {showSuggestions && suggestions && (
          <div className="ai-suggestions-modal">
            <div className="suggestions-overlay" onClick={handleDeclineSuggestions} />
            <div className="suggestions-content">
              <h3>🤖 AI Cleanup Suggestions</h3>
              <p className="suggestions-instructions">Review the AI-suggested improvements below</p>

              <div className="suggestions-comparison">
                <div className="comparison-column original-column">
                  <h4>Original</h4>
                  <div className="comparison-field">
                    <label>Front:</label>
                    <div className="text-preview">{originalText.front}</div>
                  </div>
                  <div className="comparison-field">
                    <label>Back:</label>
                    <div className="text-preview">{originalText.back}</div>
                  </div>
                </div>

                <div className="comparison-arrow">→</div>

                <div className="comparison-column suggested-column">
                  <h4>✨ AI Suggestion</h4>
                  <div className="comparison-field">
                    <label>Front:</label>
                    <div className="text-preview highlighted">{suggestions.front}</div>
                  </div>
                  <div className="comparison-field">
                    <label>Back:</label>
                    <div className="text-preview highlighted">{suggestions.back}</div>
                  </div>
                </div>
              </div>

              <div className="suggestions-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleDeclineSuggestions}
                >
                  ✕ Decline
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleKeepBoth}
                >
                  📋 Keep Both
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAcceptSuggestions}
                >
                  ✓ Accept Changes
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/flashcards')}
            disabled={creating || cleaning}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCleanup}
            disabled={creating || cleaning || !front.trim() || !back.trim()}
          >
            {cleaning ? '🤖 Cleaning...' : '🤖 AI Cleanup'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCreateAnother}
            disabled={creating || cleaning || !front.trim() || !back.trim()}
          >
            Save & Create Another
          </button>
          <button
            type="submit"
            className="btn-primary"
            onClick={handleCreate}
            disabled={creating || cleaning || !front.trim() || !back.trim()}
          >
            {creating ? 'Creating...' : 'Create Flashcard'}
          </button>
        </div>
        </form>
      </div>

      <div className="create-sidebar">
        <div className="sidebar-section">
          <h3>⌨️ Keyboard Shortcuts</h3>
          <div className="shortcut-list">
            <div className="shortcut-row">
              <span className="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>Enter</kbd></span>
              <span className="shortcut-desc">Create card</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd></span>
              <span className="shortcut-desc">Save & another</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-keys"><kbd>Tab</kbd></span>
              <span className="shortcut-desc">Next field</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-keys"><kbd>Esc</kbd></span>
              <span className="shortcut-desc">Cancel</span>
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <h3>💡 Tips</h3>
          <ul className="tips-list">
            <li>Keep questions clear and concise</li>
            <li>Focus on one concept per card</li>
            <li>Use your own words</li>
            <li>Include examples when helpful</li>
          </ul>
        </div>

        <div className="sidebar-section">
          <h3>📊 Quick Stats</h3>
          <div className="quick-stats">
            <div className="quick-stat">
              <span className="stat-num">{sets.length}</span>
              <span className="stat-label">Sets</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateFlashcard;
