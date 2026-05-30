import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTripOptions } from '../hooks/useTripOptions';
import { useTripForm } from '../hooks/useTripForm';
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
            customerId={form.customerId} onCustomerIdChange={form.setCustomerId}
            routeId={form.routeId} onRouteIdChange={form.setRouteId}
            truckId={form.truckId} onTruckIdChange={form.setTruckId}
            trailerId={form.trailerId} onTrailerIdChange={form.setTrailerId}
            driverId={form.driverId} onDriverIdChange={form.setDriverId}
            cargoTypeId={form.cargoTypeId} onCargoTypeIdChange={form.setCargoTypeId}
            departureDate={form.departureDate} onDepartureDateChange={form.setDepartureDate}
            customerReference={form.customerReference} onCustomerReferenceChange={form.setCustomerReference}
            customers={options.customers}
            routes={options.routes}
            trucks={options.trucks}
            trailers={options.trailers}
            drivers={options.drivers}
            cargoTypes={options.cargoTypes}
            loading={options.loading}
          />

          <SectionDivider label="Các mục dưới đây là tùy chọn — có thể bổ sung sau khi tạo lệnh" />

          {/* Sections 2–4 are all "optional" on create — collapsed by default so
              the form opens lean, click the chevron/header to expand any one. */}
          <JourneyLegsCard
            collapsible defaultCollapsed
            legs={form.legs}
            addLeg={form.addLeg}
            removeLeg={form.removeLeg}
            updateLeg={form.updateLeg}
          />

          <FuelTollsRevenueCard
            collapsible defaultCollapsed
            fuelMode={form.fuelMode} onFuelModeChange={form.setFuelMode}
            fuelLitersOverride={form.fuelLitersOverride} onFuelLitersOverrideChange={form.setFuelLitersOverride}
            fuelSupplementLiters={form.fuelSupplementLiters} onFuelSupplementLitersChange={form.setFuelSupplementLiters}
            fuelSupplementReason={form.fuelSupplementReason} onFuelSupplementReasonChange={form.setFuelSupplementReason}
            tollsDiscount={form.tollsDiscount} onTollsDiscountChange={form.setTollsDiscount}
            tollsAddition={form.tollsAddition} onTollsAdditionChange={form.setTollsAddition}
            tollsStations={form.tollsStations} onTollsStationsChange={form.setTollsStations}
            hasReturnCargo={form.hasReturnCargo} onHasReturnCargoChange={form.setHasReturnCargo}
            driverSalary={form.driverSalary} onDriverSalaryChange={form.setDriverSalary}
            revenue={form.revenue} onRevenueChange={form.setRevenue}
            suggestedPrice={form.suggestedPrice}
          />

          <ImagesNotesCard
            collapsible defaultCollapsed
            notes={form.notes}
            onNotesChange={form.setNotes}
            photoUrls={form.photoUrls}
            uploading={form.uploading}
            onUpload={form.uploadPhotos}
            onRemovePhoto={form.removePhoto}
          />
        </div>

        <aside className="tc-rail">
          <TripSummaryCard
            revenue={Number(form.revenue) || 0}
            fuelCost={form.estimatedFuelCost}
            tollCost={form.estimatedTollCost}
            driverSalary={Number(form.driverSalary) || 0}
            profit={form.estimatedProfit}
            tollStations={Number(form.tollsStations) || 0}
          />
          <TripChecklistPanel completionStatus={form.completionStatus} />
          <TipCard />
        </aside>
      </div>

      <ActionBar
        requiredFieldsFilled={form.requiredFieldsFilled}
        totalRequiredFields={form.totalRequiredFields}
        submitting={form.submitting}
        uploading={form.uploading}
        loading={options.loading}
        error={form.error}
        onCancel={() => navigate('/trips')}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
