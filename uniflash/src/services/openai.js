import OpenAI from 'openai';

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please add VITE_OPENAI_API_KEY to your .env file.');
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true // For client-side use
  });
};

/**
 * Generate quiz questions from flashcards using OpenAI
 * @param {Array} flashcards - Array of flashcard objects
 * @param {number} questionCount - Number of questions to generate
 * @returns {Promise<Array>} Array of quiz questions
 */
export const generateQuizFromFlashcards = async (flashcards, questionCount) => {
  try {
    const client = getOpenAIClient();

    const flashcardContent = flashcards.map((fc, idx) =>
      `${idx + 1}. Front: ${fc.front}\n   Back: ${fc.back}`
    ).join('\n\n');

    const prompt = `You are an expert quiz creator for healthcare education. Based ONLY on the following flashcards, generate ${questionCount} multiple-choice quiz questions.

IMPORTANT: Only use information directly from these flashcards. Do NOT add external knowledge or make up facts.

Flashcards:
${flashcardContent}

For each question:
1. Create a question that tests understanding of the flashcard content
2. The correct answer MUST come directly from the flashcard's "Back" content
3. Create 3 plausible but clearly incorrect distractors (wrong answers)
4. All options should be similar in length and format
5. Do NOT include "all of the above" or "none of the above" options

Example question format:
Question: "What is [concept from Front]?"
Correct Answer: [exact or paraphrased from Back]
Wrong options: [similar but incorrect alternatives]

Return ONLY a JSON array with this exact structure (no markdown, no code blocks):
[
  {
    "question": "question text based on flashcard front",
    "options": ["option A", "option B", "option C", "option D"],
    "correctAnswer": "the correct option text from flashcard back",
    "sourceIndex": 0
  }
]`;

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational content creator specializing in healthcare quiz questions. Always respond with valid JSON only. Create questions based ONLY on the provided source material without adding external knowledge.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4,  // Lower temperature for more factual, less creative responses
      max_tokens: 2000
    });

    const content = response.choices[0].message.content.trim();

    // Remove markdown code blocks if present
    let jsonContent = content;
    if (content.startsWith('```')) {
      jsonContent = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '');
    }

    const questions = JSON.parse(jsonContent);

    // Map sourceIndex to actual flashcard IDs
    return questions.map(q => ({
      ...q,
      sourceId: flashcards[q.sourceIndex]?.id || flashcards[0]?.id
    }));

  } catch (error) {
    console.error('Error generating quiz with OpenAI:', error);
    throw new Error(`Failed to generate quiz: ${error.message}`);
  }
};

/**
 * Generate quiz questions from slides using OpenAI
 * @param {Array} slides - Array of slide objects
 * @param {number} questionCount - Number of questions to generate
 * @returns {Promise<Array>} Array of quiz questions
 */
export const generateQuizFromSlides = async (slides, questionCount) => {
  try {
    const client = getOpenAIClient();

    const slideContent = slides.map((slide, idx) =>
      `Slide ${idx + 1}: ${slide.title}\n${slide.content}`
    ).join('\n\n');

    const prompt = `You are an expert quiz creator for healthcare education. Based ONLY on the following presentation slides, generate ${questionCount} multiple-choice quiz questions.

CRITICAL: Extract information DIRECTLY from these slides. Do NOT add external medical knowledge or make up facts.

Slides:
${slideContent}

For each question:
1. Create a question that tests understanding of content explicitly stated in the slides
2. The correct answer MUST be found verbatim or clearly paraphrased from the slide content
3. Create 3 plausible but incorrect distractors based on the general topic
4. All options should be similar in length and format
5. Do NOT include "all of the above" or "none of the above" options
6. Reference which slide the question comes from using sourceIndex

Example:
If slide says "The mitochondria produces ATP through cellular respiration"
Question: "According to the slides, what does the mitochondria produce?"
Correct: "ATP through cellular respiration"
Wrong: [similar but not stated in slides]

Return ONLY a JSON array with this exact structure (no markdown, no code blocks):
[
  {
    "question": "question text from slide content",
    "options": ["option A", "option B", "option C", "option D"],
    "correctAnswer": "the correct option text from slides",
    "sourceIndex": 0
  }
]`;

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational content creator specializing in healthcare quiz questions. Always respond with valid JSON only. Extract quiz content ONLY from the provided slides without adding external knowledge.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,  // Very low temperature for factual extraction from slides
      max_tokens: 2000
    });

    const content = response.choices[0].message.content.trim();

    // Remove markdown code blocks if present
    let jsonContent = content;
    if (content.startsWith('```')) {
      jsonContent = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '');
    }

    const questions = JSON.parse(jsonContent);

    // Map sourceIndex to actual slide IDs
    return questions.map(q => ({
      ...q,
      sourceId: slides[q.sourceIndex]?.id || slides[0]?.id
    }));

  } catch (error) {
    console.error('Error generating quiz from slides with OpenAI:', error);
    throw new Error(`Failed to generate quiz: ${error.message}`);
  }
};

