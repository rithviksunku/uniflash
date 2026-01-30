import PropTypes from 'prop-types';

/**
 * Renders a cloze deletion flashcard during review/practice.
 * Shows the source text with the target cloze blanked out.
 * On reveal, shows the answer in place of the blank.
 *
 * @param {Object} props
 * @param {Object} props.clozeData - The cloze card data from the database
 * @param {string} props.clozeData.source_text - Original text with {{cN::word}} markers
 * @param {number} props.clozeData.cloze_number - Which cloze this card tests
 * @param {Array} props.clozeData.extractions - All extracted cloze words
 * @param {boolean} props.showAnswer - Whether to reveal the answer
 * @param {boolean} props.reverseMode - If true, show answer and hide the surrounding context
 */
const ClozeCardDisplay = ({ clozeData, showAnswer, reverseMode = false }) => {
  if (!clozeData || !clozeData.source_text) {
    return <div className="cloze-card-error">Invalid cloze card data</div>;
  }

  const { source_text, cloze_number, extractions = [] } = clozeData;

  // Find the word for this card's cloze number
  const targetExtraction = extractions.find(e => e.number === cloze_number);
  const targetWord = targetExtraction?.word || '';

  // Parse the source text and render with appropriate blanks/reveals
  const renderClozeText = () => {
    // Regex to match {{cN::word}} patterns
    const clozeRegex = /\{\{c(\d+)::([^}]+)\}\}/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = clozeRegex.exec(source_text)) !== null) {
      // Add text before this match
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: source_text.slice(lastIndex, match.index)
        });
      }

      const matchNumber = parseInt(match[1]);
      const matchWord = match[2];

      // Determine how to display this cloze
      if (matchNumber === cloze_number) {
        // This is the target cloze for this card
        parts.push({
          type: 'target-cloze',
          number: matchNumber,
          word: matchWord
        });
      } else {
        // Other clozes - show the word (not tested on this card)
        parts.push({
          type: 'other-cloze',
          number: matchNumber,
          word: matchWord
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last match
    if (lastIndex < source_text.length) {
      parts.push({
        type: 'text',
        content: source_text.slice(lastIndex)
      });
    }

    return parts;
  };

  const parts = renderClozeText();

  if (reverseMode) {
    // Reverse mode: Show the answer, ask for context
    return (
      <div className="cloze-card">
        <div className="cloze-question-label">What goes here?</div>
        <div className="cloze-answer-hint">
          <span className="cloze-target-word">{targetWord}</span>
        </div>

        {showAnswer && (
          <div className="cloze-full-context">
            <div className="cloze-context-label">Full context:</div>
            <div className="cloze-text">
              {parts.map((part, index) => {
                if (part.type === 'text') {
                  return <span key={index}>{part.content}</span>;
                } else if (part.type === 'target-cloze') {
                  return (
                    <span key={index} className="cloze-blank cloze-revealed">
                      {part.word}
                    </span>
                  );
                } else {
                  return <span key={index} className="cloze-other">{part.word}</span>;
                }
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Normal mode: Show text with blank, reveal answer
  return (
    <div className="cloze-card">
      <div className="cloze-text">
        {parts.map((part, index) => {
          if (part.type === 'text') {
            return <span key={index}>{part.content}</span>;
          } else if (part.type === 'target-cloze') {
            // This is the cloze being tested
            if (showAnswer) {
              return (
                <span key={index} className="cloze-blank cloze-revealed">
                  {part.word}
                </span>
              );
            } else {
              return (
                <span key={index} className="cloze-blank cloze-hidden">
                  {'[...]'}
                </span>
              );
            }
          } else {
            // Other clozes - always show the word
            return <span key={index} className="cloze-other">{part.word}</span>;
          }
        })}
      </div>

      {showAnswer && (
        <div className="cloze-answer-section">
          <div className="cloze-answer-label">Answer:</div>
          <div className="cloze-answer-word">{targetWord}</div>
        </div>
      )}
    </div>
  );
};

ClozeCardDisplay.propTypes = {
  clozeData: PropTypes.shape({
    source_text: PropTypes.string.isRequired,
    cloze_number: PropTypes.number.isRequired,
    extractions: PropTypes.arrayOf(PropTypes.shape({
      number: PropTypes.number.isRequired,
      word: PropTypes.string.isRequired
    }))
  }).isRequired,
  showAnswer: PropTypes.bool.isRequired,
  reverseMode: PropTypes.bool
};

export default ClozeCardDisplay;
