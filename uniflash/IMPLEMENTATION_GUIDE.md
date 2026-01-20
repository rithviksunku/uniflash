# Uniflash Healthcare Student Edition - Implementation Guide

## ✅ COMPLETED FEATURES

### 1. Navigation System
- ✅ Created persistent sidebar navigation ([Navigation.jsx](src/components/Navigation.jsx))
- ✅ Mobile-responsive design
- ✅ Active route highlighting
- ✅ Updated App layout to accommodate navigation

### 2. PowerPoint & PDF Parsing
- ✅ PowerPoint parsing with JSZip
- ✅ PDF parsing with pdf.js
- ✅ AI-powered content extraction for PDFs
- ✅ Structured content analysis for healthcare materials

## 🚧 REQUIRED IMPLEMENTATION STEPS

### Step 1: Update Database Schema for Flashcard Sets

Add this SQL to your Supabase database:

```sql
-- Flashcard Sets table
CREATE TABLE flashcard_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#9333ea',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update flashcards table to include set_id
ALTER TABLE flashcards
ADD COLUMN set_id UUID REFERENCES flashcard_sets(id) ON DELETE SET NULL;

-- Create index
CREATE INDEX idx_flashcards_set_id ON flashcards(set_id);

-- Update presentations table to support PDFs
ALTER TABLE presentations
ADD COLUMN file_type TEXT DEFAULT 'pptx';
```

### Step 2: Create Flashcard Sets Management Page

Create `src/pages/FlashcardSets.jsx`:

```javascript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const FlashcardSets = () => {
  const navigate = useNavigate();
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSet, setNewSet] = useState({ name: '', description: '', color: '#9333ea' });

  useEffect(() => {
    fetchSets();
  }, []);

  const fetchSets = async () => {
    const { data, error } = await supabase
      .from('flashcard_sets')
      .select(`
        *,
        flashcards (count)
      `)
      .order('created_at', { ascending: false });

    if (!error) {
      setSets(data);
    }
    setLoading(false);
  };

  const handleCreateSet = async () => {
    const { data, error } = await supabase
      .from('flashcard_sets')
      .insert([newSet])
      .select()
      .single();

    if (!error) {
      setSets([data, ...sets]);
      setShowCreateModal(false);
      setNewSet({ name: '', description: '', color: '#9333ea' });
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
    }
  };

  if (loading) return <div className="loading">Loading sets...</div>;

  return (
    <div className="flashcard-sets">
      <div className="sets-header">
        <h1>📚 My Flashcard Sets</h1>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          ➕ Create New Set
        </button>
      </div>

      <div className="sets-grid">
        {sets.map(set => (
          <div
            key={set.id}
            className="set-card"
            style={{ borderLeft: `4px solid ${set.color}` }}
          >
            <h3>{set.name}</h3>
            <p>{set.description}</p>
            <div className="set-stats">
              <span>{set.flashcards?.[0]?.count || 0} cards</span>
            </div>
            <div className="set-actions">
              <button onClick={() => navigate(`/flashcards?set=${set.id}`)}>
                View Cards
              </button>
              <button onClick={() => navigate(`/review?set=${set.id}`)}>
                Study
              </button>
              <button className="btn-danger" onClick={() => handleDeleteSet(set.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create New Set</h2>
            <input
              placeholder="Set Name (e.g., Anatomy Chapter 5)"
              value={newSet.name}
              onChange={e => setNewSet({...newSet, name: e.target.value})}
            />
            <textarea
              placeholder="Description (optional)"
              value={newSet.description}
              onChange={e => setNewSet({...newSet, description: e.target.value})}
            />
            <label>Color:</label>
            <input
              type="color"
              value={newSet.color}
              onChange={e => setNewSet({...newSet, color: e.target.value})}
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreateSet}>
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
```

### Step 3: Update Upload Page to Support PDF

Modify `src/pages/UploadSlides.jsx`:

```javascript
// Add PDF imports
import { parsePDF, validatePDFFile, extractStructuredContentWithAI } from '../services/pdfParser';

// Update file validation
const handleFileChange = (e) => {
  const selectedFile = e.target.files[0];
  const isPPTX = validatePPTXFile(selectedFile);
  const isPDF = validatePDFFile(selectedFile);

  if (selectedFile && (isPPTX || isPDF)) {
    setFile(selectedFile);
    setFileType(isPDF ? 'pdf' : 'pptx');
    setError(null);
  } else {
    setError('Please select a valid PowerPoint (.pptx) or PDF file');
    setFile(null);
  }
};

// Update upload handler
const handleUpload = async () => {
  if (!file) return;
  setUploading(true);
  setError(null);

  try {
    let parsedContent;

    if (fileType === 'pdf') {
      const pdfPages = await parsePDF(file);
      parsedContent = await extractStructuredContentWithAI(pdfPages);
    } else {
      parsedContent = await parsePPTX(file);
    }

    // ... rest of upload logic
  } catch (err) {
    setError(err.message);
  } finally {
    setUploading(false);
  }
};
```

