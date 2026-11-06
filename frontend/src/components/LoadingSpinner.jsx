import './LoadingSpinner.css'

export default function LoadingSpinner({ label = 'Loading…' }) {
  return (
    // role="status" makes screen readers announce the label politely.
    <div className="loading-spinner" role="status">
      <span className="loading-spinner__circle" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
