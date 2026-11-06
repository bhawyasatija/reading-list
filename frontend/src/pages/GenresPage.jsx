import { useState } from 'react'
import EmptyState from '../components/EmptyState.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import GenreForm from '../components/GenreForm.jsx'
import GenreListItem from '../components/GenreListItem.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useApiData } from '../hooks/useApiData.js'
import { getErrorMessage } from '../services/apiClient.js'
import { createGenre, deleteGenre, listGenres, updateGenre } from '../services/genresApi.js'
import './GenresPage.css'

// Route "/genres". Add, rename and delete genres on one page.
export default function GenresPage() {
  const { data: genres, isLoading, error, reload } = useApiData(listGenres)

  // Which genre's row shows its edit form (null: none).
  const [editingId, setEditingId] = useState(null)
  // Changing a component's `key` makes React discard it and mount a fresh
  // one. That is how the "Add" form is emptied after a successful save.
  const [createFormKey, setCreateFormKey] = useState(0)
  // Errors from delete, e.g. the 409 "still used by N books" message.
  const [actionError, setActionError] = useState('')

  async function handleCreate(payload) {
    await createGenre(payload)
    setCreateFormKey((key) => key + 1)
    reload()
  }

  async function handleUpdate(genreId, payload) {
    await updateGenre(genreId, payload)
    setEditingId(null)
    reload()
  }

  async function handleDelete(genre) {
    if (!window.confirm(`Delete the genre "${genre.name}"?`)) return
    setActionError('')
    try {
      await deleteGenre(genre.id)
      reload()
    } catch (requestError) {
      setActionError(getErrorMessage(requestError))
    }
  }

  return (
    <section className="genres-page">
      <div className="page-header">
        <div>
          <h1>Genres</h1>
          <p className="page-header__subtitle">Every book belongs to one genre.</p>
        </div>
      </div>

      <div className="genres-page__panel">
        <h2 className="genres-page__panel-title">Add a genre</h2>
        <GenreForm key={createFormKey} submitLabel="Add genre" onSubmit={handleCreate} />
      </div>

      {actionError && <ErrorMessage message={actionError} />}

      {isLoading && <LoadingSpinner label="Loading genres…" />}
      {error && <ErrorMessage message={getErrorMessage(error)} onRetry={reload} />}
      {genres && genres.length === 0 && (
        <EmptyState title="No genres yet" message="Add your first genre using the form above." />
      )}
      {genres && genres.length > 0 && (
        <ul className="genres-page__list">
          {genres.map((genre) => (
            <GenreListItem
              key={genre.id}
              genre={genre}
              isEditing={editingId === genre.id}
              onEdit={() => {
                setActionError('')
                setEditingId(genre.id)
              }}
              onCancelEdit={() => setEditingId(null)}
              onSave={(payload) => handleUpdate(genre.id, payload)}
              onDelete={() => handleDelete(genre)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