### Step 4: Add AI Grammar Cleanup to OpenAI Service

Add to `src/services/openai.js`:

```javascript
/**
 * Clean up grammar and improve flashcard text using AI
 * @param {string} front - Front of flashcard
 * @param {string} back - Back of flashcard
 * @returns {Promise<Object>} Cleaned up flashcard
 */
export const cleanupFlashcardGrammar = async (front, back) => {
  try {
    const client = getOpenAIClient();

    const prompt = `Clean up and improve this medical/healthcare flashcard for better clarity and grammar. Keep medical terminology accurate.

Front: ${front}
Back: ${back}

Return ONLY a JSON object (no markdown):
{
  "front": "improved front text",
  "back": "improved back text"
}`;

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert medical educator who improves flashcard clarity while maintaining medical accuracy.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    let content = response.choices[0].message.content.trim();
    if (content.startsWith('```')) {
      content = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('Error cleaning flashcard:', error);
    throw error;
  }
};
```

### Step 5: Update Create Flashcard Page

Modify `src/pages/CreateFlashcard.jsx` to include:
- Set selection dropdown
- AI grammar cleanup button
- Better healthcare-focused UI

### Step 6: Update Navigation

Add to `src/components/Navigation.jsx`:

```javascript
<button
  className={`nav-item ${isActive('/sets') ? 'active' : ''}`}
  onClick={() => navigate('/sets')}
>
  <span className="nav-icon">📚</span>
  <span className="nav-label">My Sets</span>
</button>
```

### Step 7: Healthcare-Friendly UI Improvements

Add to `src/styles/index.css`:

```css
/* Larger, easier-to-click buttons */
.btn-primary, .btn-secondary {
  min-height: 48px;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* Better focus states for accessibility */
*:focus-visible {
  outline: 3px solid var(--primary);
  outline-offset: 2px;
}

/* Larger touch targets for mobile */
@media (max-width: 768px) {
  button, .nav-item, .card {
    min-height: 52px;
  }
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: var(--radius-xl);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal h2 {
  margin-bottom: 1.5rem;
  color: var(--primary);
}

.modal input,
.modal textarea {
  margin-bottom: 1rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}
```

## 📋 RECOMMENDED WORKFLOW FOR HEALTHCARE STUDENTS

### 1. Upload Content
- Upload lecture PDFs or PowerPoint slides
- AI automatically extracts key concepts

### 2. Create Flashcard Sets
- Create sets by topic (e.g., "Cardiology Week 1", "Pharmacology Chapter 3")
- Assign colors for easy identification

### 3. Generate or Create Flashcards
- Auto-generate from PDFs with AI
- Manually create cards and assign to sets
- Use AI grammar cleanup for clarity

### 4. Study with Spaced Repetition
- Select one or multiple sets to review
- Active time tracking shows real study time
- SRS algorithm optimizes retention

### 5. Test with Quizzes
- Generate quizzes from multiple sets
- AI creates realistic medical scenarios
- Review missed questions and create flashcards

## 🎨 HEALTHCARE-SPECIFIC UI FEATURES

### Color-Coded Sets
- Anatomy (Red)
- Physiology (Blue)
- Pharmacology (Green)
- Pathology (Purple)
- Easy visual organization

### Medical Terminology Support
- AI recognizes and preserves medical terms
- Grammar cleanup maintains accuracy
- Specialized prompts for healthcare content

### Study Session Features
- Break reminders (every 25 minutes)
- Progress tracking per set
- Export study statistics

### Accessibility
- High contrast mode option
- Large touch targets (48px minimum)
- Keyboard navigation support
- Screen reader friendly

## 🚀 NEXT STEPS TO COMPLETE

1. ✅ Navigation - COMPLETE
2. ✅ PDF Parsing - COMPLETE
3. ⏳ Run database migrations (Step 1)
4. ⏳ Create FlashcardSets page (Step 2)
5. ⏳ Update UploadSlides for PDF (Step 3)
6. ⏳ Add AI grammar cleanup (Step 4)
7. ⏳ Update CreateFlashcard with sets (Step 5)
8. ⏳ Add set selection to Review
9. ⏳ Update Quiz generation for multi-set
10. ⏳ Add modal styles and UI improvements

## 💡 TIPS FOR DEVELOPMENT

- Test with actual medical content (anatomy, pharmacology PDFs)
- Large buttons and clear labels reduce errors
- Color coding helps visual learners
- Set-based organization matches study structure
- AI grammar helps non-native English speakers

## 🔐 SECURITY CONSIDERATIONS

- Validate all file uploads (size, type)
- Sanitize user input before AI processing
- Rate limit API calls to prevent abuse
- Store sensitive data in environment variables
