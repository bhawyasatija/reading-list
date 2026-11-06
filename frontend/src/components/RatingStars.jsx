import './RatingStars.css'

// Shows a 1–5 rating as filled and empty stars, e.g. ★★★★☆.
export default function RatingStars({ rating }) {
  return (
    // The stars are decorative for screen readers; the label says it in words.
    <span className="rating-stars" role="img" aria-label={`Rated ${rating} out of 5`}>
      {'★'.repeat(rating)}
      <span className="rating-stars__empty">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}
