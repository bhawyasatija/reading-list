import { useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import BookForm from '../components/BookForm.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApiData } from '../hooks/useApiData.js'
import { getErrorMessage, isNotFound } from '../services/apiClient.js'
import { createBook, getBook, updateBook } from '../services/booksApi.js'
import { listGenres } from '../services/genresApi.js'

// Routes "/books/new" (create) and "/books/:bookId/edit" (edit).
// One page for both, because the two differ only in where the starting
// values come from and which API function saves them.
export default function BookFormPage() {
  const { bookId } = useParams()
  const isEditing = bookId !== undefined
  const navigate = useNavigate()

  const genresRequest = useApiData(listGenres)
  // In create mode there is no book to load, so this resolves straight away with null.
  const loadBook = useCallback(
    () => (isEditing ? getBook(bookId) : Promise.resolve(null)),
    [isEditing, bookId],
  )
  const bookRequest = useApiData(loadBook)

  // Called by BookForm after its own validation passes. Errors are not caught
  // here: they propagate back into the form, which shows them under the fields.
  async function handleSubmit(payload) {
    const savedBook = isEditing ? await updateBook(bookId, payload) : await createBook(payload)
    navigate(`/books/${savedBook.id}`)
  }

  const cancelPath = isEditing ? `/books/${bookId}` : '/'
  const title = isEditing ? 'Edit book' : 'Add a book'

  return (
    <section>
      <Link to={cancelPath} className="back-link">
        ← {isEditing ? 'Back to book' : 'All books'}
      </Link>
      <div className="page-header">
        <h1>{title}</h1>
      </div>
      <BookFormPageContent
        genresRequest={genresRequest}
        bookRequest={bookRequest}
        isEditing={isEditing}
        onSubmit={handleSubmit}
        onCancel={() => navigate(cancelPath)}
      />
    </section>
  )
}

function BookFormPageContent({ genresRequest, bookRequest, isEditing, onSubmit, onCancel }) {
  if (genresRequest.isLoading || bookRequest.isLoading) {
    return <LoadingSpinner />
  }
  if (isNotFound(bookRequest.error)) {
    return (
      <EmptyState title="Book not found" message="It may have been deleted.">
        <Link to="/" className="button button--primary">
          Back to books
        </Link>
      </EmptyState>
    )
  }
  const loadError = genresRequest.error ?? bookRequest.error
  if (loadError) {
    return (
      <ErrorMessage
        message={getErrorMessage(loadError)}
        onRetry={() => {
          genresRequest.reload()
          bookRequest.reload()
        }}
      />
    )
  }
  // Every book needs a genre, so the form is useless until one exists.
  if (genresRequest.data.length === 0) {
    return (
      <EmptyState title="Add a genre first" message="Every book belongs to a genre.">
        <Link to="/genres" className="button button--primary">
          Go to genres
        </Link>
      </EmptyState>
    )
  }
  return (
    <BookForm
      book={bookRequest.data}
      genres={genresRequest.data}
      submitLabel={isEditing ? 'Save changes' : 'Add book'}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  )
}
