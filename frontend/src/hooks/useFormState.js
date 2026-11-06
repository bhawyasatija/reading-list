import { useId, useState } from 'react'
import { getErrorMessage, getFieldErrors } from '../services/apiClient.js'
import { hasErrors } from '../validation.js'

const FIX_FIELDS_MESSAGE = 'Please correct the highlighted fields.'

/**
 * State and handlers shared by every form in the app.
 *
 * @param initialValues  Field values as strings, e.g. {name: '', description: ''}.
 * @param validate       (values) => {field: message}. Runs before submitting.
 * @param onSubmit       async (values) => void. Calls the API. If it throws,
 *                       the server's field errors are shown under the inputs.
 *
 * Flow on submit:
 *   1. Client validation. If anything fails, show errors and stop; no request is sent.
 *   2. Call onSubmit. While it runs, isSubmitting disables the submit button
 *      so a double-click can't create two records.
 *   3. If the server rejects the data (400), show its messages per field.
 *      For any other failure, show one message for the whole form.
 */
export function useFormState(initialValues, validate, onSubmit) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // A unique prefix for this form's element ids, so two forms on the same
  // page (e.g. on the genres page) never produce duplicate ids.
  const idPrefix = useId()

  function handleChange(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    // Hide a field's error as soon as the user starts fixing it.
    setErrors((current) => {
      if (!(name in current)) return current
      const remaining = { ...current }
      delete remaining[name]
      return remaining
    })
  }

  async function handleSubmit(event) {
    // Stop the browser's default action (a full-page form submission).
    event.preventDefault()

    const clientErrors = validate(values)
    if (hasErrors(clientErrors)) {
      setErrors(clientErrors)
      setFormError(FIX_FIELDS_MESSAGE)
      return
    }

    setErrors({})
    setFormError('')
    setIsSubmitting(true)
    try {
      await onSubmit(values)
    } catch (error) {
      const serverErrors = getFieldErrors(error)
      setErrors(serverErrors)
      setFormError(hasErrors(serverErrors) ? FIX_FIELDS_MESSAGE : getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  function fieldId(name) {
    return `${idPrefix}-${name}`
  }

  // Props to spread onto an input: <input {...fieldProps('title')} />.
  // Connects value, change handling, error styling and the error message.
  function fieldProps(name) {
    const hasError = Boolean(errors[name])
    return {
      id: fieldId(name),
      name,
      value: values[name],
      onChange: handleChange,
      'aria-invalid': hasError,
      'aria-describedby': hasError ? `${fieldId(name)}-error` : undefined,
    }
  }

  return { values, errors, formError, isSubmitting, handleSubmit, fieldId, fieldProps }
}
