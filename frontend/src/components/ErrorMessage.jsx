import './ErrorMessage.css'

// Shows an error, with a "Try again" button when the caller passes onRetry.
export default function ErrorMessage({ message, onRetry }) {
  return (
    // role="alert" makes screen readers announce the message immediately.
    <div className="error-message" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
