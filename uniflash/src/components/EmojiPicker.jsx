import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const pickerRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isOutsideTrigger = pickerRef.current && !pickerRef.current.contains(event.target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target);

      if (isOutsideTrigger && isOutsideDropdown) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, [isOpen]);

  const handleEmojiSelect = (emoji) => {
    onChange(emoji);
    setIsOpen(false);
  };

  const dropdown = isOpen && ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      className="emoji-picker-dropdown emoji-picker-portal"
      style={{
        position: 'fixed',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        zIndex: 99999
      }}
    >
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
    </div>,
    document.body
  );

  return (
    <div className={`emoji-picker-wrapper ${className}`} ref={pickerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="emoji-picker-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Select emoji"
      >
        <span className="emoji-preview">{value || '📚'}</span>
        <span className="emoji-dropdown-icon">▼</span>
      </button>
      {dropdown}
    </div>
  );
};

export default EmojiPicker;
