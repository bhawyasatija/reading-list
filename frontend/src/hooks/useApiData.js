import { useCallback, useEffect, useState } from 'react'

/**
 * Load data from the API when a component mounts, and again whenever
 * `fetchData` changes or `reload()` is called.
 *
 * Returns { data, isLoading, error, reload }. At any moment exactly one of
 * these is true: isLoading, error is set, or data is set.
 *
 * `fetchData` must keep the same identity between renders. A module-level
 * function such as `listGenres` already does. If it uses props or state,
 * wrap it in useCallback in the caller and list those values as
 * dependencies. Otherwise every render creates a new function, the effect
 * runs again, and the request repeats endlessly.
 */
export function useApiData(fetchData) {
  const [reloadCount, setReloadCount] = useState(0)

  // The result of the most recent request that finished, tagged with the
  // request it belongs to (which fetchData, which reload).
  const [result, setResult] = useState({
    fetchData: null,
    reloadCount: null,
    data: null,
    error: null,
  })

  useEffect(() => {
    // If the component unmounts, or a newer request starts before this one
    // finishes, `ignore` stops this older response from overwriting state.
    let ignore = false

    fetchData()
      .then((data) => {
        if (!ignore) setResult({ fetchData, reloadCount, data, error: null })
      })
      .catch((error) => {
        if (!ignore) setResult({ fetchData, reloadCount, data: null, error })
      })

    return () => {
      ignore = true
    }
  }, [fetchData, reloadCount])

  // Loading means "the last finished result is for an older request, or no
  // request has finished yet". It is worked out on every render rather than
  // kept in its own state, so it can never disagree with `result`.
  const isLoading = result.fetchData !== fetchData || result.reloadCount !== reloadCount

  // Changing reloadCount is what re-runs the effect above.
  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  return {
    data: isLoading ? null : result.data,
    isLoading,
    error: isLoading ? null : result.error,
    reload,
  }
}
