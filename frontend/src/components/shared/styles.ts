export const flexCenter = { display: 'flex', alignItems: 'center', justifyContent: 'center' } as const;
export const flexBetween = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as const;
export const flexCol = { display: 'flex', flexDirection: 'column' as const } as const;
export const errorBar = {
  padding: '12px 16px',
  background: 'var(--danger-soft)',
  color: 'var(--danger-text)',
  borderRadius: 'var(--radius-md)',
  fontSize: 13,
  marginBottom: 20,
  border: '1px solid rgba(220,38,38,0.12)',
} as const;
export const modalOverlay = {
  position: 'fixed' as const,
  inset: 0,
  background: 'rgba(9,9,11,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 'var(--z-modal)' as any,
  padding: 24,
} as const;
