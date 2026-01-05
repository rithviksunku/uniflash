import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const FlashcardList = () => {
  const navigate = useNavigate();
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState(null);

  useEffect(() => {
    fetchFlashcards();
  }, []);

  const fetchFlashcards = async () => {
    const { data, error } = await supabase
      .from('flashcards')
      .select(`
        *,
        slides (
          title,
          slide_number
        )
      `)
      .order('created_at', { ascending: false });

    if (!error) {
      setFlashcards(data);
    }
    setLoading(false);
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

      <div className="list-stats">
        <div className="stat">Total: {flashcards.length}</div>
      </div>

      {flashcards.length === 0 ? (
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
          {flashcards.map((card) => (
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
