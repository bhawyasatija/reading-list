import { Link } from 'react-router'
import RatingStars from './RatingStars.jsx'
import StatusBadge from './StatusBadge.jsx'
import './BookCard.css'

// Summary of one book for the list page. Purely presentational: it gets the
// book through props and never calls the API itself.
export default function BookCard({ book }) {
  return (
    <article className="book-card">
      <div className="book-card__header">
        <h2 className="book-card__title">
          {/* The link covers the whole card (see .book-card__link::after in
              BookCard.css) while keeping the title as its accessible name. */}
          <Link to={`/books/${book.id}`} className="book-card__link">
            {book.title}
          </Link>
        </h2>
        <StatusBadge status={book.status} />
      </div>
      <p className="book-card__author">{book.author}</p>
      <p className="book-card__meta">
        <span>{book.genre_name}</span>
        {book.rating !== null && <RatingStars rating={book.rating} />}
      </p>
    </article>
  )
}
