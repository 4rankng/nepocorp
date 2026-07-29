import { useEffect, useMemo, useState } from 'react';
import { Container, Search, Truck } from 'lucide-react';
import { Modal } from '../../../components/UI';
import './vehicle-schedules.css';

export interface VehicleSchedulePickerOption {
  id: number;
  plate: string;
  meta: string;
}

interface VehicleScheduleVehiclePickerProps {
  isOpen: boolean;
  trucks: VehicleSchedulePickerOption[];
  trailers: VehicleSchedulePickerOption[];
  onClose: () => void;
  onSelect: (vehicleComponent: 'TRUCK' | 'TRAILER', vehicle: VehicleSchedulePickerOption) => void;
}

export function VehicleScheduleVehiclePicker({
  isOpen,
  trucks,
  trailers,
  onClose,
  onSelect,
}: VehicleScheduleVehiclePickerProps) {
  const [vehicleComponent, setVehicleComponent] = useState<'TRUCK' | 'TRAILER'>('TRUCK');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setVehicleComponent('TRUCK');
    setQuery('');
  }, [isOpen]);

  const options = vehicleComponent === 'TRUCK' ? trucks : trailers;
  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi-VN');
    if (!normalizedQuery) return options;
    return options.filter(option => (
      option.plate.toLocaleLowerCase('vi-VN').includes(normalizedQuery)
      || option.meta.toLocaleLowerCase('vi-VN').includes(normalizedQuery)
    ));
  }, [options, query]);

  const componentLabel = vehicleComponent === 'TRUCK' ? 'xe đầu kéo' : 'rơ-moóc';

  return (
    <Modal
      isOpen={isOpen}
      title="Chọn phương tiện nhắc lịch"
      onClose={onClose}
      maxWidth={620}
    >
      <div className="vehicle-schedule-picker">
        <p className="vehicle-schedule-picker__hint">
          Chọn xe đầu kéo hoặc rơ-moóc để tạo lịch nhắc việc.
        </p>

        <div
          className="vehicle-schedule-picker__tabs"
          role="tablist"
          aria-label="Loại phương tiện"
        >
          <button
            type="button"
            role="tab"
            aria-selected={vehicleComponent === 'TRUCK'}
            className={vehicleComponent === 'TRUCK' ? 'is-active' : ''}
            onClick={() => setVehicleComponent('TRUCK')}
          >
            <Truck size={18} aria-hidden="true" />
            <span>Xe đầu kéo</span>
            <span className="vehicle-schedule-picker__count">{trucks.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={vehicleComponent === 'TRAILER'}
            className={vehicleComponent === 'TRAILER' ? 'is-active' : ''}
            onClick={() => setVehicleComponent('TRAILER')}
          >
            <Container size={18} aria-hidden="true" />
            <span>Rơ-moóc</span>
            <span className="vehicle-schedule-picker__count">{trailers.length}</span>
          </button>
        </div>

        <label className="vehicle-schedule-picker__search">
          <span className="sr-only">Tìm biển số phương tiện</span>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={`Tìm biển số ${componentLabel}`}
          />
        </label>

        <div
          className="vehicle-schedule-picker__list"
          role="tabpanel"
          aria-label={`Danh sách ${componentLabel}`}
        >
          {visibleOptions.length === 0 ? (
            <div className="vehicle-schedule-picker__empty">
              {options.length === 0
                ? `Chưa có ${componentLabel} trong đội xe.`
                : 'Không tìm thấy biển số phù hợp.'}
            </div>
          ) : visibleOptions.map(option => (
            <button
              key={option.id}
              type="button"
              className="vehicle-schedule-picker__option"
              onClick={() => onSelect(vehicleComponent, option)}
              aria-label={`Chọn ${componentLabel} ${option.plate}`}
            >
              <span className="vehicle-schedule-picker__option-icon">
                {vehicleComponent === 'TRUCK'
                  ? <Truck size={19} aria-hidden="true" />
                  : <Container size={19} aria-hidden="true" />}
              </span>
              <span className="vehicle-schedule-picker__option-copy">
                <strong>{option.plate}</strong>
                <span>{option.meta}</span>
              </span>
              <span className="vehicle-schedule-picker__select-label">Chọn</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
