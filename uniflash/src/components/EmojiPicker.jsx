import React, { useState, useRef, useEffect } from 'react';

// Common emoji categories for flashcard sets
const EMOJI_CATEGORIES = {
  'Study': ['📚', '📖', '📝', '✏️', '📓', '📔', '📕', '📗', '📘', '📙', '🎓', '🧠', '💡', '🔬', '🔭', '🧪', '🧬', '📐', '📏', '🖊️'],
  'Subjects': ['🔢', '➕', '🧮', '🌍', '🗺️', '🏛️', '⚖️', '💻', '🖥️', '📊', '📈', '🎨', '🎭', '🎵', '🎹', '🏃', '⚽', '🏀', '🎾', '🏋️'],
  'Nature': ['🌱', '🌿', '🍀', '🌸', '🌺', '🌻', '🌲', '🌳', '🍎', '🍊', '🍋', '🍇', '🐶', '🐱', '🦁', '🐸', '🦋', '🐝', '🌊', '⛰️'],
  'Objects': ['⭐', '🌟', '✨', '💫', '🔥', '💎', '🎯', '🏆', '🎖️', '🥇', '🎪', '🎢', '🚀', '✈️', '🚗', '🏠', '🏰', '⚡', '💼', '🔑'],
  'Symbols': ['❤️', '💜', '💙', '💚', '💛', '🧡', '🤍', '🖤', '✅', '❌', '⚠️', '❓', '❗', '💯', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣'],
  'Flags': ['🚩', '🏳️', '🏴', '🎌', '🏁', '📍', '🗂️', '📁', '📂', '🗃️', '📋', '📌', '📎', '🔖', '🏷️', '🔗', '📤', '📥', '📦', '🗄️'],
};

const EmojiPicker = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Study');
  const pickerRef = useRef(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEmojiSelect = (emoji) => {
    onChange(emoji);
    setIsOpen(false);
  };

  return (
    <div className={`emoji-picker-wrapper ${className}`} ref={pickerRef}>
      <button
        type="button"
        className="emoji-picker-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Select emoji"
      >
        <span className="emoji-preview">{value || '📚'}</span>
        <span className="emoji-dropdown-icon">▼</span>
      </button>

      {isOpen && (
        <div className="emoji-picker-dropdown">
          <div className="emoji-categories">
            {Object.keys(EMOJI_CATEGORIES).map(category => (
              <button
                key={category}
                type="button"
                className={`emoji-category-tab ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="emoji-grid">
            {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => (
              <button
                key={index}
                type="button"
                className={`emoji-option ${value === emoji ? 'selected' : ''}`}
                onClick={() => handleEmojiSelect(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;
