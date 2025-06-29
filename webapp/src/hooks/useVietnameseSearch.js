import { useMemo } from 'react';
import { vietnameseSearch, filterOptionsVietnamese } from '@utils/vietnameseSearch';

/**
 * Hook for Vietnamese search functionality
 * @param {Array} items - Array of items to search through
 * @param {string} searchTerm - Current search term
 * @param {string|Function} labelKey - Key to get searchable text from item, or function to extract text
 * @returns {Array} - Filtered items based on Vietnamese search
 */
export const useVietnameseSearch = (items = [], searchTerm = '', labelKey = 'label') => {
  return useMemo(() => {
    return filterOptionsVietnamese(items, searchTerm, labelKey);
  }, [items, searchTerm, labelKey]);
};

/**
 * Hook for simple Vietnamese text matching
 * @param {string} text - Text to search in
 * @param {string} searchTerm - Search term
 * @returns {boolean} - Whether the search term matches
 */
export const useVietnameseMatch = (text, searchTerm) => {
  return useMemo(() => {
    return vietnameseSearch(text, searchTerm);
  }, [text, searchTerm]);
};