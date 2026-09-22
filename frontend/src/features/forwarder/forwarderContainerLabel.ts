/** Minimal container shape needed to label a container; structurally identical to the page's ForwarderContainer. */
export interface ForwarderExpenseContainer {
  id: number;
  containerNumber?: string | null;
  containerTypeName?: string | null;
  sealNumber?: string | null;
  notes?: string | null;
}

export function containerDisplayName(container: ForwarderExpenseContainer): string {
  return container.containerNumber?.trim()
    || [container.containerTypeName, 'Chưa nhập số container'].filter(Boolean).join(' · ');
}
