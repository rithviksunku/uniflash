import * as pdfjsLib from 'pdfjs-dist';
import OpenAI from 'openai';

// Set up PDF.js worker using a synchronous approach
// Using the jsdelivr CDN which is more reliable than unpkg
// Matching exact version to prevent compatibility issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

console.log('PDF.js version:', pdfjsLib.version);
console.log('Worker source set to:', pdfjsLib.GlobalWorkerOptions.workerSrc);

/**
 * Parse a PDF file and extract text content
 * @param {File} file - The PDF file to parse
 * @returns {Promise<Array>} Array of page objects with text content
 */
export const parsePDF = async (file) => {
  try {
    console.log('Starting PDF parse for file:', file.name, 'Size:', file.size, 'Type:', file.type);

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
    console.log('Worker configured at:', pdfjsLib.GlobalWorkerOptions.workerSrc);

    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      verbosity: 1 // Increase verbosity to see more details
    });

    console.log('PDF loading task created, waiting for promise...');
    const pdf = await loadingTask.promise;
    console.log('PDF loaded successfully, pages:', pdf.numPages);

    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Extract text items and join them
      const rawPageText = textContent.items
        .map(item => item.str)
        .join(' ')
        .trim();

      // Extract meaningful content, filtering out metadata
      const cleanedContent = extractMeaningfulContent(rawPageText);

      pages.push({
        pageNumber: i,
        content: cleanedContent,
        rawContent: rawPageText, // Keep raw content for reference if needed
        title: extractTitle(rawPageText, i)
      });
    }

    console.log('Extracted', pages.length, 'pages from PDF');
    return pages;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    // Provide more specific error messages
    if (error.message && error.message.includes('Invalid PDF')) {
      throw new Error('This file does not appear to be a valid PDF. Please try another file.');
    } else if (error.message && error.message.includes('password')) {
      throw new Error('This PDF is password-protected. Please use an unprotected PDF file.');
    } else if (error.message && (error.message.includes('worker') || error.message.includes('Worker'))) {
      throw new Error('PDF worker failed to load. Please refresh the page and try again. If the problem persists, check your internet connection.');
    } else if (error.name === 'InvalidPDFException') {
      throw new Error('Invalid or corrupted PDF file. Please try a different file.');
    } else {
      throw new Error(`Failed to parse PDF: ${error.message || 'Unknown error'}. Please try refreshing the page.`);
    }
  }
};

/**
 * Filter out metadata patterns from text
 * @param {string} text - Raw text content
 * @returns {string} Cleaned text without metadata
 */
const filterMetadata = (text) => {
  // Patterns to filter out
  const metadataPatterns = [
    // Date patterns
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}\b/gi,
    /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g,
    // Page number patterns
    /\bPage\s*\d+\s*(?:of\s*\d+)?\b/gi,
    /^\s*\d+\s*$/gm,
    // Common presentation metadata
    /\bCopyright\s*©?\s*\d{4}.*$/gim,
    /\bAll\s+rights\s+reserved\b/gi,
    /\bConfidential\b/gi,
    /\bDraft\b/gi,
    // Author/presenter patterns at start of slides
    /^(?:By|Author|Presented\s+by|Presenter|Created\s+by)[:\s]+[\w\s,\.]+$/gim,
    // File paths and URLs that aren't content
    /[A-Z]:\\[\w\\\/\-\.]+/g,
    /^https?:\/\/[^\s]+$/gm,
    // Version numbers
    /\bv(?:ersion)?\s*\d+(?:\.\d+)*\b/gi,
    // Slide numbers like "Slide 1" at beginning
    /^Slide\s+\d+\s*$/gim,
  ];

  let cleaned = text;
  for (const pattern of metadataPatterns) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  // Remove multiple spaces and clean up
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  return cleaned;
};

/**
 * Extract meaningful content from text, filtering noise
 * @param {string} text - Raw page text
 * @returns {string} Cleaned content
 */
const extractMeaningfulContent = (text) => {
  // First filter metadata
  let content = filterMetadata(text);

  // Split into sentences/chunks
  const chunks = content.split(/(?<=[.!?])\s+|(?<=:)\s+/).filter(chunk => {
    const trimmed = chunk.trim();
    // Filter out very short chunks that are likely noise
    if (trimmed.length < 5) return false;
    // Filter out chunks that are just numbers
    if (/^\d+$/.test(trimmed)) return false;
    // Filter out common filler words alone
    if (/^(?:and|or|the|a|an|is|are|was|were)$/i.test(trimmed)) return false;
    return true;
  });

  return chunks.join(' ').trim();
};

