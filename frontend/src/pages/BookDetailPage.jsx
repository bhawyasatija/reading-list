import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import EmptyState from '../components/EmptyState.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import RatingStars from '../components/RatingStars.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { formatDate, formatDateTime } from '../dates.js'
import { useApiData } from '../hooks/useApiData.js'
import { getErrorMessage, isNotFound } from '../services/apiClient.js'
import { deleteBook, getBook } from '../services/booksApi.js'
import './BookDetailPage.css'

// Route "/books/:bookId". Shows one book, with Edit and Delete actions.
export default function BookDetailPage() {
  // useParams reads the ":bookId" part of the URL, always as a string.
  const { bookId } = useParams()
  const navigate = useNavigate()

  // useCallback gives loadBook a new identity only when bookId changes, so
  // useApiData refetches when you go to a different book, and not on every render.
  const loadBook = useCallback(() => getBook(bookId), [bookId])
  const { data: book, isLoading, error, reload } = useApiData(loadBook)

  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleDelete() {
    // window.confirm is basic, but accessible and needs no extra code.
    if (!window.confirm(`Delete "${book.title}"? This cannot be undone.`)) return

    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteBook(book.id)
      // replace: the deleted book's page leaves the history, so Back
      // doesn't return to a "not found" page.
      navigate('/', { replace: true })
    } catch (requestError) {
      setDeleteError(getErrorMessage(requestError))
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) return <LoadingSpinner label="Loading book…" />
  if (isNotFound(error)) {
    return (
      <EmptyState title="Book not found" message="It may have been deleted.">
        <Link to="/" className="button button--primary">
          Back to books
        </Link>
      </EmptyState>
    )
  }
  if (error) return <ErrorMessage message={getErrorMessage(error)} onRetry={reload} />

  return (
    <article className="book-detail">
      <Link to="/" className="back-link">
        ← All books
      </Link>

      <div className="page-header">
        <div>
          <h1>{book.title}</h1>
          <p className="page-header__subtitle">by {book.author}</p>
        </div>
        <div className="book-detail__actions">
          <Link to={`/books/${book.id}/edit`} className="button">
            Edit
          </Link>
          <button
            type="button"
            className="button button--danger"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {deleteError && <ErrorMessage message={deleteError} />}

      <dl className="book-detail__facts">
        <div>
          <dt>Status</dt>
          <dd>
            <StatusBadge status={book.status} />
          </dd>
        </div>
        <div>
          <dt>Genre</dt>
          <dd>{book.genre_name}</dd>
        </div>
        <div>
          <dt>Rating</dt>
          <dd>{book.rating !== null ? <RatingStars rating={book.rating} /> : '—'}</dd>
        </div>
        <div>
          <dt>Finished on</dt>
          <dd>{book.finished_on ? formatDate(book.finished_on) : '—'}</dd>
        </div>
      </dl>

      <section className="book-detail__notes">
        <h2>Notes</h2>
        {book.notes ? <p>{book.notes}</p> : <p className="book-detail__muted">No notes yet.</p>}
      </section>

      <p className="book-detail__muted book-detail__timestamps">
        Added {formatDateTime(book.created_at)} · Last updated {formatDateTime(book.updated_at)}
      </p>
    </article>
  )
}
