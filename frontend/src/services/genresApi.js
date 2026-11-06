// Functions for the /api/genres/ endpoints. Same conventions as booksApi.js.
import apiClient from './apiClient.js'

export async function listGenres() {
  const response = await apiClient.get('/genres/')
  return response.data
}

export async function createGenre(genre) {
  const response = await apiClient.post('/genres/', genre)
  return response.data
}

export async function updateGenre(id, genre) {
  const response = await apiClient.put(`/genres/${id}/`, genre)
  return response.data
}

// Rejects with a 409 response if books still use this genre.
export async function deleteGenre(id) {
  await apiClient.delete(`/genres/${id}/`)
}
