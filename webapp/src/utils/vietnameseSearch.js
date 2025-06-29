/**
 * Vietnamese text normalization utilities for search functionality
 */

// Map of Vietnamese characters to their base characters
const VIETNAMESE_MAP = {
  'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
  'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
  'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
  'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
  'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
  'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
  'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
  'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
  'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
  'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
  'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
  'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
  'đ': 'd'
};

/**
 * Normalize Vietnamese text by removing diacritics
 * @param {string} text - Text to normalize
 * @returns {string} - Normalized text
 */
export const normalizeVietnamese = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .split('')
    .map(char => VIETNAMESE_MAP[char] || char)
    .join('');
};

/**
 * Check if search term matches text with Vietnamese normalization
 * @param {string} text - Text to search in
 * @param {string} searchTerm - Search term
 * @returns {boolean} - Whether the search term matches
 */
export const vietnameseSearch = (text, searchTerm) => {
  if (!text || !searchTerm) return false;
  
  const normalizedText = normalizeVietnamese(text);
  const normalizedSearch = normalizeVietnamese(searchTerm);
  
  return normalizedText.includes(normalizedSearch);
};

/**
 * Filter array of options based on Vietnamese search
 * @param {Array} options - Array of options to filter
 * @param {string} searchTerm - Search term
 * @param {string|Function} labelKey - Key to get label from option, or function to extract label
 * @returns {Array} - Filtered options
 */
export const filterOptionsVietnamese = (options, searchTerm, labelKey = 'label') => {
  if (!searchTerm.trim()) return options;
  
  return options.filter(option => {
    const label = typeof labelKey === 'function' 
      ? labelKey(option)
      : option[labelKey] || option.displayText || option.text || option.name || '';
    
    return vietnameseSearch(label, searchTerm);
  });
};

// CommonJS exports for Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { normalizeVietnamese, vietnameseSearch, filterOptionsVietnamese };
}