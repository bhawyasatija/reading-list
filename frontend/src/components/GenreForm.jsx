import { useFormState } from '../hooks/useFormState.js'
import { validateGenre } from '../validation.js'
import FormField from './FormField.jsx'
import './GenreForm.css'

const NEW_GENRE_VALUES = { name: '', description: '' }

/**
 * Compact form for adding a genre, or editing one in place.
 * Same contract as BookForm: the parent supplies onSubmit(payload).
 */
export default function GenreForm({ genre = null, submitLabel, onSubmit, onCancel }) {
  const initialValues = genre
    ? { name: genre.name, description: genre.description }
    : NEW_GENRE_VALUES
  const { errors, formError, isSubmitting, handleSubmit, fieldId, fieldProps } = useFormState(
    initialValues,
    validateGenre,
    (values) => onSubmit({ name: values.name.trim(), description: values.description.trim() }),
  )

  return (
    <form className="genre-form" onSubmit={handleSubmit} noValidate>
      <div className="genre-form__fields">
        <FormField id={fieldId('name')} label="Name" error={errors.name} required>
          <input className="input" type="text" maxLength={50} required {...fieldProps('name')} />
        </FormField>
        <FormField id={fieldId('description')} label="Description" error={errors.description}>
          <input className="input" type="text" {...fieldProps('description')} />
        </FormField>
      </div>

      {/* Field errors are shown under the inputs; only other errors show here. */}
      {formError && !errors.name && !errors.description && (
        <p className="genre-form__error" role="alert">
          {formError}
        </p>
      )}

      <div className="genre-form__actions">
        <button type="submit" className="button button--primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="button" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
