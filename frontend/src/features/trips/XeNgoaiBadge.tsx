import { Truck } from 'lucide-react';

/**
 * "Xe ngoài" badge — marks a trip subcontracted to an external carrier
 * (carrierType === 'EXTERNAL'). Visually identical to the customer-page
 * "Xe ngoài" badge (CustomersPage.tsx, commit 5df8ec46): info-blue tone,
 * distinct from the green "2 chiều" badge.
 *
 * NOTE: the colour triplet is hard-coded here to match the established
 * customer-page badge. TODO: extract a shared <Badge> component across
 * "2 chiều" / "Xe ngoài" once a third consumer appears.
 */
export function XeNgoaiBadge() {
  return (
    <span
      aria-label="Xe ngoài (đối tác vận tải)"
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: '#1d4ed8',
        background: '#dbeafe',
        border: '1px solid #bfdbfe',
        borderRadius: 4,
        padding: '1px 5px',
        letterSpacing: '0.02em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <Truck size={11} aria-hidden="true" />
      Xe ngoài
    </span>
  );
}
