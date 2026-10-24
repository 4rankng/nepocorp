import { LedgerGrid } from '../features/ledger/LedgerGrid';
import { Breadcrumbs } from '../components/shared';

/** Bảng số liệu — bảng thu chi hợp nhất một lệnh một dòng, sửa trực
 *  tiếp theo nhóm quyền (kế hoạch / thu chi), đối chiếu container ngay trong bảng. */
export default function BangKeHoachPage() {
  return (
    <div style={{ paddingBottom: 40 }}>
      <Breadcrumbs
        items={[
          { label: 'Tổng quan', to: '/dashboard' },
          { label: 'Bảng số liệu' },
        ]}
        renderLink={(to, children) => <a onClick={() => window.history.pushState({}, '', to)} style={{ cursor: 'pointer' }}>{children}</a>}
      />
      <LedgerGrid />
    </div>
  );
}
