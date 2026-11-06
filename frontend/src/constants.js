// Mirrors Book.Status in backend/apps/library/models.py.
// If a status is added or renamed there, update this list too.
export const BOOK_STATUSES = [
  { value: 'want_to_read', label: 'Want to read' },
  { value: 'reading', label: 'Reading' },
  { value: 'finished', label: 'Finished' },
]

export function getStatusLabel(value) {
  const match = BOOK_STATUSES.find((status) => status.value === value)
  return match ? match.label : value
}
