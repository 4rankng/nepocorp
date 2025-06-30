/**
 * String utilities for handling UTF-8 encoding issues, particularly for Vietnamese text
 */

/**
 * Fix double-encoded UTF-8 strings (e.g., "Xe Ä'áº§u kÃ©o" -> "Xe đầu kéo")
 * @param {string} str - The potentially double-encoded string
 * @returns {string} - The corrected string
 */
export const fixDoubleEncodedUTF8 = str => {
  if (!str || typeof str !== 'string') return str;

  try {
    // Check if string contains common double-encoded UTF-8 patterns
    const doubleEncodedPatterns = [
      'Ã',
      'â',
      'Ä',
      'Ã©',
      'Ã¡',
      'Ã',
      'Ã³',
      'Ã­',
      'Ãº',
      'Ã½',
      'áº',
      'áº£',
      'áº¥',
      'áº§',
      'áº©',
      'áº«',
      'áº­',
      'áº¯',
      'áº±',
      'áº³',
      'áº·',
      'áº¹',
      'áº»',
      'áº½',
      'áº¿',
      'á»',
      'á»',
      'á»',
      'á»',
      'á»',
      'á»',
    ];

    const hasDoubleEncoding = doubleEncodedPatterns.some(pattern => str.includes(pattern));

    if (hasDoubleEncoding) {
      // Try to decode the double-encoded string
      const bytes = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        bytes[i] = str.charCodeAt(i) & 0xff;
      }
      return new window.TextDecoder('utf-8').decode(bytes);
    }

    return str;
  } catch (error) {
    console.warn('Failed to fix UTF-8 encoding for string:', str, error);
    return str;
  }
};

/**
 * Normalize Vietnamese text by removing diacritics for search purposes
 * @param {string} str - Vietnamese text with diacritics
 * @returns {string} - Text without diacritics
 */
export const removeVietnameseDiacritics = str => {
  if (!str || typeof str !== 'string') return str;

  const diacriticsMap = {
    á: 'a',
    à: 'a',
    ả: 'a',
    ã: 'a',
    ạ: 'a',
    ă: 'a',
    ắ: 'a',
    ằ: 'a',
    ẳ: 'a',
    ẵ: 'a',
    ặ: 'a',
    â: 'a',
    ấ: 'a',
    ầ: 'a',
    ẩ: 'a',
    ẫ: 'a',
    ậ: 'a',
    é: 'e',
    è: 'e',
    ẻ: 'e',
    ẽ: 'e',
    ẹ: 'e',
    ê: 'e',
    ế: 'e',
    ề: 'e',
    ể: 'e',
    ễ: 'e',
    ệ: 'e',
    í: 'i',
    ì: 'i',
    ỉ: 'i',
    ĩ: 'i',
    ị: 'i',
    ó: 'o',
    ò: 'o',
    ỏ: 'o',
    õ: 'o',
    ọ: 'o',
    ô: 'o',
    ố: 'o',
    ồ: 'o',
    ổ: 'o',
    ỗ: 'o',
    ộ: 'o',
    ơ: 'o',
    ớ: 'o',
    ờ: 'o',
    ở: 'o',
    ỡ: 'o',
    ợ: 'o',
    ú: 'u',
    ù: 'u',
    ủ: 'u',
    ũ: 'u',
    ụ: 'u',
    ư: 'u',
    ứ: 'u',
    ừ: 'u',
    ử: 'u',
    ữ: 'u',
    ự: 'u',
    ý: 'y',
    ỳ: 'y',
    ỷ: 'y',
    ỹ: 'y',
    ỵ: 'y',
    đ: 'd',
  };

  return str.replace(
    /[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/g,
    match => diacriticsMap[match] || match
  );
};

/**
 * Clean and sanitize text for display
 * @param {string} text - Raw text that might have encoding issues
 * @returns {string} - Cleaned text ready for display
 */
export const sanitizeDisplayText = text => {
  if (!text || typeof text !== 'string') return text || '';

  // First, try to fix double-encoded UTF-8
  let cleaned = fixDoubleEncodedUTF8(text);

  // Remove any null bytes or other control characters
  // Remove any null bytes or other control characters
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
};

/**
 * Check if a string contains Vietnamese characters
 * @param {string} str - String to check
 * @returns {boolean} - True if contains Vietnamese characters
 */
export const containsVietnamese = str => {
  if (!str || typeof str !== 'string') return false;

  const vietnamesePattern =
    /[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/i;
  return vietnamesePattern.test(str);
};

/**
 * Recursively fix UTF-8 encoding in objects
 * @param {any} obj - Object to process
 * @returns {any} - Object with fixed UTF-8 strings
 */
export const fixUTF8InObject = obj => {
  if (!obj) return obj;

  if (typeof obj === 'string') {
    return sanitizeDisplayText(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => fixUTF8InObject(item));
  }

  if (typeof obj === 'object') {
    const fixed = {};
    for (const [key, value] of Object.entries(obj)) {
      fixed[key] = fixUTF8InObject(value);
    }
    return fixed;
  }

  return obj;
};
