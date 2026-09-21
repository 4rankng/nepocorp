export function settlementExportEndpoint(
  isPortal: boolean,
  settlementId: number | string,
  format: 'html' | 'xlsx',
): string {
  // The office export route is mounted at the /api root
  // (backend/src/routes/financial/advances.routes.ts → /advance-settlements/:id/export,
  // mounted in index.ts at '/api'); a '/finance' prefix here 404s
  // (kanban 20260921_19).
  const base = isPortal
    ? `/forwarder/me/advance-settlements/${settlementId}/export`
    : `/advance-settlements/${settlementId}/export`;
  return format === 'html' ? `${base}?format=html` : base;
}
