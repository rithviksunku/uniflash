import JSZip from 'jszip';

/**
 * Parse a PowerPoint (.pptx) file and extract slide content
 * @param {File} file - The PPTX file to parse
 * @returns {Promise<Array>} Array of slide objects with title and content
 */
export const parsePPTX = async (file) => {
  try {
    const zip = new JSZip();
    const content = await zip.loadAsync(file);

    // Get all slide files
    const slideFiles = Object.keys(content.files)
      .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)\.xml/)[1]);
        const numB = parseInt(b.match(/slide(\d+)\.xml/)[1]);
        return numA - numB;
      });

    const slides = [];

    for (let i = 0; i < slideFiles.length; i++) {
      const slideFile = slideFiles[i];
      const slideXml = await content.files[slideFile].async('text');

      // Extract text from slide
      const textContent = extractTextFromSlideXml(slideXml);

      slides.push({
        slideNumber: i + 1,
        title: textContent.title || `Slide ${i + 1}`,
        content: textContent.body,
        rawText: textContent.allText
      });
    }

    return slides;
  } catch (error) {
    console.error('Error parsing PPTX:', error);
    throw new Error('Failed to parse PowerPoint file. Please ensure it is a valid .pptx file.');
  }
};

/**
 * Extract text content from slide XML
 * @param {string} xml - The slide XML content
 * @returns {Object} Object containing title and body text
 */
const extractTextFromSlideXml = (xml) => {
  // Remove XML namespaces for easier parsing
  const cleanXml = xml.replace(/[a-z]+:/g, '');

  // Extract all text elements
  const textMatches = cleanXml.match(/<t[^>]*>([^<]+)<\/t>/g) || [];
  const allText = textMatches.map(match => {
    const text = match.replace(/<t[^>]*>/, '').replace(/<\/t>/, '');
    return decodeXMLEntities(text);
  });

  // First text element is usually the title
  const title = allText.length > 0 ? allText[0] : '';

  // Rest is body content
  const body = allText.slice(1).join('\n').trim();

  return {
    title,
    body,
    allText: allText.join('\n')
  };
};

/**
 * Decode XML entities
 * @param {string} text - Text with XML entities
 * @returns {string} Decoded text
 */
const decodeXMLEntities = (text) => {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
};

/**
 * Validate that a file is a valid PPTX file
 * @param {File} file - File to validate
 * @returns {boolean} Whether the file is valid
 */
export const validatePPTXFile = (file) => {
  if (!file) return false;

  const validTypes = [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint'
  ];

  const validExtension = file.name.toLowerCase().endsWith('.pptx');
  const validType = validTypes.includes(file.type);

  return validExtension || validType;
};