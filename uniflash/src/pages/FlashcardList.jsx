import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

// Fuzzy search function - matches characters in order but not necessarily consecutive
const fuzzyMatch = (text, pattern) => {
  if (!pattern) return { matches: true, score: 0 };

  const textLower = text.toLowerCase();
  const patternLower = pattern.toLowerCase();

  let patternIdx = 0;
  let score = 0;
  let lastMatchIdx = -1;
  let consecutiveMatches = 0;

  for (let i = 0; i < textLower.length && patternIdx < patternLower.length; i++) {
    if (textLower[i] === patternLower[patternIdx]) {
      // Bonus for consecutive matches
      if (lastMatchIdx === i - 1) {
        consecutiveMatches++;
        score += consecutiveMatches * 2;
      } else {
        consecutiveMatches = 1;
      }
      // Bonus for matching at word boundaries
      if (i === 0 || textLower[i - 1] === ' ' || textLower[i - 1] === '-') {
        score += 5;
      }
      lastMatchIdx = i;
      patternIdx++;
      score += 1;
    }
  }

  // All pattern characters must be found
  const matches = patternIdx === patternLower.length;

  // Bonus for exact match
  if (matches && textLower === patternLower) {
    score += 50;
  }
  // Bonus for starting with pattern
  if (matches && textLower.startsWith(patternLower)) {
    score += 20;
  }
  // Bonus for containing the full pattern as a substring
  if (matches && textLower.includes(patternLower)) {
    score += 15;
  }

  return { matches, score };
};

