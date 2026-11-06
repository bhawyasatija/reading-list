import { getStatusLabel } from '../constants.js'
import './StatusBadge.css'

// A coloured label for a book's reading status. The modifier class
// (status-badge--reading etc.) picks the colour.
export default function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-badge--${status}`}>{getStatusLabel(status)}</span>
  )
}
