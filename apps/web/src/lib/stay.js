import { diffDays, isIsoDate, isValidMoneyInput, multiplyMinor, toMinorUnits } from '@homestay/shared';

/**
 * Display-only stay estimate for forms. The API recalculates the authoritative
 * total; this uses the same integer arithmetic so the preview always matches.
 */
export function estimateStay({ checkIn, checkOut, nightlyRate, fallbackRateMinor }) {
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut) || checkOut <= checkIn) return null;
  const nights = diffDays(checkIn, checkOut);
  const rateMinor = nightlyRate && isValidMoneyInput(nightlyRate) ? toMinorUnits(nightlyRate) : fallbackRateMinor;
  if (!Number.isSafeInteger(rateMinor)) return { nights, rateMinor: null, totalMinor: null };
  return { nights, rateMinor, totalMinor: multiplyMinor(rateMinor, nights) };
}

const ACTION_LABELS = {
  confirm: 'Confirm',
  check_in: 'Check in',
  check_out: 'Check out',
  cancel: 'Cancel',
  no_show: 'Mark no-show',
  edit: 'Edit',
};

export const reservationActionLabel = (action) => ACTION_LABELS[action] ?? action;