const FlashcardList = () => {
  const navigate = useNavigate();
  const [flashcards, setFlashcards] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sets, setSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState('all');
  const [showCreateSetModal, setShowCreateSetModal] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, front-az, front-za
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchFlashcards();
    fetchSets();
  }, []);

  useEffect(() => {
    filterFlashcards();
  }, [flashcards, searchTerm, selectedSet, sortBy]);

  const fetchSets = async () => {
    const { data, error } = await supabase
      .from('flashcard_sets')
      .select('*')
      .order('name');

    if (!error) {
      setSets(data || []);
    }
  };

  const fetchFlashcards = async () => {
    const { data, error } = await supabase
      .from('flashcards')
      .select(`
        *,
        slides (
          title,
          slide_number
        ),
        flashcard_sets (
          name,
          color,
          icon
        )
      `)
      .order('created_at', { ascending: false });

    if (!error) {
      setFlashcards(data);
    }
    setLoading(false);
  };

  const filterFlashcards = () => {
    let filtered = flashcards;

    // Filter by set
    if (selectedSet !== 'all') {
      if (selectedSet === 'unassigned') {
        filtered = filtered.filter(card => !card.set_id);
      } else if (selectedSet === 'flagged') {
        filtered = filtered.filter(card => card.is_flagged === true);
      } else {
        filtered = filtered.filter(card => card.set_id === selectedSet);
      }
    }

    // Fuzzy search filter
    if (searchTerm.trim()) {
      filtered = filtered
        .map(card => {
          const frontMatch = fuzzyMatch(card.front, searchTerm);
          const backMatch = fuzzyMatch(card.back, searchTerm);
          const setMatch = card.flashcard_sets?.name
            ? fuzzyMatch(card.flashcard_sets.name, searchTerm)
            : { matches: false, score: 0 };

          const matches = frontMatch.matches || backMatch.matches || setMatch.matches;
          const score = Math.max(frontMatch.score, backMatch.score, setMatch.score);

          return { ...card, _matches: matches, _score: score };
        })
        .filter(card => card._matches)
        .sort((a, b) => b._score - a._score); // Sort by relevance when searching
    }

    // Apply sorting (only if not searching, since search has its own relevance sort)
    if (!searchTerm.trim()) {
      switch (sortBy) {
        case 'oldest':
          filtered = [...filtered].sort((a, b) =>
            new Date(a.created_at) - new Date(b.created_at)
          );
          break;
        case 'newest':
          filtered = [...filtered].sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
          );
          break;
        case 'front-az':
          filtered = [...filtered].sort((a, b) =>
            a.front.localeCompare(b.front)
          );
          break;
        case 'front-za':
          filtered = [...filtered].sort((a, b) =>
            b.front.localeCompare(a.front)
          );
          break;
        case 'due-soon':
          filtered = [...filtered].sort((a, b) =>
            new Date(a.next_review) - new Date(b.next_review)
          );
          break;
        default:
          break;
      }
    }

    setFilteredCards(filtered);
  };

  const exportToCSV = () => {
    const cardsToExport = filteredCards.length > 0 ? filteredCards : flashcards;

    // Create CSV content - just front, back, and set
    const csvRows = [];
    csvRows.push(['Front', 'Back', 'Set'].join(','));

    cardsToExport.forEach(card => {
      const setName = card.flashcard_sets?.name || 'Unassigned';
      // For cloze cards, export the source text and answer
      const frontText = card.card_type === 'cloze' && card.cloze_data
        ? card.cloze_data.source_text || card.front
        : card.front;
      const backText = card.card_type === 'cloze' && card.cloze_data
        ? `c${card.cloze_data.cloze_number}: ${card.back}`
        : card.back;

      const row = [
        `"${frontText.replace(/"/g, '""')}"`,
        `"${backText.replace(/"/g, '""')}"`,
        `"${setName}"`
      ].join(',');
      csvRows.push(row);
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `flashcards_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const cardsToExport = filteredCards.length > 0 ? filteredCards : flashcards;

    // Create a printable HTML page
    const printWindow = window.open('', '_blank');
    const setName = selectedSet !== 'all' ?
      (selectedSet === 'unassigned' ? 'Unassigned Cards' : sets.find(s => s.id === selectedSet)?.name) :
      'All Flashcards';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Flashcards - ${setName}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header h1 {
            color: #333;
            margin: 0 0 10px 0;
          }
          .header p {
            color: #666;
            margin: 0;
          }
          .flashcard {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            page-break-inside: avoid;
          }
          .flashcard-number {
            font-size: 12px;
            color: #999;
            margin-bottom: 10px;
          }
          .flashcard-front {
            margin-bottom: 15px;
          }
          .flashcard-front strong {
            color: #667eea;
            display: block;
            margin-bottom: 5px;
          }
          .flashcard-back strong {
            color: #764ba2;
            display: block;
            margin-bottom: 5px;
          }
          .flashcard-meta {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
          }
          .set-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            background: #f0f0f0;
          }
          @media print {
            body { background: white; }
            .flashcard { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${setName}</h1>
          <p>${cardsToExport.length} cards</p>
        </div>
        ${cardsToExport.map((card, index) => {
          // Handle cloze cards differently
          const frontText = card.card_type === 'cloze' && card.cloze_data
            ? (card.cloze_data.source_text || card.front).replace(/\{\{c\d+::([^}]+)\}\}/g, '[$1]')
            : card.front;
          const backText = card.card_type === 'cloze' && card.cloze_data
            ? 'c' + card.cloze_data.cloze_number + ': ' + card.back
            : card.back;

          return '<div class="flashcard">' +
            '<div class="flashcard-number">Card ' + (index + 1) + ' of ' + cardsToExport.length + '</div>' +
            '<div class="flashcard-front"><strong>Question:</strong> ' + frontText + '</div>' +
            '<div class="flashcard-back"><strong>Answer:</strong> ' + backText + '</div>' +
            '<div class="flashcard-meta"><span class="set-badge">' + (card.flashcard_sets?.icon || '📚') + ' ' + (card.flashcard_sets?.name || 'Unassigned') + '</span></div>' +
          '</div>';
        }).join('')}
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this flashcard?')) return;

    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', id);

    if (!error) {
      setFlashcards(flashcards.filter(card => card.id !== id));
    }
  };

  const handleEdit = (card) => {
    setEditingCard({ ...card });
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from('flashcards')
      .update({
        front: editingCard.front,
        back: editingCard.back,
        set_id: editingCard.set_id,
      })
      .eq('id', editingCard.id);

    if (!error) {
      // Refetch to get updated set info
      await fetchFlashcards();
      setEditingCard(null);
    }
  };

  const handleChangeSet = async (cardId, newSetId) => {
    const { error } = await supabase
      .from('flashcards')
      .update({ set_id: newSetId || null })
      .eq('id', cardId);

    if (!error) {
      await fetchFlashcards();
    } else {
      alert('Error changing set: ' + error.message);
    }
  };

  const handleCancel = () => {
    setEditingCard(null);
  };

  const toggleFlag = async (cardId, currentFlagStatus) => {
    const { error } = await supabase
      .from('flashcards')
      .update({ is_flagged: !currentFlagStatus })
      .eq('id', cardId);

    if (!error) {
      // Update local state
      setFlashcards(flashcards.map(card =>
        card.id === cardId
          ? { ...card, is_flagged: !currentFlagStatus }
          : card
      ));
    } else {
      alert('Error updating flag: ' + error.message);
    }
  };

  const openCreateSetModal = () => {
    const flaggedCards = flashcards.filter(card => card.is_flagged);

    if (flaggedCards.length === 0) {
      alert('No flagged flashcards to create a set from!');
      return;
    }

    setNewSetName('Difficult Cards');
    setShowCreateSetModal(true);
  };

  const createSetFromFlagged = async () => {
    if (!newSetName.trim()) {
      alert('Please enter a name for the set.');
      return;
    }

    const flaggedCards = flashcards.filter(card => card.is_flagged);

    // Create the new set
    const { data: newSet, error: setError } = await supabase
      .from('flashcard_sets')
      .insert([{
        name: newSetName.trim(),
        description: 'Collection of flagged difficult cards',
        color: '#ef4444',
        icon: '🚩'
      }])
      .select()
      .single();

    if (setError) {
      alert('Error creating set: ' + setError.message);
      return;
    }

    // Assign all flagged cards to the new set
    const { error: updateError } = await supabase
      .from('flashcards')
      .update({ set_id: newSet.id })
      .eq('is_flagged', true);

    if (updateError) {
      alert('Error assigning cards to set: ' + updateError.message);
      return;
    }

    // Close modal and show success
    setShowCreateSetModal(false);
    setNewSetName('');
    alert(`✅ Set "${newSetName.trim()}" created successfully with ${flaggedCards.length} cards!\n\nYou can unflag cards anytime from the flashcard list.`);

    // Refresh the flashcards list
    fetchFlashcards();
    fetchSets();
  };

  const unflagCardsInSet = async (setId, setName) => {
    if (!confirm(`Unflag all cards in "${setName}"?\n\nThis will remove the flag from all cards in this set.`)) {
      return;
    }

    const { error } = await supabase
      .from('flashcards')
      .update({ is_flagged: false })
      .eq('set_id', setId);

    if (error) {
      alert('Error unflagging cards: ' + error.message);
    } else {
      alert(`✅ All cards in "${setName}" have been unflagged!`);
      fetchFlashcards();
    }
  };

  const deleteSet = async (setId, setName) => {
    if (!confirm(`Delete set "${setName}"?\n\nCards in this set will become unassigned (not deleted).`)) {
      return;
    }

    // First, unassign all cards from this set
    await supabase
      .from('flashcards')
      .update({ set_id: null })
      .eq('set_id', setId);

    // Then delete the set
    const { error } = await supabase
      .from('flashcard_sets')
      .delete()
      .eq('id', setId);

    if (error) {
      alert('Error deleting set: ' + error.message);
    } else {
      alert(`✅ Set "${setName}" has been deleted!`);
      fetchFlashcards();
      fetchSets();
    }
  };

  if (loading) {
    return <div className="loading">Loading flashcards...</div>;
  }

  return (
    <div className="flashcard-list">
      <div className="list-header">
        <h1>📋 Manage Flashcards</h1>
        <button
          className="btn-primary"
          onClick={() => navigate('/flashcards/create')}
        >
          ➕ Create New
        </button>
      </div>

      <div className="filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search flashcards (fuzzy match)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button
              className="search-clear"
              onClick={() => setSearchTerm('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-controls">
          <div className="set-filter">
            <select
              id="set-filter"
              value={selectedSet}
              onChange={(e) => setSelectedSet(e.target.value)}
              title="Filter by set"
            >
              <option value="all">📁 All Sets</option>
              <option value="flagged">🚩 Flagged</option>
              <option value="unassigned">📭 Unassigned</option>
              {sets.map(set => (
                <option key={set.id} value={set.id}>
                  {set.icon} {set.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sort-filter">
            <select
              id="sort-filter"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              title="Sort cards"
            >
              <option value="newest">📅 Newest First</option>
              <option value="oldest">📅 Oldest First</option>
              <option value="front-az">🔤 A → Z</option>
              <option value="front-za">🔤 Z → A</option>
              <option value="due-soon">⏰ Due Soon</option>
            </select>
          </div>

          <button
            className={`btn-filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="More filters"
          >
            🎛️ Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="advanced-filters">
          <div className="filter-chips">
            <span className="filter-label">Quick filters:</span>
            <button
              className={`filter-chip ${selectedSet === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedSet('all')}
            >
              All ({flashcards.length})
            </button>
            <button
              className={`filter-chip ${selectedSet === 'flagged' ? 'active' : ''}`}
              onClick={() => setSelectedSet('flagged')}
            >
              🚩 Flagged ({flashcards.filter(c => c.is_flagged).length})
            </button>
            <button
              className={`filter-chip ${selectedSet === 'unassigned' ? 'active' : ''}`}
              onClick={() => setSelectedSet('unassigned')}
            >
              Unassigned ({flashcards.filter(c => !c.set_id).length})
            </button>
            {sets.map(set => (
              <button
                key={set.id}
                className={`filter-chip ${selectedSet === set.id ? 'active' : ''}`}
                onClick={() => setSelectedSet(set.id)}
                style={{ borderLeftColor: set.color }}
              >
                {set.icon} {set.name} ({flashcards.filter(c => c.set_id === set.id).length})
              </button>
            ))}
          </div>
        </div>
      )}

      {flashcards.filter(card => card.is_flagged).length > 0 && (
        <div className="flagged-section">
          <div className="flagged-section-content">
            <div className="flagged-info">
              <span className="flagged-icon">🚩</span>
              <div className="flagged-text">
                <strong>{flashcards.filter(card => card.is_flagged).length} Flagged Card{flashcards.filter(card => card.is_flagged).length !== 1 ? 's' : ''}</strong>
                <span className="flagged-subtext">Cards marked as difficult</span>
              </div>
            </div>
            <button
              className="btn-create-set"
              onClick={openCreateSetModal}
            >
              <span className="btn-icon">📚</span>
              Create Set from Flagged Cards
            </button>
          </div>
        </div>
      )}

      {selectedSet !== 'all' && selectedSet !== 'unassigned' && selectedSet !== 'flagged' && sets.find(s => s.id === selectedSet) && (
        <div className="set-management-section">
          <div className="set-management-header">
            <div className="set-info">
              <span className="set-icon-large">{sets.find(s => s.id === selectedSet)?.icon}</span>
              <div>
                <h3>{sets.find(s => s.id === selectedSet)?.name}</h3>
                <p className="set-description">{sets.find(s => s.id === selectedSet)?.description}</p>
              </div>
            </div>
            <div className="set-actions">
              <button
                className="btn-secondary btn-sm"
                onClick={() => unflagCardsInSet(selectedSet, sets.find(s => s.id === selectedSet)?.name)}
                title="Remove flag from all cards in this set"
              >
                🏳️ Unflag All Cards
              </button>
              <button
                className="btn-danger btn-sm"
                onClick={() => deleteSet(selectedSet, sets.find(s => s.id === selectedSet)?.name)}
                title="Delete this set (cards will be unassigned, not deleted)"
              >
                🗑️ Delete Set
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="list-stats">
        <div className="stat">
          Showing: {filteredCards.length} of {flashcards.length}
        </div>
        <div className="export-actions">
          <button
            className="btn-secondary btn-sm"
            onClick={exportToCSV}
            disabled={flashcards.length === 0}
            title="Export to CSV (Excel)"
          >
            📊 Export to CSV
          </button>
          <button
            className="btn-secondary btn-sm"
            onClick={exportToPDF}
            disabled={flashcards.length === 0}
            title="Export to PDF (Print)"
          >
            📄 Export to PDF
          </button>
        </div>
      </div>

      {filteredCards.length === 0 ? (
        <div className="empty-state">
          <p>No flashcards yet!</p>
          <button
            className="btn-primary"
            onClick={() => navigate('/flashcards/create')}
          >
            Create Your First Flashcard
          </button>
        </div>
      ) : (
        <div className="flashcard-table-container">
          <table className="flashcard-table">
            <thead>
              <tr>
                <th className="col-flag"></th>
                <th className="col-front">Front</th>
                <th className="col-back">Back</th>
                <th className="col-set">Set</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCards.map((card) => (
                <tr key={card.id} className={`flashcard-row ${card.is_flagged ? 'flagged' : ''}`}>
                  {editingCard && editingCard.id === card.id ? (
                    <>
                      <td className="col-flag">
                        <button
                          onClick={() => setEditingCard({
                            ...editingCard,
                            is_flagged: !editingCard.is_flagged
                          })}
                          className="btn-icon-table"
                          title={editingCard.is_flagged ? 'Unflag' : 'Flag'}
                        >
                          {editingCard.is_flagged ? '🚩' : '🏳️'}
                        </button>
                      </td>
                      <td className="col-front">
                        <textarea
                          value={editingCard.front}
                          onChange={(e) => setEditingCard({
                            ...editingCard,
                            front: e.target.value
                          })}
                          className="table-textarea"
                          rows={2}
                        />
                      </td>
                      <td className="col-back">
                        <textarea
                          value={editingCard.back}
                          onChange={(e) => setEditingCard({
                            ...editingCard,
                            back: e.target.value
                          })}
                          className="table-textarea"
                          rows={2}
                        />
                      </td>
                      <td className="col-set">
                        <select
                          value={editingCard.set_id || ''}
                          onChange={(e) => setEditingCard({
                            ...editingCard,
                            set_id: e.target.value || null
                          })}
                          className="table-select"
                        >
                          <option value="">Unassigned</option>
                          {sets.map(set => (
                            <option key={set.id} value={set.id}>
                              {set.icon} {set.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="col-actions">
                        <div className="table-actions">
                          <button onClick={handleSave} className="btn-icon-table btn-save-table" title="Save">
                            ✓
                          </button>
                          <button onClick={handleCancel} className="btn-icon-table btn-cancel-table" title="Cancel">
                            ✕
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="col-flag">
                        <button
                          onClick={() => toggleFlag(card.id, card.is_flagged)}
                          className="btn-icon-table"
                          title={card.is_flagged ? 'Unflag' : 'Flag as difficult'}
                        >
                          {card.is_flagged ? '🚩' : '🏳️'}
                        </button>
                      </td>
                      <td className="col-front">
                        {card.card_type === 'cloze' && card.cloze_data ? (
                          <div className="cloze-cell">
                            <span className="cloze-badge">CLOZE</span>
                            <div className="cloze-preview-text">
                              {card.cloze_data.source_text?.replace(/\{\{c\d+::([^}]+)\}\}/g, '[$1]').substring(0, 60)}
                              {card.cloze_data.source_text?.length > 60 ? '...' : ''}
                            </div>
                            <div className="cloze-info">
                              c{card.cloze_data.cloze_number}: <strong>{card.back}</strong>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="cell-text">{card.front}</div>
                            {card.slides && (
                              <div className="cell-source">
                                📄 Slide {card.slides.slide_number}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="col-back">
                        <div className="cell-text">{card.card_type === 'cloze' ? card.cloze_data?.extractions?.find(e => e.number === card.cloze_data?.cloze_number)?.word || card.back : card.back}</div>
                        {card.notes && (
                          <div className="cell-notes">
                            <span className="notes-indicator">📝</span>
                            <span className="notes-preview">{card.notes.length > 50 ? card.notes.substring(0, 50) + '...' : card.notes}</span>
                          </div>
                        )}
                      </td>
                      <td className="col-set">
                        <select
                          className="table-select-compact"
                          value={card.set_id || ''}
                          onChange={(e) => handleChangeSet(card.id, e.target.value)}
                          title="Change set"
                          style={{ borderLeftColor: card.flashcard_sets?.color || '#9ca3af' }}
                        >
                          <option value="">Unassigned</option>
                          {sets.map(set => (
                            <option key={set.id} value={set.id}>
                              {set.icon} {set.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="col-actions">
                        <div className="table-actions">
                          {card.card_type === 'cloze' ? (
                            <button
                              onClick={() => navigate(`/flashcards/edit/${card.id}`)}
                              className="btn-icon-table"
                              title="Edit cloze card"
                            >
                              ✏️
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(card)}
                                className="btn-icon-table"
                                title="Quick edit"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => navigate(`/flashcards/edit/${card.id}`)}
                                className="btn-icon-table"
                                title="Open in editor"
                              >
                                📝
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(card.id)}
                            className="btn-icon-table btn-danger-table"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Set Modal */}
      {showCreateSetModal && (
        <div className="modal-overlay" onClick={() => setShowCreateSetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📚 Create New Set</h2>
              <button
                className="modal-close"
                onClick={() => setShowCreateSetModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-description">
                Create a new set from {flashcards.filter(card => card.is_flagged).length} flagged card{flashcards.filter(card => card.is_flagged).length !== 1 ? 's' : ''}
              </p>

              <div className="modal-form-group">
                <label htmlFor="set-name">Set Name</label>
                <input
                  id="set-name"
                  type="text"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  placeholder="Enter set name..."
                  className="modal-input"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      createSetFromFlagged();
                    }
                  }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowCreateSetModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={createSetFromFlagged}
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

export default FlashcardList;
