import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const MultiSetSelector = ({
  selectedSets,
  onSelectionChange,
  sets,
  label = "Assign to Sets (optional)",
  showSearch = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSets, setFilteredSets] = useState(sets);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (searchTerm.trim()) {
      setFilteredSets(
        sets.filter(set =>
          set.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredSets(sets);
    }
  }, [searchTerm, sets]);

  const toggleSet = (setId) => {
    if (selectedSets.includes(setId)) {
      onSelectionChange(selectedSets.filter(id => id !== setId));
    } else {
      onSelectionChange([...selectedSets, setId]);
    }
  };

  const selectAll = () => {
    onSelectionChange(filteredSets.map(set => set.id));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const getSelectedSetNames = () => {
    return sets
      .filter(set => selectedSets.includes(set.id))
      .map(set => `${set.icon} ${set.name}`)
      .join(', ');
  };

  // Show search when there are 10+ sets
  const shouldShowSearch = showSearch && sets.length >= 10;

  return (
    <div className="multi-set-selector">
      <label>{label}</label>

      <div className="set-selector-trigger" onClick={() => setShowDropdown(!showDropdown)}>
        <div className="selected-sets-display">
          {selectedSets.length === 0 ? (
            <span className="placeholder">No sets selected</span>
          ) : (
            <span className="selected-count">
              {selectedSets.length} set{selectedSets.length !== 1 ? 's' : ''} selected
              {selectedSets.length <= 3 && `: ${getSelectedSetNames()}`}
            </span>
          )}
        </div>
        <span className="dropdown-arrow">{showDropdown ? '▲' : '▼'}</span>
      </div>

      {showDropdown && (
        <div className="set-selector-dropdown">
          <div className="dropdown-header">
            {shouldShowSearch && (
              <input
                type="text"
                className="set-search"
                placeholder="🔍 Search sets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <div className="dropdown-actions">
              <button
                type="button"
                className="btn-text btn-sm"
                onClick={(e) => { e.stopPropagation(); selectAll(); }}
              >
                Select All {searchTerm && `(${filteredSets.length})`}
              </button>
              <button
                type="button"
                className="btn-text btn-sm"
                onClick={(e) => { e.stopPropagation(); clearAll(); }}
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="set-options-list">
            {filteredSets.length === 0 ? (
              <div className="no-sets-message">
                {searchTerm ? 'No sets match your search' : 'No sets available'}
              </div>
            ) : (
              filteredSets.map(set => (
                <div
                  key={set.id}
                  className={`set-option ${selectedSets.includes(set.id) ? 'selected' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleSet(set.id); }}
                  style={{ borderLeft: `4px solid ${set.color}` }}
                >
                  <input
                    type="checkbox"
                    checked={selectedSets.includes(set.id)}
                    onChange={() => {}}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="set-icon">{set.icon}</span>
                  <span className="set-name">{set.name}</span>
                </div>
              ))
            )}
          </div>

          {selectedSets.length > 0 && (
            <div className="dropdown-footer">
              <span className="selected-summary">
                {selectedSets.length} set{selectedSets.length !== 1 ? 's' : ''} selected
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

MultiSetSelector.propTypes = {
  selectedSets: PropTypes.array.isRequired,
  onSelectionChange: PropTypes.func.isRequired,
  sets: PropTypes.array.isRequired,
  label: PropTypes.string,
  showSearch: PropTypes.bool
};

export default MultiSetSelector;
