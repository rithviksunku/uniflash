import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { cleanupFlashcardGrammar } from '../services/openai';
import MultiSetSelector from '../components/MultiSetSelector';

const CreateFlashcard = () => {
  const navigate = useNavigate();
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

  useEffect(() => {
    fetchSets();
  }, []);

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
      const flashcardsToCreate = selectedSetIds.length > 0
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
      const flashcardsToCreate = selectedSetIds.length > 0
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

      const { error: insertError } = await supabase
        .from('flashcards')
        .insert(flashcardsToCreate);

      if (insertError) throw insertError;

      // Reset form but keep set selection
      setFront('');
      setBack('');
      setCreating(false);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  return (
    <div className="create-flashcard">
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
                <input
                  type="text"
                  value={newSetIcon}
                  onChange={(e) => setNewSetIcon(e.target.value)}
                  placeholder="📚"
                  maxLength={2}
                  style={{ width: '80px', textAlign: 'center', fontSize: '1.5rem' }}
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

      <div className="create-tips">
        <h3>💡 Tips for effective flashcards:</h3>
        <ul>
          <li>Keep questions clear and concise</li>
          <li>Focus on one concept per card</li>
          <li>Use your own words</li>
          <li>Include examples when helpful</li>
          <li>Use AI Cleanup to improve grammar and clarity</li>
        </ul>
      </div>
    </div>
  );
};

export default CreateFlashcard;