/**
 * Generate flashcards from slides using OpenAI
 * @param {Array} slides - Array of slide objects
 * @returns {Promise<Array>} Array of flashcard objects
 */
export const generateFlashcardsFromSlides = async (slides) => {
  try {
    const client = getOpenAIClient();

    const slideContent = slides.map((slide, idx) =>
      `Slide ${idx + 1}: ${slide.title}\n${slide.content}`
    ).join('\n\n');

    const prompt = `You are an expert medical educator creating flashcards for healthcare students. Based on the following presentation slides, generate high-quality flashcards.

CRITICAL INSTRUCTIONS:
1. IGNORE metadata (author names, dates, page numbers, copyright, file paths, version numbers)
2. PRIORITIZE creating flashcards for:
   - VOCABULARY: Medical terms and their definitions
   - DRUGS: Drug names, dosages, indications, side effects, contraindications
   - CAUSE & EFFECT: What causes conditions, what treatments do
   - KEY FACTS: Statistics, percentages, clinical thresholds
   - MECHANISMS: How things work (pathophysiology, drug mechanisms)
   - COMPARISONS: Differences between similar concepts

Slides:
${slideContent}

Create 3-5 flashcards per slide focusing on testable content. Each flashcard should:
1. Front: A clear, specific question with ENOUGH CONTEXT to guess the answer. Include the topic/subject being asked about.
   - BAD: "What is the mechanism of action?" (too vague - which drug?)
   - GOOD: "What is the mechanism of action of Metformin?"
   - BAD: "What are the side effects?" (what medication?)
   - GOOD: "What are the common side effects of ACE inhibitors?"
2. Back: A concise, accurate answer with key details

CRITICAL: The question (front) must contain enough context that someone could attempt to answer it without seeing the answer. Never create vague questions like "What is this?" or "Describe it" - always include the specific subject.

FLASHCARD TYPES TO CREATE:
- Definition cards: "What is [term]?" → "[definition]"
- Drug cards: "What is [drug] used for?" → "[indication, dosage if mentioned]"
- Cause/Effect: "What causes [condition]?" → "[cause]" OR "What is the effect of [treatment]?" → "[outcome]"
- Comparison: "How does [A] differ from [B]?" → "[key differences]"

Return ONLY a JSON array with this exact structure (no markdown, no code blocks):
[
  {
    "front": "specific question about the content",
    "back": "concise, accurate answer",
    "type": "vocabulary|drug|causeEffect|fact|comparison",
    "sourceIndex": 0
  }
]`;

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert medical educator who creates effective study flashcards. Focus on testable medical content: vocabulary definitions, drug information (names, dosages, uses), cause-effect relationships, and key clinical facts. Ignore presentation metadata like author names and dates. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 3000
    });

    const content = response.choices[0].message.content.trim();

    // Remove markdown code blocks if present
    let jsonContent = content;
    if (content.startsWith('```')) {
      jsonContent = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '');
    }

    const flashcards = JSON.parse(jsonContent);

    // Map sourceIndex to actual slide IDs
    return flashcards.map(fc => ({
      ...fc,
      slide_id: slides[fc.sourceIndex]?.id || null
    }));

  } catch (error) {
    console.error('Error generating flashcards with OpenAI:', error);
    throw new Error(`Failed to generate flashcards: ${error.message}`);
  }
};

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
