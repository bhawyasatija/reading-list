import './FormField.css'

/**
 * Label + input + error message, laid out consistently.
 *
 * The input itself is passed as `children`, so this works for <input>,
 * <select> and <textarea> alike. For screen readers, the input should set
 * aria-describedby to `${id}-error` (or `${id}-hint`) to point at the
 * message rendered here; the forms do this with their fieldProps() helper.
 */
export default function FormField({ id, label, error, hint, required = false, children }) {
  return (
    <div className="form-field">
      <label htmlFor={id} className="form-field__label">
        {label}
        {required && (
          <span className="form-field__required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="form-field__error">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="form-field__hint">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
