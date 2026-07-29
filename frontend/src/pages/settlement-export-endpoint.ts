export function settlementExportEndpoint(
  isPortal: boolean,
  settlementId: number | string,
  format: 'html' | 'xlsx',
): string {
  const base = isPortal
    ? `/forwarder/me/advance-settlements/${settlementId}/export`
    : `/finance/advance-settlements/${settlementId}/export`;
  return format === 'html' ? `${base}?format=html` : base;
}
