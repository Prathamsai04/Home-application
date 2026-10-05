/** Converts "Wi-Fi, Pool" into ["Wi-Fi", "Pool"] for list inputs. */
export function splitList(text) {
  return String(text ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinList(items) {
  return (items ?? []).join(', ');
}

/** Removes empty optional strings so PATCH payloads do not overwrite values with "". */
export function compact(values) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}
