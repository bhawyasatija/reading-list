// The single configured Axios instance used for every API call.
// Only the files in services/ import it; components call those files instead.
import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL

if (!baseURL) {
  // Fail immediately with instructions, instead of sending requests to the
  // wrong address and showing confusing errors later.
  throw new Error(
    'VITE_API_BASE_URL is not set. Copy frontend/.env.example to frontend/.env ' +
      'and restart `npm run dev`.',
  )
}

const apiClient = axios.create({
  baseURL,
  // Give up after 10 seconds so the UI can show an error instead of
  // spinning forever.
  timeout: 10000,
  headers: { Accept: 'application/json' },
})

export default apiClient

/**
 * Turn any error thrown by an API call into one sentence a user can read.
 *
 * Axios errors come in three kinds:
 * - error.response set:  the server answered with a 4xx/5xx status.
 * - error.request set:   the request was sent but no answer came back
 *                        (backend not running, blocked by CORS, timeout).
 * - neither:             the request could not even be built (a bug).
 */
export function getErrorMessage(error) {
  if (error.response) {
    const { status, data } = error.response
    // DRF puts single-message errors (404, 409, ...) in "detail".
    if (data && typeof data.detail === 'string') {
      return data.detail
    }
    if (status === 400) {
      // Validation errors look like {"field": ["message", ...]}. Show the
      // messages themselves, e.g. for an invalid ?status= filter.
      // The isPlainObject check matters: Django answers some 400s with an
      // HTML page (e.g. a Host not in ALLOWED_HOSTS), and Object.values() on
      // a string returns its individual characters.
      // DRF can also send a plain list (["message"]) for non-field errors.
      const rawMessages = Array.isArray(data) ? data : isPlainObject(data) ? Object.values(data) : []
      const messages = rawMessages.flat().filter((message) => typeof message === 'string')
      return messages.length > 0
        ? messages.join(' ')
        : 'Some of the information is invalid. Please check the form.'
    }
    if (status >= 500) {
      return 'The server ran into a problem. Please try again in a moment.'
    }
    return `The request failed (status ${status}).`
  }
  if (error.code === 'ECONNABORTED') {
    return 'The server took too long to respond. Please try again.'
  }
  if (error.request) {
    return 'Cannot reach the server. Check that the backend is running on port 8000.'
  }
  // Not an HTTP problem at all, so most likely a bug in our own code (e.g. a
  // TypeError). The user only sees a short message, so log the full error
  // with its stack trace for whoever is debugging.
  console.error('Unexpected error:', error)
  return error.message
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Extract per-field messages from a 400 response, for showing under inputs.
 *
 *   {"title": ["This field is required."], "rating": ["Too high.", "Also..."]}
 *   -> {title: "This field is required.", rating: "Too high. Also..."}
 *
 * Returns {} for any other kind of error. "non_field_errors" is left out
 * because it doesn't belong to one input; getErrorMessage() includes it.
 */
export function getFieldErrors(error) {
  const { status, data } = error.response ?? {}
  if (status !== 400 || !isPlainObject(data)) {
    return {}
  }
  const fieldErrors = {}
  for (const [field, messages] of Object.entries(data)) {
    if (field === 'non_field_errors') continue
    fieldErrors[field] = Array.isArray(messages) ? messages.join(' ') : String(messages)
  }
  return fieldErrors
}

export function isNotFound(error) {
  return error?.response?.status === 404
}
