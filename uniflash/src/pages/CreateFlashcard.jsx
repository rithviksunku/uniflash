import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { cleanupFlashcardGrammar } from '../services/openai';
import MultiSetSelector from '../components/MultiSetSelector';
import EmojiPicker from '../components/EmojiPicker';

const CreateFlashcard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cardId } = useParams(); // For edit mode
  const isEditMode = !!cardId;

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
  const [loadingCard, setLoadingCard] = useState(false);

  // Cloze mode state
  const [cardType, setCardType] = useState('standard'); // 'standard' or 'cloze'
  const [clozeText, setClozeText] = useState('');
  const [nextClozeNumber, setNextClozeNumber] = useState(1);
  const clozeInputRef = useRef(null);

  // Parse cloze text to extract all cloze markers
  const parseClozeText = (text) => {
    const regex = /\{\{c(\d+)::([^}]+)\}\}/g;
    const extractions = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      extractions.push({ number: parseInt(match[1]), word: match[2] });
    }
    // Get unique cloze numbers
    const uniqueNumbers = [...new Set(extractions.map(e => e.number))].sort((a, b) => a - b);
    return { source_text: text, extractions, uniqueNumbers };
  };

  // Wrap selected text in cloze marker (uses execCommand for undo support)
  const wrapSelectionInCloze = (clozeNum) => {
    const textarea = clozeInputRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = clozeText.substring(start, end);

    if (!selectedText) return;

    const wrappedText = `{{c${clozeNum}::${selectedText}}}`;

    // Focus the textarea and ensure selection is set
    textarea.focus();
    textarea.setSelectionRange(start, end);

    // Use execCommand to insert text - this integrates with browser undo stack
    // This allows Ctrl/Cmd+Z to work properly
    document.execCommand('insertText', false, wrappedText);

    // Update React state to match (execCommand already changed the DOM)
    setClozeText(textarea.value);
  };

  // Create or update cloze flashcards - one card per unique cloze number
  const handleCreateCloze = async (stayOnPage = false) => {
    // Prevent double submission
    if (creating) return;

    const { source_text, extractions, uniqueNumbers } = parseClozeText(clozeText);

    if (uniqueNumbers.length === 0) {
      setError('No cloze markers found. Use {{c1::word}} syntax to mark words.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      if (isEditMode) {
        // In edit mode, update the existing cloze card
        // Find which cloze number this card represents from the original data
        const { data: existingCard } = await supabase
          .from('flashcards')
          .select('cloze_data')
          .eq('id', cardId)
          .single();

        const clozeNum = existingCard?.cloze_data?.cloze_number || uniqueNumbers[0];
        const targetWord = extractions.find(e => e.number === clozeNum)?.word || '';

        const { error: updateError } = await supabase
          .from('flashcards')
          .update({
            front: `Cloze: ${targetWord}`,
            back: targetWord,
            set_id: selectedSetIds[0] || null,
            cloze_data: {
              source_text,
              cloze_number: clozeNum,
              extractions
            },
          })
          .eq('id', cardId);

        if (updateError) throw updateError;
        navigate('/flashcards');
        return;
      }

      // Create one card per unique cloze number
      const flashcardsToCreate = [];

      for (const clozeNum of uniqueNumbers) {
        // Generate front text (summary for search/list display)
        const targetWord = extractions.find(e => e.number === clozeNum)?.word || '';
        const frontSummary = `Cloze: ${targetWord}`;

        // For each selected set (or null if no set)
        const setIds = selectedSetIds.length > 0 ? selectedSetIds : [null];

        for (const setId of setIds) {
          flashcardsToCreate.push({
            front: frontSummary,
            back: targetWord,
            set_id: setId,
            card_type: 'cloze',
            cloze_data: {
              source_text,
              cloze_number: clozeNum,
              extractions
            },
            next_review: new Date().toISOString(),
            interval_days: 1,
          });
        }
      }

      const { error: insertError } = await supabase
        .from('flashcards')
        .insert(flashcardsToCreate);

      if (insertError) throw insertError;

      if (stayOnPage) {
        // Reset form for another cloze card
        setClozeText('');
        setNextClozeNumber(1);
        setCreating(false);
      } else {
        navigate('/flashcards');
      }
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchSets();
  }, []);

  // Load card for editing
  useEffect(() => {
    if (isEditMode && cardId) {
      loadCardForEdit();
    }
  }, [cardId]);

  const loadCardForEdit = async () => {
    setLoadingCard(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('id', cardId)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        // Set card type
        setCardType(data.card_type || 'standard');

        if (data.card_type === 'cloze' && data.cloze_data) {
          // Load cloze card data
          setClozeText(data.cloze_data.source_text || '');
          setNextClozeNumber(Math.max(...(data.cloze_data.extractions?.map(e => e.number) || [0])) + 1);
        } else {
          // Load standard card data
          setFront(data.front || '');
          setBack(data.back || '');
        }

        // Load set assignment
        if (data.set_id) {
          setSelectedSetIds([data.set_id]);
        }
      }
    } catch (err) {
      setError(`Failed to load card: ${err.message}`);
    } finally {
      setLoadingCard(false);
    }
  };

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

  // Update nextClozeNumber based on what's in the text (handles undo/delete)
  useEffect(() => {
    const { uniqueNumbers } = parseClozeText(clozeText);
    const maxNumber = uniqueNumbers.length > 0 ? Math.max(...uniqueNumbers) : 0;
    setNextClozeNumber(maxNumber + 1);
  }, [clozeText]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (cardType === 'cloze') {
        // Cloze mode shortcuts (Ctrl for PC, Cmd for Mac)

        // Ctrl/Cmd + Shift + C - Wrap selection in new cloze number
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'c') {
          e.preventDefault();
          wrapSelectionInCloze(nextClozeNumber);
          return;
        }

        // Ctrl/Cmd + Shift + D - Wrap selection in same cloze number (D for duplicate)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          wrapSelectionInCloze(Math.max(1, nextClozeNumber - 1));
          return;
        }

        // Ctrl/Cmd + Shift + Enter - Save & another
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
          e.preventDefault();
          if (clozeText.trim() && !creating) {
            handleCreateCloze(true);
          }
          return;
        }
      } else {
        // Standard mode shortcuts

        // Ctrl/Cmd + Shift + Enter - Save & another
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
          e.preventDefault();
          if (front.trim() && back.trim() && !creating && !cleaning) {
            handleCreateAnother(e);
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [front, back, creating, cleaning, cardType, clozeText, nextClozeNumber]);

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

    // Prevent double submission
    if (creating) return;

    if (!front.trim() || !back.trim()) {
      setError('Both front and back are required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      if (isEditMode) {
        // Update existing card
        const { error: updateError } = await supabase
          .from('flashcards')
          .update({
            front: front.trim(),
            back: back.trim(),
            set_id: selectedSetIds[0] || null,
            card_type: 'standard',
          })
          .eq('id', cardId);

        if (updateError) throw updateError;
        navigate('/flashcards');
        return;
      }

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

    // Prevent double submission
    if (creating) return;

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
        {/* Card Type Toggle */}
        <div className="card-type-toggle">
          <button
            type="button"
            className={`card-type-btn ${cardType === 'standard' ? 'active' : ''}`}
            onClick={() => setCardType('standard')}
            disabled={creating}
          >
            Standard
          </button>
          <button
            type="button"
            className={`card-type-btn ${cardType === 'cloze' ? 'active' : ''}`}
            onClick={() => setCardType('cloze')}
            disabled={creating}
          >
            Cloze
          </button>
        </div>

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

        {cardType === 'standard' ? (
          <>
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
          </>
        ) : (
          <>
            <div className="form-group">
              <label htmlFor="cloze-text">Cloze Text:</label>
              <textarea
                id="cloze-text"
                ref={clozeInputRef}
                value={clozeText}
                onChange={(e) => setClozeText(e.target.value)}
                placeholder="Type your text and select words to make into cloze deletions.

Example: The {{c1::mitochondria}} is the {{c2::powerhouse}} of the cell.

Use Ctrl+Shift+C (PC) or ⌘+Shift+C (Mac) to wrap selected text."
                rows={6}
                disabled={creating}
                className="cloze-input"
              />
              <div className="cloze-help">
                <span className="cloze-help-item">
                  Select text + <kbd>Ctrl/⌘</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> = New cloze
                </span>
                <span className="cloze-help-item">
                  <kbd>Ctrl/⌘</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> = Same cloze #
                </span>
                <span className="cloze-help-item">
                  <kbd>Ctrl/⌘</kbd>+<kbd>Z</kbd> = Undo
                </span>
              </div>
            </div>

            {/* Cloze Preview */}
            {clozeText && (
              <div className="cloze-preview-section">
                <label>Preview ({parseClozeText(clozeText).uniqueNumbers.length} card{parseClozeText(clozeText).uniqueNumbers.length !== 1 ? 's' : ''} will be created):</label>
                <div className="cloze-preview-cards">
                  {parseClozeText(clozeText).uniqueNumbers.map(num => {
                    const extraction = parseClozeText(clozeText).extractions.find(e => e.number === num);
                    return (
                      <div key={num} className="cloze-preview-card">
                        <span className="cloze-preview-num">c{num}</span>
                        <span className="cloze-preview-word">{extraction?.word}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

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

          {cardType === 'standard' ? (
            <>
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
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleCreateCloze(true)}
                disabled={creating || !clozeText.trim() || parseClozeText(clozeText).uniqueNumbers.length === 0}
              >
                Save & Create Another
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleCreateCloze(false)}
                disabled={creating || !clozeText.trim() || parseClozeText(clozeText).uniqueNumbers.length === 0}
              >
                {creating ? 'Creating...' : `Create ${parseClozeText(clozeText).uniqueNumbers.length || 0} Card${parseClozeText(clozeText).uniqueNumbers.length !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
        </div>
        </form>
      </div>

      <div className="create-sidebar">
        <div className="sidebar-section">
          <h3>⌨️ Keyboard Shortcuts</h3>
          {cardType === 'standard' ? (
            <div className="shortcut-list">
              <div className="shortcut-row">
                <span className="shortcut-keys"><kbd>Ctrl/⌘</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd></span>
                <span className="shortcut-desc">Save & another</span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-keys"><kbd>Ctrl/⌘</kbd>+<kbd>Z</kbd></span>
                <span className="shortcut-desc">Undo</span>
              </div>
            </div>
          ) : (
            <div className="shortcut-list">
              <div className="shortcut-row">
                <span className="shortcut-keys"><kbd>Ctrl/⌘</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd></span>
                <span className="shortcut-desc">Wrap in new cloze</span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-keys"><kbd>Ctrl/⌘</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd></span>
                <span className="shortcut-desc">Wrap same cloze #</span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-keys"><kbd>Ctrl/⌘</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd></span>
                <span className="shortcut-desc">Save & another</span>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-keys"><kbd>Ctrl/⌘</kbd>+<kbd>Z</kbd></span>
                <span className="shortcut-desc">Undo</span>
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-section">
          <h3>💡 Tips</h3>
          {cardType === 'standard' ? (
            <ul className="tips-list">
              <li>Keep questions clear and concise</li>
              <li>Focus on one concept per card</li>
              <li>Use your own words</li>
              <li>Include examples when helpful</li>
            </ul>
          ) : (
            <ul className="tips-list">
              <li>Select text then use shortcut to wrap</li>
              <li>Each cloze # creates one card</li>
              <li>Use same # to reveal together</li>
              <li>Example: {"{{c1::word}}"}</li>
            </ul>
          )}
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
