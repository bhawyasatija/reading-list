import { BOOK_STATUSES } from '../constants.js'
import { todayIsoDate } from '../dates.js'
import { useFormState } from '../hooks/useFormState.js'
import { validateBook } from '../validation.js'
import FormField from './FormField.jsx'
import './BookForm.css'

const NEW_BOOK_VALUES = {
  title: '',
  author: '',
  genre: '',
  status: 'want_to_read',
  rating: '',
  finished_on: '',
  notes: '',
}

// API book -> form values. Inputs need strings, never null.
function toFormValues(book) {
  return {
    title: book.title,
    author: book.author,
    genre: String(book.genre),
    status: book.status,
    rating: book.rating === null ? '' : String(book.rating),
    finished_on: book.finished_on ?? '',
    notes: book.notes,
  }
}

// Form values -> API payload, with the types the API expects.
function toBookPayload(values) {
  const isFinished = values.status === 'finished'
  return {
    title: values.title.trim(),
    author: values.author.trim(),
    genre: Number(values.genre),
    status: values.status,
    // The backend only allows these on finished books, so they are cleared
    // for any other status rather than letting the request fail.
    rating: isFinished && values.rating !== '' ? Number(values.rating) : null,
    finished_on: isFinished && values.finished_on !== '' ? values.finished_on : null,
    notes: values.notes,
  }
}

/**
 * Create/edit form for a book. Used by BookFormPage for both modes:
 * pass `book` to edit it, or leave it out to start empty.
 *
 * The form doesn't call the API itself; `onSubmit(payload)` does. That keeps
 * this component reusable and leaves navigation to the page.
 */
export default function BookForm({ book = null, genres, submitLabel, onSubmit, onCancel }) {
  const { values, errors, formError, isSubmitting, handleSubmit, fieldId, fieldProps } =
    useFormState(book ? toFormValues(book) : NEW_BOOK_VALUES, validateBook, (formValues) =>
      onSubmit(toBookPayload(formValues)),
    )
  const isFinished = values.status === 'finished'

  return (
    // noValidate turns off the browser's own pop-up messages, so all
    // validation messages appear in one consistent place: under each field.
    <form className="book-form" onSubmit={handleSubmit} noValidate>
      {formError && (
        <p className="book-form__error" role="alert">
          {formError}
        </p>
      )}

      <FormField id={fieldId('title')} label="Title" error={errors.title} required>
        <input className="input" type="text" maxLength={200} required {...fieldProps('title')} />
      </FormField>

      <FormField id={fieldId('author')} label="Author" error={errors.author} required>
        <input className="input" type="text" maxLength={120} required {...fieldProps('author')} />
      </FormField>

      <div className="book-form__row">
        <FormField id={fieldId('genre')} label="Genre" error={errors.genre} required>
          <select className="input" required {...fieldProps('genre')}>
            <option value="">Choose a genre…</option>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id={fieldId('status')} label="Status" error={errors.status}>
          <select className="input" {...fieldProps('status')}>
            {BOOK_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {/* Rating and finished date only make sense once a book is finished. */}
      {isFinished && (
        <div className="book-form__row">
          <FormField id={fieldId('rating')} label="Rating" error={errors.rating}>
            <select className="input" {...fieldProps('rating')}>
              <option value="">No rating</option>
              {[5, 4, 3, 2, 1].map((stars) => (
                <option key={stars} value={stars}>
                  {'★'.repeat(stars)} ({stars})
                </option>
              ))}
            </select>
          </FormField>

          <FormField id={fieldId('finished_on')} label="Finished on" error={errors.finished_on}>
            <input className="input" type="date" max={todayIsoDate()} {...fieldProps('finished_on')} />
          </FormField>
        </div>
      )}

      <FormField
        id={fieldId('notes')}
        label="Notes"
        error={errors.notes}
        hint={isFinished ? null : 'Rating and finished date become available once the status is Finished.'}
      >
        <textarea className="input" rows={5} {...fieldProps('notes')} />
      </FormField>

      <div className="book-form__actions">
        <button type="submit" className="button button--primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
        <button type="button" className="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </div>
    </form>
  )
}
