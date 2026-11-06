import { BOOK_STATUSES } from '../constants.js'
import './BookFilters.css'

/**
 * Status and genre dropdowns for the book list.
 *
 * Controlled component: the current values come in as props, and every
 * change goes out through onChange(name, value). The page decides where the
 * values live (in the URL).
 */
export default function BookFilters({ status, genre, genres, onChange, onClear }) {
  const hasFilters = status !== '' || genre !== ''

  function handleChange(event) {
    onChange(event.target.name, event.target.value)
  }

  return (
    <div className="book-filters" role="search" aria-label="Filter books">
      <label className="book-filters__field">
        <span className="book-filters__label">Status</span>
        <select className="input" name="status" value={status} onChange={handleChange}>
          <option value="">All statuses</option>
          {BOOK_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="book-filters__field">
        <span className="book-filters__label">Genre</span>
        <select className="input" name="genre" value={genre} onChange={handleChange}>
          <option value="">All genres</option>
          {genres.map((option) => (
            <option key={option.id} value={String(option.id)}>
              {option.name}
            </option>
          ))}
        </select>
      </label>

      {hasFilters && (
        <button type="button" className="button" onClick={onClear}>
          Clear filters
        </button>
      )}
    </div>
  )
}
