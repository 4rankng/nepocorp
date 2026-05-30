/**
 * Shared avatar utilities.
 * getInitials uses Vietnamese-style ordering (last two words of name),
 * which picks the most distinctive syllables for Vietnamese names.
 */

const AVATAR_COLORS = [
  { bg: '#E6F7EE', fg: '#005A2D' },
  { bg: '#E0F2FE', fg: '#0369A1' },
  { bg: '#FCE7F3', fg: '#BE185D' },
  { bg: '#FEF3C7', fg: '#B45309' },
  { bg: '#EDE9FE', fg: '#6D28D9' },
  { bg: '#FEE2E2', fg: '#DC2626' },
  { bg: '#CCFBF1', fg: '#0F766E' },
];

export { AVATAR_COLORS };

export function getInitials(name: string): string {
  if (!name || !name.trim()) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  // Vietnamese-style: last two words are most distinctive
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function avatarColorByName(name: string) {
  const idx = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export function avatarColorById(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}