/**
 * Extract a title from page content
 * @param {string} text - Page text content
 * @param {number} pageNumber - Page number
 * @returns {string} Extracted title
 */
const extractTitle = (text, pageNumber) => {
  // First filter out metadata
  const cleanedText = filterMetadata(text);

  // Try to extract first meaningful line as title
  const lines = cleanedText.split(/[.\n]/).filter(line => {
    const trimmed = line.trim();
    // Filter out empty lines, numbers only, very short text
    return trimmed.length > 3 && !/^\d+$/.test(trimmed);
  });

  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    // If first line is reasonably short (likely a title), use it
    if (firstLine.length > 3 && firstLine.length < 100) {
      // Additional check: avoid common metadata words as titles
      const metadataWords = ['copyright', 'confidential', 'draft', 'version', 'page', 'slide'];
      if (!metadataWords.some(word => firstLine.toLowerCase().includes(word))) {
        return firstLine;
      }
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

      const prompt = `You are an expert at analyzing medical and healthcare educational content. Analyze the following PDF pages and extract ONLY the educational content.

IMPORTANT RULES:
- IGNORE metadata like author names, dates, page numbers, copyright notices, file paths
- FOCUS on extracting:
  1. Vocabulary terms and their definitions
  2. Drug names, dosages, and their uses
  3. Medical conditions and their symptoms/causes
  4. Cause-and-effect relationships
  5. Key facts, statistics, and clinical information
  6. Treatment protocols and procedures

PDF Content:
${batchContent}

Return ONLY a JSON array with this structure (no markdown, no code blocks):
[
  {
    "pageNumber": 1,
    "title": "main topic (NOT author/date)",
    "keyPoints": ["educational point 1", "definition or fact 2", "drug/dosage info 3"],
    "vocabulary": [{"term": "medical term", "definition": "meaning"}],
    "drugs": [{"name": "drug name", "dosage": "if mentioned", "use": "what it treats"}],
    "causeEffect": [{"cause": "condition/action", "effect": "result/outcome"}],
    "summary": "brief educational summary"
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
      // Ensure batchResults is an array before spreading
      if (Array.isArray(batchResults)) {
        structuredPages.push(...batchResults);
      } else if (batchResults && typeof batchResults === 'object') {
        // If it's a single object, wrap it in an array
        structuredPages.push(batchResults);
      }
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

/**
 * Render a PDF page to a data URL image
 * @param {ArrayBuffer|Uint8Array|string} pdfData - PDF data (ArrayBuffer, typed array, or URL)
 * @param {number} pageNumber - Page number to render (1-indexed)
 * @param {number} scale - Scale factor for rendering (default 1.5)
 * @returns {Promise<string>} Data URL of the rendered page
 */
export const renderPDFPageToImage = async (pdfData, pageNumber, scale = 1.5) => {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });

    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNumber);

    const viewport = page.getViewport({ scale });

    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render page
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    // Convert to data URL
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error rendering PDF page:', error);
    throw error;
  }
};

/**
 * Load PDF from URL and return the document
 * @param {string} url - URL to the PDF file
 * @returns {Promise<PDFDocumentProxy>} PDF document
 */
export const loadPDFFromURL = async (url) => {
  try {
    const loadingTask = pdfjsLib.getDocument({
      url: url,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });

    return await loadingTask.promise;
  } catch (error) {
    console.error('Error loading PDF from URL:', error);
    throw error;
  }
};

/**
 * Get all page images from a PDF
 * @param {ArrayBuffer|string} pdfData - PDF data or URL
 * @param {number} scale - Scale factor for rendering
 * @returns {Promise<Array<string>>} Array of data URLs for each page
 */
export const getAllPDFPageImages = async (pdfData, scale = 1.0) => {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });

    const pdf = await loadingTask.promise;
    const pageImages = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      pageImages.push(canvas.toDataURL('image/jpeg', 0.8));
    }

    return pageImages;
  } catch (error) {
    console.error('Error getting PDF page images:', error);
    throw error;
  }
};
