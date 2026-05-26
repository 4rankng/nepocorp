import { useNavigate } from 'react-router-dom';
import {
  Users, Truck, Container, MapPin, Package, DollarSign, Route,
  AlertTriangle, UserCheck, Fuel, Building,
} from 'lucide-react';
import { PageHeader } from '../components/UI';

const CHEVRON = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;

export default function ConfigPage() {
  const navigate = useNavigate();

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
            <span className="setting-card__status"><span className="dot"></span>Cơ bản + Phụ trội</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/road-allowances')}>
          <div className="setting-card__icon"><Route size={20} /></div>
          <h3 className="setting-card__title">Tiền đi đường</h3>
          <p className="setting-card__desc">Tiền chuẩn theo tuyến × loại rơ-mooc. Quy tắc: − vé QL5, + chuyến về có hàng (300K), − 55K/trạm.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>Tự động theo rơ-moóc</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/penalty-reasons')}>
          <div className="setting-card__icon"><AlertTriangle size={20} /></div>
          <h3 className="setting-card__title">Quy tắc kỷ luật &amp; phạt</h3>
          <p className="setting-card__desc">Thiếu hoá đơn dầu (100K), vi phạm ATGT (500K / sa thải).</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>4 quy tắc hoạt động</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/drivers')}>
          <div className="setting-card__icon"><UserCheck size={20} /></div>
          <h3 className="setting-card__title">Người dùng &amp; tài xế</h3>
          <p className="setting-card__desc">Quản lý tài khoản lái xe, lương cơ bản, xe phụ trách và thông tin hồ sơ liên hệ.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>Thông tin nhân sự</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/cap-table')}>
          <div className="setting-card__icon"><Building size={20} /></div>
          <h3 className="setting-card__title">Thông tin công ty &amp; Cổ phần</h3>
          <p className="setting-card__desc">Mã số thuế, địa chỉ, người đại diện, tỷ lệ vốn góp giữa các đối tác cổ đông (Phụng 70.45% · Thương 29.55%).</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>Cty TNHH NEPO</span>
            <span className="setting-card__action">Xem {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/customers')}>
          <div className="setting-card__icon"><Users size={20} /></div>
          <h3 className="setting-card__title">Khách hàng &amp; Đối tác</h3>
          <p className="setting-card__desc">Danh mục đối tác vận chuyển hàng hóa, thông tin liên hệ và mã số thuế phục vụ công nợ.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>Khách hàng FCL</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/routes')}>
          <div className="setting-card__icon"><MapPin size={20} /></div>
          <h3 className="setting-card__title">Tuyến đường &amp; Cự ly</h3>
          <p className="setting-card__desc">Danh sách các tuyến chặng, số trạm thu phí BOT, quãng đường di chuyển chuẩn.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>Danh mục tuyến chặng</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/trucks')}>
          <div className="setting-card__icon"><Truck size={20} /></div>
          <h3 className="setting-card__title">Xe đầu kéo</h3>
          <p className="setting-card__desc">Biển số các đầu kéo kéo container đang vận hành, định mức mặc định và lịch bảo dưỡng đầu xe.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>Phương tiện</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/trailers')}>
          <div className="setting-card__icon"><Container size={20} /></div>
          <h3 className="setting-card__title">Danh mục Rơ-moóc</h3>
          <p className="setting-card__desc">Thiết lập các loại sơ mi rơ-moóc (20FT, 40FT) phục vụ tính tiền đi đường theo loại vỏ rơ-moóc.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>Thiết bị kéo</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/cargo-types')}>
          <div className="setting-card__icon"><Package size={20} /></div>
          <h3 className="setting-card__title">Loại hàng hóa</h3>
          <p className="setting-card__desc">Bảng quy chuẩn loại hàng hóa vận chuyển ảnh hưởng đến việc phân xe chặng.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>Hàng hóa</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/pricing-tables')}>
          <div className="setting-card__icon"><DollarSign size={20} /></div>
          <h3 className="setting-card__title">Bảng giá cước</h3>
          <p className="setting-card__desc">Bảng giá cước chi tiết thỏa thuận với từng đối tác khách hàng trên mỗi tuyến.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>Đơn giá chặng</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>

        <button className="setting-card" onClick={() => navigate('/config/management-fees')}>
          <div className="setting-card__icon"><Building size={20} /></div>
          <h3 className="setting-card__title">Phí quản lý</h3>
          <p className="setting-card__desc">Cấu hình phí quản lý vận hành theo tháng/năm dùng cho báo cáo lãi lỗ.</p>
          <div className="setting-card__foot">
            <span className="setting-card__status"><span className="dot"></span>Chi phí cố định</span>
            <span className="setting-card__action">Sửa {CHEVRON}</span>
          </div>
        </button>
      </div>
    </div>
  );
}
