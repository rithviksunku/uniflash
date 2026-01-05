import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const CreateFlashcard = () => {
  const navigate = useNavigate();
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!front.trim() || !back.trim()) {
      setError('Both front and back are required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('flashcards')
        .insert([
          {
            front: front.trim(),
            back: back.trim(),
            next_review: new Date().toISOString(),
            interval_days: 1,
          }
        ]);

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
      const { error: insertError } = await supabase
        .from('flashcards')
        .insert([
          {
            front: front.trim(),
            back: back.trim(),
            next_review: new Date().toISOString(),
            interval_days: 1,
          }
        ]);

      if (insertError) throw insertError;

      // Reset form
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
          <label htmlFor="front">Front (Question):</label>
          <textarea
            id="front"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Enter the question or prompt..."
            rows={4}
            disabled={creating}
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
            disabled={creating}
          />
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/flashcards')}
            disabled={creating}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCreateAnother}
            disabled={creating || !front.trim() || !back.trim()}
          >
            Save & Create Another
          </button>
          <button
            type="submit"
            className="btn-primary"
            onClick={handleCreate}
            disabled={creating || !front.trim() || !back.trim()}
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
        </ul>
      </div>
    </div>
  );
};

export default CreateFlashcard;
