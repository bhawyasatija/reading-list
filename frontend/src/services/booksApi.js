// Functions for the /api/books/ endpoints.
// Each one returns the response body, so callers never handle Axios
// response objects. Errors are not caught here: they propagate to the
// calling component, which decides how to show them.
import apiClient from './apiClient.js'

/**
 * @param {{ status?: string, genre?: string | number }} filters
 *   Empty values are left out, so { status: '' } sends no ?status= at all.
 */
export async function listBooks(filters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value != null),
  )
  const response = await apiClient.get('/books/', { params })
  return response.data
}

export async function getBook(id) {
  const response = await apiClient.get(`/books/${id}/`)
  return response.data
}

export async function createBook(book) {
  const response = await apiClient.post('/books/', book)
  return response.data
}

// PUT replaces the whole book. The edit form always sends every field,
// so PUT (rather than PATCH) matches what the form does.
export async function updateBook(id, book) {
  const response = await apiClient.put(`/books/${id}/`, book)
  return response.data
}

export async function deleteBook(id) {
  // A successful DELETE returns 204 No Content, so there is no body to return.
  await apiClient.delete(`/books/${id}/`)
}
