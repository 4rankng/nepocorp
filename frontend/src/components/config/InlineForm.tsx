export function InlineForm({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ background: 'var(--brand-soft)', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {children}
        </div>
      </td>
    </tr>
  );
}
