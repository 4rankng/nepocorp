import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import {
  Users, Truck, MapPin, Package, DollarSign, Route,
  AlertTriangle, UserCheck, Fuel, Building, Calendar, Tags,
} from 'lucide-react';
import { PageHeader } from '../components/UI';
import { api } from '../lib/api';

const CHEVRON = <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;

type ListResponse = { total: number };

function countLabel(n: number | undefined, unit: string): string {
  if (n === undefined) return '—';
  return `${n} ${unit}`;
}

export default function ConfigPage() {
  const navigate = useNavigate();

  const [
    penaltyReasons,
    roadAllowances,
    drivers,
    capTable,
    customers,
    routes,
    trucks,
    trailers,
    cargoTypes,
    pricingTables,
    managementFees,
    salaryDefault,
    expenseCategories,
    fuelConfig,
  ] = useQueries({
    queries: [
      { queryKey: ['cfg-count', 'penalty-reasons'],    queryFn: () => api.get<ListResponse>('/penalty-reasons?limit=1'),    staleTime: 60_000 },
      { queryKey: ['cfg-count', 'road-allowances'],    queryFn: () => api.get<ListResponse>('/road-allowances?limit=1'),    staleTime: 60_000 },
      { queryKey: ['cfg-count', 'drivers'],            queryFn: () => api.get<ListResponse>('/drivers?limit=1'),            staleTime: 60_000 },
      { queryKey: ['cfg-count', 'cap-table'],          queryFn: () => api.get<ListResponse>('/cap-table?limit=1'),          staleTime: 60_000 },
      { queryKey: ['cfg-count', 'customers'],          queryFn: () => api.get<ListResponse>('/customers?limit=1'),          staleTime: 60_000 },
      { queryKey: ['cfg-count', 'routes'],             queryFn: () => api.get<ListResponse>('/routes?limit=1'),             staleTime: 60_000 },
      { queryKey: ['cfg-count', 'trucks'],             queryFn: () => api.get<ListResponse>('/trucks?limit=1'),             staleTime: 60_000 },
      { queryKey: ['cfg-count', 'trailers'],            queryFn: () => api.get<ListResponse>('/trailers?limit=1'),            staleTime: 60_000 },
      { queryKey: ['cfg-count', 'cargo-types'],        queryFn: () => api.get<ListResponse>('/cargo-types?limit=1'),        staleTime: 60_000 },
      { queryKey: ['cfg-count', 'pricing-tables'],     queryFn: () => api.get<ListResponse>('/pricing-tables?limit=1'),     staleTime: 60_000 },
      { queryKey: ['cfg-count', 'management-fees'],    queryFn: () => api.get<ListResponse>('/management-fees?limit=1'),    staleTime: 60_000 },
      { queryKey: ['cfg-count', 'salary-default'],     queryFn: () => api.get<{ defaultStartDay?: number; defaultEndDay?: number } | null>('/salary-periods/default'), staleTime: 60_000 },
      { queryKey: ['cfg-count', 'expense-categories'], queryFn: () => api.get<ListResponse>('/expense-categories?limit=1'), staleTime: 60_000 },
      { queryKey: ['cfg-count', 'fuel-config'],        queryFn: () => api.get<{ id: number } | null>('/fuel-config'),       staleTime: 60_000 },
    ],
  });

  function salaryStatus(): string {
    if (salaryDefault.isLoading) return '—';
    const d = salaryDefault.data;
    if (!d || d.defaultStartDay == null) return 'Chưa cấu hình';
    return `Ngày ${d.defaultStartDay}–${d.defaultEndDay} hàng tháng`;
  }

  function fuelStatus(): string {
    if (fuelConfig.isLoading) return '—';
    return fuelConfig.data ? 'Đã cấu hình' : 'Chưa cấu hình';
  }

  return (
    <div className="fade-up">
      <PageHeader
        title="Cấu hình hệ thống"
        description="Quản lý định mức, quy tắc tính toán, người dùng & tích hợp hệ thống"
      />

      <div className="settings-grid">
        <button className="setting-card" onClick={() => navigate('/config/fuel')}>
          <div className="setting-card__icon"><Fuel size={20} /></div>
          <h3 className="setting-card__title">Định mức nhiên liệu</h3>
          <p className="setting-card__desc">Định mức tiêu hao theo xe, loại tải (vỏ rỗng, &lt;20t, &gt;20t) và loại tuyến (đồng bằng / núi).</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>{fuelStatus()}</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/road-allowances')}>
          <div className="setting-card__icon"><Route size={20} /></div>
          <h3 className="setting-card__title">Tiền đi đường</h3>
          <p className="setting-card__desc">Tiền chuẩn theo tuyến × loại rơ-mooc. Quy tắc: − vé QL5, + chuyến về có hàng (300K), − 55K/trạm.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>{countLabel(roadAllowances.data?.total, 'tuyến')}</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/penalty-reasons')}>
          <div className="setting-card__icon"><AlertTriangle size={20} /></div>
          <h3 className="setting-card__title">Quy tắc kỷ luật &amp; phạt</h3>
          <p className="setting-card__desc">Thiếu hoá đơn dầu (100K), vi phạm ATGT (500K / sa thải).</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>{countLabel(penaltyReasons.data?.total, 'quy tắc')}</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/drivers')}>
          <div className="setting-card__icon"><UserCheck size={20} /></div>
          <h3 className="setting-card__title">Người dùng &amp; tài xế</h3>
          <p className="setting-card__desc">Quản lý tài khoản lái xe, lương cơ bản, xe phụ trách và thông tin hồ sơ liên hệ.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>{countLabel(drivers.data?.total, 'tài xế')}</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/cap-table')}>
          <div className="setting-card__icon"><Building size={20} /></div>
          <h3 className="setting-card__title">Thông tin công ty &amp; Cổ phần</h3>
          <p className="setting-card__desc">Mã số thuế, địa chỉ, người đại diện và tỷ lệ vốn góp giữa các đối tác cổ đông.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>{countLabel(capTable.data?.total, 'cổ đông')}</span>
            <span className="setting-card__action">Xem {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/customers')}>
          <div className="setting-card__icon"><Users size={20} /></div>
          <h3 className="setting-card__title">Khách hàng &amp; Đối tác</h3>
          <p className="setting-card__desc">Danh mục đối tác vận chuyển hàng hóa, thông tin liên hệ và mã số thuế phục vụ công nợ.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>{countLabel(customers.data?.total, 'khách hàng')}</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/routes')}>
          <div className="setting-card__icon"><MapPin size={20} /></div>
          <h3 className="setting-card__title">Tuyến đường &amp; Cự ly</h3>
          <p className="setting-card__desc">Danh sách các tuyến chặng, số trạm thu phí BOT, quãng đường di chuyển chuẩn.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>{countLabel(routes.data?.total, 'tuyến chặng')}</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/trucks')}>
          <div className="setting-card__icon"><Truck size={20} /></div>
          <h3 className="setting-card__title">Xe đầu kéo</h3>
          <p className="setting-card__desc">Biển số các đầu kéo kéo container đang vận hành, định mức mặc định và lịch bảo dưỡng đầu xe.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>{countLabel(trucks.data?.total, 'xe')}</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/trailers')}>
          <div className="setting-card__icon"><Truck size={20} /></div>
          <h3 className="setting-card__title">Rơ-moóc</h3>
          <p className="setting-card__desc">Danh sách rơ-moóc, loại rơ-moóc và thông tin đăng kiểm.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>{countLabel(trailers.data?.total, 'rơ-moóc')}</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/cargo-types')}>
          <div className="setting-card__icon"><Package size={20} /></div>
          <h3 className="setting-card__title">Loại hàng hóa</h3>
          <p className="setting-card__desc">Bảng quy chuẩn loại hàng hóa vận chuyển ảnh hưởng đến việc phân xe chặng.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>{countLabel(cargoTypes.data?.total, 'loại hàng')}</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/pricing-tables')}>
          <div className="setting-card__icon"><DollarSign size={20} /></div>
          <h3 className="setting-card__title">Bảng giá cước</h3>
          <p className="setting-card__desc">Bảng giá cước chi tiết thỏa thuận với từng đối tác khách hàng trên mỗi tuyến.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>{countLabel(pricingTables.data?.total, 'đơn giá')}</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/management-fees')}>
          <div className="setting-card__icon"><Building size={20} /></div>
          <h3 className="setting-card__title">Phí quản lý</h3>
          <p className="setting-card__desc">Cấu hình phí quản lý vận hành theo tháng/năm dùng cho báo cáo lãi lỗ.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>{countLabel(managementFees.data?.total, 'khoản phí')}</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/salary-periods')}>
          <div className="setting-card__icon"><Calendar size={20} /></div>
          <h3 className="setting-card__title">Kỳ lương</h3>
          <p className="setting-card__desc">Cấu hình kỳ lương hàng tháng. Mặc định: ngày 26 tháng trước đến ngày 25 tháng này. Có thể ghi đè từng tháng.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>{salaryStatus()}</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/expense-categories')}>
          <div className="setting-card__icon"><Tags size={20} /></div>
          <h3 className="setting-card__title">Hạng mục chi phí</h3>
          <p className="setting-card__desc">Phân loại chi phí vận hành. Bật định kỳ để theo dõi ngày gia hạn bảo hiểm, đăng kiểm, bảo dưỡng.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>{countLabel(expenseCategories.data?.total, 'hạng mục')}</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>
      </div>
    </div>
  );
}
