import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTripOptions } from '../hooks/useTripOptions';
import { useTripForm } from '../hooks/useTripForm';
import { TripFormProvider } from '../hooks/useTripFormContext';
import { TripInfoCard } from '../components/trip/TripInfoCard';
import { JourneyLegsCard } from '../components/trip/JourneyLegsCard';
import { FuelTollsRevenueCard } from '../components/trip/FuelTollsRevenueCard';
import { ImagesNotesCard } from '../components/trip/ImagesNotesCard';
import { ContainerInstancesCard } from '../components/trip/ContainerInstancesCard';
import { CardSection } from '../components/trip/CardSection';
import { ActionBar } from '../components/trip/ActionBar';
import { usePageAnimations } from '../hooks/animations';
import { useBackShortcut } from '../hooks/useBackShortcut';
import { useDirtyGuard } from '../hooks/useDirtyGuard';
import { useConfirm } from '../components/useConfirm';
import './TripForm.css';
import './TripCreatePage.css';

export default function TripCreatePage() {
  const navigate = useNavigate();
  const options = useTripOptions();
  const form = useTripForm(options);
  const expectedContainerCount = Math.min(10, Math.max(1, Number(form.containerCount) || 1));
  const { rootRef } = usePageAnimations({
    ready: !options.loading,
    selectors: ['.tc-create-hero', '.tc-create-bento'],
  });

  const { confirm, dialog } = useConfirm();
  // Vòng 7: autofocus field đầu tiên + Enter submit (trừ select/search để
  // không phá dropdown). Điều phối nhập lệnh bằng bàn phím là chính.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!options.loading) {
      wrapRef.current?.querySelector<HTMLElement>('#customerId, input, select')?.focus();
    }
  }, [options.loading]);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    if (t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON') return;
    if (t.tagName === 'SELECT' || t.closest('[role="listbox"]')) return;
    if (!document.getElementById('trip-new-submit')?.hasAttribute('disabled')) {
      e.preventDefault();
      handleSubmit();
    }
  };
  const guard = useDirtyGuard([form], !options.loading);
  const handleBack = () => navigate('/trips');
  useBackShortcut(handleBack, {
    isDirty: guard.isDirty,
    confirmDiscard: () => confirm('Thoát mà không lưu? Các thay đổi chưa lưu sẽ bị mất.', { variant: 'warning', confirmLabel: 'Thoát' }),
  });

  const handleSubmit = async () => {
    const tripId = await form.handleSubmit();
    if (tripId) {
      navigate(`/trips/${tripId}`);
    }
  };

  return (
    <TripFormProvider form={form}>
      <div ref={(el) => { rootRef.current = el; wrapRef.current = el; }} className="tc-create-wrap" onKeyDown={onKeyDown}>
        <section className="tc-create-hero tc-create-hero--compact">
          <button className="tc-back-btn" onClick={handleBack} aria-label="Quay lại">
            <ArrowLeft size={18} />
          </button>
          <div className="tc-hero-title-block">
            {/* 1 hàng duy nhất (audit Gemini 23/10): topbar đã có 'ĐANG XEM',
                không lặp kicker + icon; ước tính/chỉ tiêu chuyển xuống ActionBar. */}
            <h1 className="tc-hero-h1">Tạo lệnh vận chuyển mới</h1>
            <p className="tc-hero-sub">
              Chọn tuyến đường để tự động điền trạm thu phí, định mức dầu và lương sản lượng.
            </p>
          </div>
        </section>

        <div className="tc-create-bento" id="trip-new-form">
          <div className="tc-bento-main">
            <TripInfoCard
              customers={options.customers}
              carrierCustomers={options.carrierCustomers}
              routes={options.routes}
              trucks={options.trucks}
              trailerTypes={options.trailerTypes}
              drivers={options.drivers}
              cargoTypes={options.cargoTypes}
              containerTypes={options.containerTypes}
              loading={options.loading}
            />
          </div>

          <div className="tc-bento-legs">
            <JourneyLegsCard collapsible defaultCollapsed />
          </div>

          <div className="tc-bento-finance">
            <FuelTollsRevenueCard collapsible defaultCollapsed />
          </div>

          <div className="tc-bento-containers">
            <CardSection
              number={4}
              title="Container & Seal"
              subtitle="Cập nhật số cont, seal và ảnh chụp khi có dữ liệu thực tế"
              badge="optional"
              collapsible
              /* Mở sẵn (audit Gemini 23/10): số cont là dữ liệu cốt lõi của
                  lệnh container; các section tuỳ chọn khác vẫn đóng. */
            >
              <ContainerInstancesCard expectedCount={expectedContainerCount} />
            </CardSection>
          </div>

          <div className="tc-bento-media">
            <ImagesNotesCard collapsible defaultCollapsed />
          </div>
        </div>

        <ActionBar
          loading={options.loading}
          onCancel={handleBack}
          onSubmit={handleSubmit}
        />

        {form.createdTripId && !form.submitting && (
          <p role="status">
            Chuyến đã có trong sổ chuyến đi.{' '}
            <a href={`/trips/${form.createdTripId}/edit`} target="_blank" rel="noopener noreferrer">
              Mở lệnh đã tạo để chỉnh sửa (tab mới)
            </a>
            {' '}— dữ liệu chưa lưu vẫn được giữ ở trang này.
          </p>
        )}

        {dialog}
      </div>
    </TripFormProvider>
  );
}
