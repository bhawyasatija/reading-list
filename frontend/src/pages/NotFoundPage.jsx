import { Link } from 'react-router'
import EmptyState from '../components/EmptyState.jsx'

// Shown for any URL that no other route matches (path="*" in App.jsx).
export default function NotFoundPage() {
  return (
    <EmptyState title="Page not found" message="The page you were looking for doesn't exist.">
      <Link to="/" className="button button--primary">
        Back to books
      </Link>
    </EmptyState>
  )
}
