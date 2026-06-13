/**
 * Helper to combine class names in components.
 */
export function cn(...inputs: any[]) {
  return inputs.flat(Infinity).filter(Boolean).join(' ');
}
