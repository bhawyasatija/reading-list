// Client-side validation: quick feedback before a request is sent.
//
// These rules repeat the backend's rules (models.py / serializers.py) so the
// user sees mistakes immediately. The backend still checks everything: a
// browser can be bypassed, so the server's validation is the one that counts.
//
// Each function takes form values (all strings, as inputs produce them) and
// returns {fieldName: message} for every problem; {} means valid.

import { todayIsoDate } from './dates.js'

export function validateBook(values) {
  const errors = {}

  const title = values.title.trim()
  if (!title) errors.title = 'Enter a title.'
  else if (title.length > 200) errors.title = 'Keep the title to 200 characters or fewer.'

  const author = values.author.trim()
  if (!author) errors.author = 'Enter the author.'
  else if (author.length > 120) errors.author = 'Keep the author to 120 characters or fewer.'

  if (!values.genre) errors.genre = 'Choose a genre.'

  // Comparing "YYYY-MM-DD" strings works because the format sorts like the date.
  if (values.status === 'finished' && values.finished_on > todayIsoDate()) {
    errors.finished_on = 'The finished date cannot be in the future.'
  }

  return errors
}

export function validateGenre(values) {
  const errors = {}
  const name = values.name.trim()
  if (!name) errors.name = 'Enter a name.'
  else if (name.length > 50) errors.name = 'Keep the name to 50 characters or fewer.'
  return errors
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0
}
