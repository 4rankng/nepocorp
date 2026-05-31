import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTripOptions } from '../hooks/useTripOptions';
import { useTripForm } from '../hooks/useTripForm';
import { TripFormProvider } from '../hooks/useTripFormContext';
import {
  ProgressPills,
  TripInfoCard,
  JourneyLegsCard,
  FuelTollsRevenueCard,
  ImagesNotesCard,
  TripSummaryCard,
  TripChecklistPanel,
  TipCard,
  ActionBar,
  SectionDivider,
} from '../components/trip';

export default function TripCreatePage() {
  const navigate = useNavigate();
  const options = useTripOptions();
  const form = useTripForm(options);

  const handleSubmit = async () => {
    const tripId = await form.handleSubmit();
    if (tripId) {
      navigate(`/trips/${tripId}`);
    }
  };

  return (
    <TripFormProvider form={form}>
      <div className="fade-up">
        <header className="tc-page-head">
          <button className="tc-back-btn" onClick={() => navigate('/trips')} aria-label="Quay lại">
            <ArrowLeft size={18} />
          </button>
          <div className="tc-title-wrap">
            <h1 className="tc-page-title">Tạo lệnh vận chuyển mới</h1>
            <p className="tc-page-sub">
              Điền các trường bắt buộc để tạo lệnh. Thông tin nhiên liệu, vé đường và ảnh có thể bổ sung sau.
            </p>
          </div>
          <ProgressPills current={form.completedSections} total={4} />
        </header>

        <div className="tc-content">
          <div className="tc-form-col">
            <TripInfoCard
              customers={options.customers}
              routes={options.routes}
              trucks={options.trucks}
              trailerTypes={options.trailerTypes}
              drivers={options.drivers}
              cargoTypes={options.cargoTypes}
              loading={options.loading}
            />

            <SectionDivider label="Các mục dưới đây là tùy chọn — có thể bổ sung sau khi tạo lệnh" />

            <JourneyLegsCard collapsible defaultCollapsed />

            <FuelTollsRevenueCard collapsible defaultCollapsed />

            <ImagesNotesCard collapsible defaultCollapsed />
          </div>

          <aside className="tc-rail">
            <TripSummaryCard />
            <TripChecklistPanel />
            <TipCard />
          </aside>
        </div>

        <ActionBar
          loading={options.loading}
          onCancel={() => navigate('/trips')}
          onSubmit={handleSubmit}
        />
      </div>
    </TripFormProvider>
  );
}
