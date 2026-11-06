import './EmptyState.css'

// Shown when a list loaded successfully but has nothing in it.
// `children` is an optional call to action, e.g. an "Add a book" link.
export default function EmptyState({ title, message, children }) {
  return (
    <div className="empty-state">
      <h2 className="empty-state__title">{title}</h2>
      {message && <p className="empty-state__message">{message}</p>}
      {children}
    </div>
  )
}
