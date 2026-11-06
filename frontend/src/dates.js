// Date helpers. The API sends dates as "2026-03-14" (DateField) and
// date-times as "2026-03-14T20:00:00Z" (DateTimeField, always UTC).

/**
 * "2026-03-14" -> "14 Mar 2026" (formatted for the browser's locale).
 *
 * The string is split by hand on purpose: new Date("2026-03-14") means
 * midnight UTC, which displays as 13 March for anyone west of UTC.
 */
export function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

// "2026-03-14T20:00:00Z" -> "14 Mar 2026, 20:00" in the user's own time zone.
export function formatDateTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

// Today's date in the user's time zone, as "YYYY-MM-DD" (the format of
// <input type="date"> values). toISOString() would give the UTC date instead.
export function todayIsoDate() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
