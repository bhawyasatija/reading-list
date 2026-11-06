import GenreForm from './GenreForm.jsx'
import './GenreListItem.css'

/**
 * One row on the genres page. Shows the genre, or an inline edit form when
 * `isEditing` is true. Which row is being edited is decided by the page, so
 * only one row can be in edit mode at a time.
 */
export default function GenreListItem({ genre, isEditing, onEdit, onCancelEdit, onSave, onDelete }) {
  if (isEditing) {
    return (
      <li className="genre-list-item genre-list-item--editing">
        <GenreForm genre={genre} submitLabel="Save" onSubmit={onSave} onCancel={onCancelEdit} />
      </li>
    )
  }

  return (
    <li className="genre-list-item">
      <div className="genre-list-item__text">
        <h2 className="genre-list-item__name">{genre.name}</h2>
        {genre.description && <p className="genre-list-item__description">{genre.description}</p>}
      </div>
      <div className="genre-list-item__actions">
        <button type="button" className="button button--small" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="button button--small button--danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </li>
  )
}
