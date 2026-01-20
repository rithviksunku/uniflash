import * as pdfjsLib from 'pdfjs-dist';
import OpenAI from 'openai';

// Set up PDF.js worker with HTTPS
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Parse a PDF file and extract text content
 * @param {File} file - The PDF file to parse
 * @returns {Promise<Array>} Array of page objects with text content
 */
export const parsePDF = async (file) => {
  try {
    // Validate file
    if (!file || !file.arrayBuffer) {
      throw new Error('Invalid PDF file provided');
    }

    const arrayBuffer = await file.arrayBuffer();

    // Check if arrayBuffer has data
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('PDF file appears to be empty');
    }

    console.log('Loading PDF with', arrayBuffer.byteLength, 'bytes');

    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      verbosity: 0
    });

    const pdf = await loadingTask.promise;
    console.log('PDF loaded successfully, pages:', pdf.numPages);

    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Extract text items and join them
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ')
        .trim();

      pages.push({
        pageNumber: i,
        content: pageText,
        title: extractTitle(pageText, i)
      });
    }

    console.log('Extracted', pages.length, 'pages from PDF');
    return pages;
  } catch (error) {
    console.error('Error parsing PDF:', error);

    // Provide more specific error messages
    if (error.message && error.message.includes('Invalid PDF')) {
      throw new Error('This file does not appear to be a valid PDF. Please try another file.');
    } else if (error.message && error.message.includes('password')) {
      throw new Error('This PDF is password-protected. Please use an unprotected PDF file.');
    } else if (error.message && error.message.includes('worker')) {
      throw new Error('PDF processing failed. Please try refreshing the page and uploading again.');
    } else {
      throw new Error(`Failed to parse PDF: ${error.message || 'Unknown error'}`);
    }
  }
};

/**
 * Extract a title from page content
 * @param {string} text - Page text content
 * @param {number} pageNumber - Page number
 * @returns {string} Extracted title
 */
const extractTitle = (text, pageNumber) => {
  // Try to extract first meaningful line as title
  const lines = text.split(/[.\n]/).filter(line => line.trim().length > 0);

  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    // If first line is short (likely a title), use it
    if (firstLine.length < 100) {
      return firstLine;
    }
  }

  return `Page ${pageNumber}`;
};

/**
 * Use OpenAI to extract structured content from PDF pages
 * @param {Array} pages - Array of page objects
 * @returns {Promise<Array>} Structured content with topics and key points
 */
export const extractStructuredContentWithAI = async (pages) => {
  try {
    const client = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });

    // Process pages in batches to avoid token limits
    const batchSize = 5;
    const structuredPages = [];

    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      const batchContent = batch.map((page, idx) =>
        `Page ${page.pageNumber}:\n${page.content.substring(0, 3000)}`
      ).join('\n\n---\n\n');

      const prompt = `You are an expert at analyzing medical and healthcare educational content. Analyze the following PDF pages and extract:
1. Main topic/title for each page
2. Key concepts and definitions
3. Important facts and information

PDF Content:
${batchContent}

Return ONLY a JSON array with this structure (no markdown, no code blocks):
[
  {
    "pageNumber": 1,
    "title": "main topic",
    "keyPoints": ["point 1", "point 2", "point 3"],
    "summary": "brief summary of the page"
  }
]`;

      const response = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content analyzer specializing in healthcare and medical topics. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 2000
      });

      let content = response.choices[0].message.content.trim();

      // Remove markdown code blocks if present
      if (content.startsWith('```')) {
        content = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '');
      }

      const batchResults = JSON.parse(content);
      structuredPages.push(...batchResults);
    }

    return structuredPages;
  } catch (error) {
    console.error('Error extracting structured content:', error);
    throw new Error(`Failed to analyze PDF content: ${error.message}`);
  }
};

/**
 * Validate that a file is a valid PDF file
 * @param {File} file - File to validate
 * @returns {boolean} Whether the file is valid
 */
export const validatePDFFile = (file) => {
  if (!file) return false;

  const validTypes = ['application/pdf'];
  const validExtension = file.name.toLowerCase().endsWith('.pdf');
  const validType = validTypes.includes(file.type);

  // Also check file size (must be > 0 and < 50MB)
  const validSize = file.size > 0 && file.size < 50 * 1024 * 1024;

  return (validExtension || validType) && validSize;
};
