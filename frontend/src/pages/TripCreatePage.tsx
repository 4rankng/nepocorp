import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTripOptions } from '../hooks/useTripOptions';
import { useTripForm } from '../hooks/useTripForm';
import { TripFormProvider } from '../hooks/useTripFormContext';
import { ProgressPills } from '../components/trip/ProgressPills';
import { TripInfoCard } from '../components/trip/TripInfoCard';
import { JourneyLegsCard } from '../components/trip/JourneyLegsCard';
import { FuelTollsRevenueCard } from '../components/trip/FuelTollsRevenueCard';
import { ImagesNotesCard } from '../components/trip/ImagesNotesCard';
import { TripSummaryCard } from '../components/trip/TripSummaryCard';
import { TripChecklistPanel } from '../components/trip/TripChecklistPanel';
import { ActionBar } from '../components/trip/ActionBar';
import { Money } from '../components/shared/Money';
import { usePageAnimations } from '../hooks/animations';
import './TripForm.css';

export default function TripCreatePage() {
  const navigate = useNavigate();
  const options = useTripOptions();
  const form = useTripForm(options);
  const { rootRef } = usePageAnimations({
    ready: !options.loading,
    selectors: ['.tc-create-hero', '.tc-create-bento'],
  });

  // Same figures TripSummaryCard shows — surfaced as a live KPI strip in the hero.
  const revenue = Number(form.revenue) || 0;
  const estimatedCost =
    (form.estimatedFuelCost || 0) + (form.estimatedTollCost || 0) + (Number(form.driverSalary) || 0);
  const profit = form.estimatedProfit || 0;

  const handleSubmit = async () => {
    const tripId = await form.handleSubmit();
    if (tripId) {
      navigate(`/trips/${tripId}`);
    }
  };

  return (
    <TripFormProvider form={form}>
      <div ref={rootRef} className="tc-create-wrap">
        <section className="tc-create-hero">
          <div className="tc-hero-top">
            <button className="tc-back-btn" onClick={() => navigate('/trips')} aria-label="Quay lại">
              <ArrowLeft size={18} />
            </button>
            <div className="tc-hero-title-block">
              <div className="tc-hero-eyebrow">Tạo lệnh mới</div>
              <h1 className="tc-hero-h1">Tạo lệnh vận chuyển mới</h1>
              <p className="tc-hero-sub">
                Điền các trường bắt buộc để tạo lệnh. Chọn tuyến đường để tự động điền trạm thu phí, định mức dầu và lương sản lượng.
              </p>
            </div>
          </div>

          <div className="tc-hero-widgets">
            <TripSummaryCard />
            <TripChecklistPanel />
          </div>
        </section>

        <div className="tc-create-bento">
          <div className="tc-bento-main">
            <TripInfoCard
              customers={options.customers}
              carrierCustomers={options.carrierCustomers}
              routes={options.routes}
              trucks={options.trucks}
              trailerTypes={options.trailerTypes}
              drivers={options.drivers}
              cargoTypes={options.cargoTypes}
              loading={options.loading}
            />
          </div>

          <div className="tc-bento-legs">
            <JourneyLegsCard collapsible defaultCollapsed />
          </div>

          <div className="tc-bento-finance">
            <FuelTollsRevenueCard collapsible defaultCollapsed />
          </div>

          <div className="tc-bento-media">
            <ImagesNotesCard collapsible defaultCollapsed />
          </div>
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
