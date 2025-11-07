const pdfParse = require('pdf-parse');
const { cleanText } = require('./textProcessing');

/**
 * Extract text from PDF buffer
 */
async function extractTextFromPDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    const text = cleanText(data.text);
    
    return {
      text,
      pages: data.numpages,
      info: data.info,
      metadata: {
        title: data.info?.Title || 'Untitled',
        author: data.info?.Author || 'Unknown',
        creationDate: data.info?.CreationDate || null
      }
    };
  } catch (error) {
    console.error('PDF parsing error:', error.message);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Extract text from plain text file
 */
function extractTextFromTxt(buffer) {
  try {
    const text = buffer.toString('utf-8');
    return {
      text: cleanText(text),
      metadata: {
        encoding: 'utf-8'
      }
    };
  } catch (error) {
    console.error('Text file parsing error:', error.message);
    throw new Error(`Failed to read text file: ${error.message}`);
  }
}

/**
 * Process document based on file type
 */
async function processDocument(buffer, filename) {
  const extension = '.' + filename.split('.').pop().toLowerCase();
  
  let result;
  
  if (extension === '.pdf') {
    result = await extractTextFromPDF(buffer);
  } else if (extension === '.txt') {
    result = extractTextFromTxt(buffer);
  } else {
    throw new Error(`Unsupported file type: ${extension}`);
  }
  
  return {
    ...result,
    filename,
    size: buffer.length
  };
}

module.exports = {
  extractTextFromPDF,
  extractTextFromTxt,
  processDocument
};
