import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router'
import BookCard from '../components/BookCard.jsx'
import BookFilters from '../components/BookFilters.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApiData } from '../hooks/useApiData.js'
import { getErrorMessage } from '../services/apiClient.js'
import { listBooks } from '../services/booksApi.js'
import { listGenres } from '../services/genresApi.js'
import './BookListPage.css'

// Route "/". Pages own data loading; the components they render only
// receive data through props.
export default function BookListPage() {
  // Filters live in the URL (?status=reading&genre=2), not in useState, so
  // a filtered list survives a refresh and can be bookmarked or shared.
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? ''
  const genre = searchParams.get('genre') ?? ''

  // A new loadBooks is created only when a filter changes, which is exactly
  // when useApiData should fetch again.
  const loadBooks = useCallback(() => listBooks({ status, genre }), [status, genre])
  const { data: books, isLoading, error, reload } = useApiData(loadBooks)
  // listGenres is a module-level function, so its identity never changes.
  const { data: genres } = useApiData(listGenres)

  function handleFilterChange(name, value) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set(name, value)
        else next.delete(name)
        return next
      },
      // Replace rather than push, so the Back button leaves the page instead
      // of stepping back through every filter change.
      { replace: true },
    )
  }

  function clearFilters() {
    setSearchParams({}, { replace: true })
  }

  const hasFilters = status !== '' || genre !== ''

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Books</h1>
          {books && (
            <p className="page-header__subtitle">
              {books.length} {books.length === 1 ? 'book' : 'books'}
              {hasFilters && ' matching filters'}
            </p>
          )}
        </div>
        <Link to="/books/new" className="button button--primary">
          Add book
        </Link>
      </div>

      <BookFilters
        status={status}
        genre={genre}
        genres={genres ?? []}
        onChange={handleFilterChange}
        onClear={clearFilters}
      />

      <BookListContent
        books={books}
        isLoading={isLoading}
        error={error}
        hasFilters={hasFilters}
        onRetry={reload}
        onClearFilters={clearFilters}
      />
    </section>
  )
}

// Picks exactly one of the states: loading, error, empty, or the list.
function BookListContent({ books, isLoading, error, hasFilters, onRetry, onClearFilters }) {
  if (isLoading) {
    return <LoadingSpinner label="Loading books…" />
  }
  if (error) {
    return <ErrorMessage message={getErrorMessage(error)} onRetry={onRetry} />
  }
  if (books.length === 0 && hasFilters) {
    return (
      <EmptyState title="No matching books" message="No books match these filters.">
        <button type="button" className="button" onClick={onClearFilters}>
          Clear filters
        </button>
      </EmptyState>
    )
  }
  if (books.length === 0) {
    return (
      <EmptyState title="No books yet" message="Books you add will appear here.">
        <Link to="/books/new" className="button button--primary">
          Add your first book
        </Link>
      </EmptyState>
    )
  }
  return (
    <ul className="book-list">
      {books.map((book) => (
        // `key` lets React match list items between renders. Use a stable,
        // unique value (the database id), never the array index.
        <li key={book.id}>
          <BookCard book={book} />
        </li>
      ))}
    </ul>
  )
}
