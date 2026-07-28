const VIETNAM_OFFSET_HOURS = 7;
const LOCAL_DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function invalidTime(): never {
  throw new Error('Thời gian không hợp lệ');
}

export function toVietnamIso(value: string): string {
  const match = LOCAL_DATETIME_PATTERN.exec(value);
  if (!match) return invalidTime();

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const validation = new Date(Date.UTC(year, month - 1, day, hour, minute));

  if (
    validation.getUTCFullYear() !== year
    || validation.getUTCMonth() !== month - 1
    || validation.getUTCDate() !== day
    || validation.getUTCHours() !== hour
    || validation.getUTCMinutes() !== minute
  ) {
    return invalidTime();
  }

  return new Date(Date.UTC(
    year,
    month - 1,
    day,
    hour - VIETNAM_OFFSET_HOURS,
    minute,
  )).toISOString();
}

export function fromVietnamIso(value: string): string {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return invalidTime();
  const vietnam = new Date(instant.getTime() + VIETNAM_OFFSET_HOURS * 60 * 60 * 1000);
  const pad = (part: number) => String(part).padStart(2, '0');

  return [
    vietnam.getUTCFullYear(),
    '-',
    pad(vietnam.getUTCMonth() + 1),
    '-',
    pad(vietnam.getUTCDate()),
    'T',
    pad(vietnam.getUTCHours()),
    ':',
    pad(vietnam.getUTCMinutes()),
  ].join('');
}
