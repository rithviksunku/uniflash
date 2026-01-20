import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const FlashcardList = () => {
  const navigate = useNavigate();
  const [flashcards, setFlashcards] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sets, setSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState('all');

  useEffect(() => {
    fetchFlashcards();
    fetchSets();
  }, []);

  useEffect(() => {
    filterFlashcards();
  }, [flashcards, searchTerm, selectedSet]);

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

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(card =>
        card.front.toLowerCase().includes(search) ||
        card.back.toLowerCase().includes(search)
      );
    }

    setFilteredCards(filtered);
  };

  const exportToCSV = () => {
    const cardsToExport = filteredCards.length > 0 ? filteredCards : flashcards;

    // Create CSV content
    const csvRows = [];
    csvRows.push(['Front', 'Back', 'Set', 'Next Review', 'Interval (days)'].join(','));

    cardsToExport.forEach(card => {
      const setName = card.flashcard_sets?.name || 'Unassigned';
      const nextReview = new Date(card.next_review).toLocaleDateString();
      const row = [
        `"${card.front.replace(/"/g, '""')}"`,
        `"${card.back.replace(/"/g, '""')}"`,
        `"${setName}"`,
        nextReview,
        card.interval_days
      ].join(',');
      csvRows.push(row);
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `uniflash_flashcards_${new Date().toISOString().split('T')[0]}.csv`);
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
        <title>Uniflash Flashcards - ${setName}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
            color: #667eea;
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
            margin-right: 10px;
          }
          @media print {
            body { background: white; }
            .flashcard { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🦄 Uniflash Flashcards</h1>
          <p>${setName} • ${cardsToExport.length} cards • Exported on ${new Date().toLocaleDateString()}</p>
        </div>
        ${cardsToExport.map((card, index) => `
          <div class="flashcard">
            <div class="flashcard-number">Card ${index + 1} of ${cardsToExport.length}</div>
            <div class="flashcard-front">
              <strong>Question:</strong>
              ${card.front}
            </div>
            <div class="flashcard-back">
              <strong>Answer:</strong>
              ${card.back}
            </div>
            <div class="flashcard-meta">
              <span class="set-badge">${card.flashcard_sets?.icon || '📚'} ${card.flashcard_sets?.name || 'Unassigned'}</span>
              <span>Next Review: ${new Date(card.next_review).toLocaleDateString()}</span>
            </div>
          </div>
        `).join('')}
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
      })
      .eq('id', editingCard.id);

    if (!error) {
      setFlashcards(flashcards.map(card =>
        card.id === editingCard.id ? editingCard : card
      ));
      setEditingCard(null);
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

  const createSetFromFlagged = async () => {
    const flaggedCards = flashcards.filter(card => card.is_flagged);

    if (flaggedCards.length === 0) {
      alert('No flagged flashcards to create a set from!');
      return;
    }

    const setName = prompt(
      `Create a new set from ${flaggedCards.length} flagged card(s).\n\nEnter a name for this set:`,
      'Difficult Cards'
    );

    if (!setName) return;

    // Create the new set
    const { data: newSet, error: setError } = await supabase
      .from('flashcard_sets')
      .insert([{
        name: setName,
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

    // Optional: Unflag the cards after adding to set
    const shouldUnflag = confirm(
      `Set "${setName}" created successfully with ${flaggedCards.length} cards!\n\nWould you like to unflag these cards now?`
    );

    if (shouldUnflag) {
      await supabase
        .from('flashcards')
        .update({ is_flagged: false })
        .eq('set_id', newSet.id);
    }

    // Refresh the flashcards list
    fetchFlashcards();
    fetchSets();
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
            placeholder="🔍 Search flashcards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="set-filter">
          <label htmlFor="set-filter">Filter by Set:</label>
          <select
            id="set-filter"
            value={selectedSet}
            onChange={(e) => setSelectedSet(e.target.value)}
          >
            <option value="all">All Flashcards</option>
            <option value="flagged">🚩 Flagged Cards</option>
            <option value="unassigned">Unassigned</option>
            {sets.map(set => (
              <option key={set.id} value={set.id}>
                {set.icon} {set.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {flashcards.filter(card => card.is_flagged).length > 0 && (
        <div className="flagged-section">
          <div className="flagged-info">
            🚩 You have {flashcards.filter(card => card.is_flagged).length} flagged card(s)
          </div>
          <button
            className="btn-primary"
            onClick={createSetFromFlagged}
          >
            Create Set from Flagged Cards
          </button>
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
        <div className="flashcard-grid">
          {filteredCards.map((card) => (
            <div key={card.id} className="flashcard-item">
              {editingCard && editingCard.id === card.id ? (
                <div className="edit-mode">
                  <div className="edit-field">
                    <label>Front:</label>
                    <textarea
                      value={editingCard.front}
                      onChange={(e) => setEditingCard({
                        ...editingCard,
                        front: e.target.value
                      })}
                      rows={3}
                    />
                  </div>
                  <div className="edit-field">
                    <label>Back:</label>
                    <textarea
                      value={editingCard.back}
                      onChange={(e) => setEditingCard({
                        ...editingCard,
                        back: e.target.value
                      })}
                      rows={3}
                    />
                  </div>
                  <div className="edit-actions">
                    <button onClick={handleCancel} className="btn-secondary">
                      Cancel
                    </button>
                    <button onClick={handleSave} className="btn-primary">
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="card-header-badges">
                    {card.flashcard_sets && (
                      <div className="card-set-badge" style={{ borderLeft: `4px solid ${card.flashcard_sets.color}` }}>
                        {card.flashcard_sets.icon} {card.flashcard_sets.name}
                      </div>
                    )}
                    {card.is_flagged && (
                      <div className="card-flag-badge">
                        🚩 Flagged
                      </div>
                    )}
                  </div>
                  <div className="card-content">
                    <div className="card-side">
                      <div className="card-label">Front:</div>
                      <div className="card-text">{card.front}</div>
                    </div>
                    <div className="card-side">
                      <div className="card-label">Back:</div>
                      <div className="card-text">{card.back}</div>
                    </div>
                  </div>
                  {card.slides && (
                    <div className="card-source">
                      📄 Slide {card.slides.slide_number}: {card.slides.title}
                    </div>
                  )}
                  <div className="card-actions">
                    <button
                      onClick={() => toggleFlag(card.id, card.is_flagged)}
                      className={card.is_flagged ? "btn-warning" : "btn-secondary"}
                      title={card.is_flagged ? "Unflag this card" : "Flag as difficult"}
                    >
                      {card.is_flagged ? '🚩 Unflag' : '🏳️ Flag'}
                    </button>
                    <button
                      onClick={() => handleEdit(card)}
                      className="btn-secondary"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(card.id)}
                      className="btn-danger"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlashcardList;
