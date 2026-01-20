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

    const prompt = `You are an expert at creating educational flashcards. Based on the following presentation slides, generate flashcards that help students learn the key concepts.

Slides:
${slideContent}

Create 2-3 flashcards per slide. Each flashcard should:
1. Have a clear question on the front
2. Have a concise, informative answer on the back
3. Focus on key concepts, definitions, or important facts

Return ONLY a JSON array with this exact structure (no markdown, no code blocks):
[
  {
    "front": "question or prompt",
    "back": "answer or explanation",
    "sourceIndex": 0
  }
]`;

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational content creator specializing in creating effective flashcards. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
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
