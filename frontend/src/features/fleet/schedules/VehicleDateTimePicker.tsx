import { forwardRef, useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CalendarDays, Clock3 } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import './VehicleDateTimePicker.css';

const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const LOCAL_DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

interface VehicleDateTimePickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  required?: boolean;
  disabled?: boolean;
}

function pad(part: number): string {
  return String(part).padStart(2, '0');
}

function parseLocalDateTime(value: string): { date: Date; time: string } | null {
  const match = LOCAL_DATETIME_PATTERN.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), 12);
  if (
    date.getFullYear() !== Number(year)
    || date.getMonth() !== Number(month) - 1
    || date.getDate() !== Number(day)
  ) {
    return null;
  }

  return { date, time: `${hour}:${minute}` };
}

function serializeLocalDateTime(date: Date, time: string): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${time}`;
}

function todayInVietnam(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(item => item.type === type)?.value);
  return new Date(part('year'), part('month') - 1, part('day'), 12);
}

export const VehicleDateTimePicker = forwardRef<HTMLButtonElement, VehicleDateTimePickerProps>(
  function VehicleDateTimePicker({
    id,
    value,
    onChange,
    ariaLabel,
    required = false,
    disabled = false,
  }, ref) {
    const current = useMemo(() => parseLocalDateTime(value), [value]);
    const [open, setOpen] = useState(false);
    const [draftDate, setDraftDate] = useState<Date | undefined>(current?.date);
    const [draftTime, setDraftTime] = useState(current?.time ?? '09:00');

    const handleOpenChange = (nextOpen: boolean) => {
      if (nextOpen) {
        setDraftDate(current?.date ?? todayInVietnam());
        setDraftTime(current?.time ?? '09:00');
      }
      setOpen(nextOpen);
    };

    const applyDraft = () => {
      if (!draftDate || !draftTime) return;
      onChange(serializeLocalDateTime(draftDate, draftTime));
      setOpen(false);
    };

    return (
      <Popover.Root open={open} onOpenChange={handleOpenChange} modal>
        <Popover.Trigger asChild>
          <button
            ref={ref}
            id={id}
            type="button"
            className="input vehicle-date-time-picker__trigger"
            aria-label={ariaLabel}
            aria-required={required}
            data-empty={!current}
            disabled={disabled}
          >
            <CalendarDays size={16} aria-hidden="true" />
            <span className="vehicle-date-time-picker__value">
              {current ? (
                <>
                  <span>{format(current.date, 'dd/MM/yyyy')}</span>
                  <span className="vehicle-date-time-picker__time">{current.time}</span>
                </>
              ) : (
                <span>Chọn ngày và giờ</span>
              )}
            </span>
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className="vehicle-date-time-picker__popover"
            sideOffset={8}
            align="end"
            collisionPadding={12}
            aria-label={ariaLabel}
          >
            <DayPicker
              mode="single"
              selected={draftDate}
              onSelect={setDraftDate}
              defaultMonth={draftDate}
              locale={vi}
              fixedWeeks
              showOutsideDays
              navLayout="around"
              className="vehicle-date-time-picker__calendar"
              formatters={{
                formatCaption: month => format(month, 'MMMM yyyy', { locale: vi }),
              }}
            />

            <div className="vehicle-date-time-picker__time-field">
              <label htmlFor={`${id}-time`}>
                <Clock3 size={16} aria-hidden="true" />
                Giờ
              </label>
              <input
                id={`${id}-time`}
                type="time"
                value={draftTime}
                step={1800}
                onChange={event => setDraftTime(event.target.value)}
              />
              <span>Giờ Việt Nam (UTC+7)</span>
            </div>

            <div className="vehicle-date-time-picker__actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm vehicle-date-time-picker__today"
                onClick={() => setDraftDate(todayInVietnam())}
              >
                Hôm nay
              </button>
              <Popover.Close asChild>
                <button type="button" className="btn btn--ghost btn--sm">Bỏ qua</button>
              </Popover.Close>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={applyDraft}
                disabled={!draftDate || !draftTime}
              >
                Áp dụng
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  },
);
