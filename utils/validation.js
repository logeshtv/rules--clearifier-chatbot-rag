/**
 * Validate required fields in request body
 */
function validateRequired(data, fields) {
  const missing = [];
  
  for (const field of fields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  
  return true;
}

/**
 * Validate pagination parameters
 */
function validatePagination(page, pageSize, maxPageSize = 100) {
  const validatedPage = Math.max(1, parseInt(page) || 1);
  const validatedPageSize = Math.min(maxPageSize, Math.max(1, parseInt(pageSize) || 20));
  
  return {
    page: validatedPage,
    pageSize: validatedPageSize
  };
}

/**
 * Validate password
 */
function validatePassword(password, expectedPassword) {
  if (password !== expectedPassword) {
    throw new Error('Invalid password');
  }
  return true;
}

/**
 * Sanitize user input
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    .trim()
    .replace(/[<>]/g, ''); // Basic XSS prevention
}

module.exports = {
  validateRequired,
  validatePagination,
  validatePassword,
  sanitizeInput
};
