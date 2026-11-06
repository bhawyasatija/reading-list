# Architecture

This document describes **how the Reading List system is structured and why**.
It is updated whenever the architecture changes. For a chronological log of work,
see [DEVELOPMENT_NOTES.md](DEVELOPMENT_NOTES.md).

> **Status:** Phase 7. Every section describes implemented, tested code.

---

## 1. System overview

The system has three parts, each with one responsibility:

| Part         | Responsibility                                              | Runs on                 |
| ------------ | ----------------------------------------------------------- | ----------------------- |
| **Frontend** | Renders the UI, collects user input, calls the API          | Vite dev server `:5173` |
| **Backend**  | Validates data, applies business rules, exposes a REST API  | Django dev server `:8000` |
| **Database** | Stores books and genres durably                             | SQLite file `backend/db.sqlite3` |

The frontend never touches the database directly. All reads and writes go through the API.

## 2. Why the frontend and backend are separate

- **Clear contract.** The only coupling is the HTTP API (URLs + JSON shapes). Either side can be
  rewritten without the other noticing, as long as the contract holds.
- **Independent tooling.** Python dependencies live in a virtual environment; JavaScript dependencies
  live in `node_modules`. Neither ecosystem leaks into the other.
- **Independent running and deployment.** Each side starts in its own terminal and could later be
  deployed separately (e.g. static frontend on a CDN, API on an application server).

The trade-off is that the browser treats `localhost:5173` and `localhost:8000` as different
*origins*, so the backend must explicitly allow cross-origin requests (CORS — see §6).

## 3. Request–response lifecycle

Example: the user submits the "Add a book" form at `/books/new`.

```
BookForm (components/BookForm.jsx)
  │ inputs are controlled: values live in useFormState's state
  │ submit → useFormState.handleSubmit()
  │   1. event.preventDefault()            no full-page reload
  │   2. validateBook(values)              errors? show under fields, STOP (no request)
  │   3. toBookPayload(values)             strings → numbers/null; rating cleared unless finished
  ▼
BookFormPage.handleSubmit(payload)        (pages/BookFormPage.jsx)
  ▼
createBook(payload)                       (services/booksApi.js)
  ▼
apiClient.post('/books/', payload)        (services/apiClient.js: Axios, baseURL from VITE_API_BASE_URL)
  │ browser first sends OPTIONS (CORS preflight), because this is a cross-origin JSON POST
  ▼
HTTP  POST http://127.0.0.1:8000/api/books/   Content-Type: application/json
  ▼
Django middleware: CorsMiddleware (adds Access-Control-Allow-Origin) → Security → … → CSRF → Auth
  ▼
config/urls.py "api/" → apps/library/urls.py (DefaultRouter) → BookViewSet, action "create"
  ▼
ModelViewSet.create() → BookSerializer(data=request.data).is_valid(raise_exception=True)
  │   field checks (required, max_length, choices, genre exists, rating 1–5, date not future)
  │   then BookSerializer.validate()  (rating/finished date only when finished)
  │   invalid → 400 {"field": ["message"]}
  ▼
serializer.save() → Book.objects.create(...)  → INSERT INTO library_book …  (CHECK constraints apply)
  ▼
201 Created + BookSerializer(book).data  (includes id and genre_name)
  ▼
back in the browser:
  success → BookFormPage navigates to /books/<new id> → BookDetailPage loads it with getBook()
  400     → the Promise rejects → useFormState catches it → getFieldErrors() → messages under the fields
  other   → getErrorMessage() → one message at the top of the form
```

## 4. Backend design

- **Project vs app.** `backend/config/` is the Django *project*: settings, root URLs, WSGI/ASGI entry
  points. It contains no business logic. `backend/apps/library/` is a Django *app*: the models,
  serializers, views, admin, and tests for books and genres.
- **One app, not two.** `Book` and `Genre` are tightly related and always change together. Splitting them
  into separate apps would add cross-app imports without real separation. The `apps/` package leaves
  room for future apps (e.g. `accounts`).
- **Layers inside the app** _(implemented)_:
  - `models.py`: data shape, field validators, and database constraints.
  - `serializers.py`: conversion between JSON and model instances, plus input validation.
  - `views.py`: HTTP concerns such as which queryset and serializer to use, filtering, and error mapping.
    Both ViewSets extend `ModelViewSet` and override only `perform_destroy` (genres) or `get_queryset` (books).
  - `exceptions.py`: `GenreInUse`, a DRF `APIException` with status 409.
  - `urls.py`: a DRF `DefaultRouter` that maps URLs to the ViewSets.
  - `admin.py`: Django Admin list pages with filters and search.
- **Validation in three layers.** Each layer has its own job:

  | Layer | Where | Job |
  | ----- | ----- | --- |
  | Field validators | `models.py` field `validators=[...]` | Single-field rules (rating 1–5, date not in future), written once and reused by both the admin forms and the DRF serializers |
  | Database constraints | `models.py` `Meta.constraints` | The final guarantee: the database rejects bad rows from any code path. The admin also turns them into form errors |
  | Serializer validation | `serializers.py` `validate_name()`, `validate()` | Friendly per-field API errors for cross-field and uniqueness rules, so they never reach the database as a 500 |

  The cross-field rule is written twice, once as a `CheckConstraint` and once in `BookSerializer.validate()`.
  This is deliberate: DRF doesn't check `CheckConstraint`s, and the database can't produce per-field API messages.
- **Filtering without a library.** `BookViewSet._apply_filters()` reads `?status=` and `?genre=` by hand,
  in about 20 lines. `django-filter` would replace that, at the cost of another dependency and more framework
  to learn. It's worth adopting if filters multiply.
- **Query efficiency.** `BookViewSet` uses `select_related("genre")`, so a list of N books is one SQL
  query rather than N+1 (needed because each book's `genre_name` is serialized).
- **Configuration** _(implemented)_:
  - **Where values come from.** Secrets and environment-specific values (`SECRET_KEY`, `DEBUG`,
    allowed hosts, CORS origins) are read from environment variables. `config/settings.py` calls
    `load_dotenv(BASE_DIR / ".env")` first, so in development they come from `backend/.env`.
    Variables already set in the real environment take priority over the file.
  - **Parsing.** Two small helpers in `settings.py`, `env_bool()` and `env_list()`, convert the raw
    strings into a boolean and a list. Without them, every setting would repeat the same parsing code.
  - **Safe defaults.** A missing `DJANGO_SECRET_KEY` raises `ImproperlyConfigured` with instructions
    rather than falling back to a key stored in git. `DEBUG` defaults to `False`.
  - **Middleware order.** `corsheaders.middleware.CorsMiddleware` is first in `MIDDLEWARE`, so CORS
    headers are added even to responses produced early in the stack (for example the 400 response to
    a disallowed `Host` header). Phase 3 testing confirmed this.

## 5. Data model

```
Genre 1 ──── N Book
```

| Model | Field         | Type                          | Notes |
| ----- | ------------- | ----------------------------- | ----- |
| Genre | `id`          | auto primary key              | |
|       | `name`        | CharField(50)                 | Unique ignoring case, via `UniqueConstraint(Lower("name"))`; plain `unique=True` would allow "Fantasy" and "fantasy" |
|       | `description` | TextField, optional           | |
|       | `created_at`  | DateTimeField, auto           | |
| Book  | `id`          | auto primary key              | |
|       | `title`       | CharField(200)                | Required |
|       | `author`      | CharField(120)                | Required |
|       | `genre`       | ForeignKey → Genre, `PROTECT` | A genre in use cannot be deleted |
|       | `status`      | CharField with choices        | `want_to_read`, `reading`, `finished` |
|       | `rating`      | PositiveSmallIntegerField, nullable | 1–5, only allowed when status is `finished` |
|       | `finished_on` | DateField, nullable           | Cannot be in the future; only allowed when status is `finished` |
|       | `notes`       | TextField, optional           | |
|       | `created_at`  | DateTimeField, auto           | |
|       | `updated_at`  | DateTimeField, auto           | |

**Default ordering:** genres alphabetically by `name`; books by `-updated_at`, most recently changed first.

**Why `on_delete=PROTECT`:** deleting a genre should never silently delete or orphan books.
`GenreViewSet.perform_destroy()` catches the resulting `ProtectedError` and raises `GenreInUse`,
which DRF returns as **409 Conflict** with an explanatory message.

**PostgreSQL compatibility:** only standard field types and ORM queries are used, so switching
databases is a settings change, not a model change.

## 6. Cross-origin requests (CORS)

During development the React app (`:5173`) calls the API (`:8000`). Browsers block such cross-origin
requests unless the server responds with permission headers. `django-cors-headers` adds them for the
origins listed in the `CORS_ALLOWED_ORIGINS` environment variable — nothing is hard-coded, and
wildcard origins are not used.

Alternative considered: a Vite dev-server proxy, which avoids CORS in development. Rejected because
the real deployment would still need CORS configured, and configuring it explicitly is more instructive.

## 7. Frontend design

| Folder        | Contains                                         | Rule |
| ------------- | ------------------------------------------------ | ---- |
| `pages/`      | One component per route (list, detail, form, genres, 404) | Owns data fetching and page-level state |
| `components/` | Reusable presentational pieces (card, form, badges, spinner, error, empty state) | Receives data via props; no direct API calls |
| `services/`   | Axios instance + one module per resource         | The only place that knows URLs |
| `hooks/`      | Reusable stateful logic (data loading)           | No JSX |
| `App.jsx`     | Route table only                                 | |
| `main.jsx`    | Mounts React and the router into the DOM         | |

### 7.1 Component tree

```
main.jsx
└─ <StrictMode>
   └─ <BrowserRouter>                  URL ⇄ UI synchronisation
      └─ <App>                          route table
         └─ <Route element={<Layout/>}> no path: wraps every page
            ├─ <NavBar/>                rendered by Layout (Books, Genres)
            └─ <Outlet/>                Layout's slot for the matched child route:
               │
               ├─ index → <BookListPage/>
               │    ├─ useSearchParams()                   status, genre from the URL
               │    ├─ useApiData(loadBooks)               loadBooks = useCallback(listBooks({status, genre}))
               │    ├─ useApiData(listGenres)              for the genre dropdown
               │    ├─ <BookFilters status genre genres onChange onClear/>
               │    └─ one of: <LoadingSpinner/> | <ErrorMessage onRetry/> | <EmptyState/>
               │               | <BookCard book/> × N  →  <StatusBadge/>, <RatingStars/>
               │
               ├─ books/new, books/:bookId/edit → <BookFormPage/>
               │    ├─ useApiData(listGenres), useApiData(loadBook)
               │    └─ <BookForm book genres submitLabel onSubmit onCancel/>
               │         ├─ useFormState(values, validateBook, submit)
               │         └─ <FormField/> × 7 (each wraps one input/select/textarea)
               │
               ├─ books/:bookId → <BookDetailPage/>
               │    ├─ useApiData(loadBook)
               │    └─ <StatusBadge/>, <RatingStars/>, Edit link, Delete button
               │
               ├─ genres → <GenresPage/>
               │    ├─ useApiData(listGenres); state: editingId, createFormKey, actionError
               │    ├─ <GenreForm key={createFormKey} onSubmit={handleCreate}/>
               │    └─ <GenreListItem genre isEditing onEdit onCancelEdit onSave onDelete/> × N
               │         └─ when isEditing: <GenreForm genre onSubmit={onSave} onCancel/>
               │
               └─ *     → <NotFoundPage/> → <EmptyState> with a link home
```

**Data flows down, events flow up.** Pages hold data and pass it to components as props. Components
report user actions back through callback props such as `onRetry`.

### 7.2 Service layer

- **`apiClient.js`** creates one Axios instance:
  - `baseURL` comes from `VITE_API_BASE_URL`, and the app fails fast if it is missing.
  - There is a 10-second timeout and an `Accept: application/json` header.
  - It also exports `getErrorMessage(error)`, which turns the three kinds of Axios failure into one
    sentence for the user: the server answered with an error; there was no answer (backend down, CORS
    problem, timeout); or the request was never sent.
- **`booksApi.js` and `genresApi.js`** contain one async function per endpoint.
  - Each function returns `response.data`.
  - Errors are not caught there. They reach the page, which decides how to show them.
  - `listBooks(filters)` drops empty filter values, so the URL never contains `?genre=`.
- **Edit forms use PUT.** The form always sends every field, so "replace the resource" is the accurate method.

### 7.3 Data loading: `useApiData(fetchData)`

The hook returns `{ data, isLoading, error, reload }`, and exactly one of loading, error or data applies at a time.

- **A race guard.** An `ignore` flag in the effect's cleanup discards a response that arrives after the
  component unmounted or after a newer request started.
- **`isLoading` is derived, not stored.** The hook keeps the last finished result together with the
  request it belongs to. If that isn't the current request, the hook is loading.
  - This came from a lint warning (`react(set-state-in-effect)`, problem P11). Calling
    `setIsLoading(true)` at the start of the effect triggered an extra render.
  - Deriving the flag also means it can never disagree with the data.
- **`fetchData` must be stable.** Pass a module-level function, or one wrapped in `useCallback`;
  otherwise the request repeats on every render. The `react/exhaustive-deps` lint rule helps catch mistakes.
- **Alternatives considered:**
  - React 19's `use()` with Suspense: more concepts to learn (Suspense boundaries, caching promises).
  - A data library such as TanStack Query: caching and retries, at the cost of another dependency and
    abstraction. That is overkill for a handful of requests.

### 7.4 Routing mode

React Router 8 is used in **declarative mode**: `<BrowserRouter>`, `<Routes>`, `<Route>`, all imported
from `react-router`.
- **Not data mode.** Data mode (`createBrowserRouter`, with `loader`/`action` functions) moves fetching
  into the router. It is powerful, but it adds a second way of loading data next to the service layer
  and hook.
- **Easy to read.** Declarative mode keeps routing as "URL → component", which is easy to trace.

### 7.5 Styling

- **Where styles live.** `index.css` holds the design tokens (CSS variables for colours, spacing and
  radius, with a dark theme via `prefers-color-scheme`), base element styles, `.container`, `.page-header`
  and `.button`.
- **Per-component files.** Each component imports a CSS file with the same name. Its class names start
  with the component name (`.book-card__title`) to avoid collisions, since plain CSS is global.
- **Import order matters.** `main.jsx` imports `index.css` before `App`. CSS is applied in import order,
  so component rules come later and win over global rules of equal specificity (problem P12).
- **Accessibility.**
  - `role="status"` on the spinner and `role="alert"` on errors.
  - Visible `:focus-visible` outlines for keyboard users.
  - `prefers-reduced-motion` stops the spinner animation.
  - Rating stars have an `aria-label`.

### 7.6 Forms

- **One hook for both forms.** `hooks/useFormState.js` holds the values, field errors, a form-level
  message and `isSubmitting`. It provides `handleSubmit`, plus `fieldProps(name)` to spread onto each input.
- **Controlled inputs.** Each input's `value` comes from state and `onChange` updates it.
- **The submit sequence:** client validation, then the `onSubmit` prop, then any server errors. If the
  `onSubmit` promise rejects, the hook maps a 400 response onto the fields with `getFieldErrors()`;
  anything else becomes one message.
- **Separation of concerns:**
  - The **form component** knows the fields and how to convert values (`toFormValues`, `toBookPayload`).
  - The **page** knows which API function to call and where to navigate afterwards.
  - So `BookForm` serves both create and edit, and `GenreForm` serves both add and inline rename.
- **Two validation layers.** `validation.js` repeats the backend's simple rules, so mistakes show
  instantly without a request. The backend stays authoritative: some rules only it can check (duplicate
  names, a genre deleted meanwhile), and it can't trust the browser.
- **Hiding fields the rules don't allow.** Rating and Finished on are only shown when the status is
  *Finished*, and `toBookPayload` sends `null` for them otherwise. The "only finished books" rule
  therefore can't be broken from the UI, but the server still enforces it for other clients.
- **Accessibility.**
  - `aria-invalid` drives both the red border (CSS attribute selector) and the screen-reader state.
  - `aria-describedby` links each input to its error message.
  - `useId()` keeps element ids unique when several forms are on one page.
- **Resetting a form.** After adding a genre, `GenresPage` increments the form's `key`, so React mounts
  a fresh, empty `GenreForm`. No "reset" code is needed.

### 7.7 State that lives in the URL

- **List filters.** These live in the query string (`useSearchParams`), not in `useState`. A filtered
  view survives a refresh and can be bookmarked. Filter changes use `{ replace: true }`, so Back leaves
  the page instead of undoing filters one by one.
- **The record being viewed.** It comes from the path (`useParams()` → `bookId`).
- **After deleting a book**, the app calls `navigate('/', { replace: true })`. The deleted book's URL is
  removed from history, so Back can't land on a "not found" page.

### 7.8 Known limitations (accepted for v1)

- **Data is refetched on every page.** The genre list is loaded on each page that needs it, with no cache
  between pages; a genre added in another tab appears after navigating. A cache such as TanStack Query
  would fix this, at the cost of a dependency (see README *Future improvements*).
- **Confirmations use `window.confirm`.** It's simple and accessible, but it can't be styled.
- **"Today" can differ by time zone.** The client treats "today" in the user's time zone, the server in
  UTC (`TIME_ZONE = "UTC"`). Near midnight, a date accepted by the browser can be rejected by the server.
  The server's message then appears under the field, so the user isn't stuck.
- **Case-insensitive names only cover A–Z on SQLite.** SQLite's `LOWER()` and `iexact` ignore non-ASCII
  letters, so "Émile" and "émile" are accepted as two genres. The serializer and the constraint agree, so
  this never causes an error. PostgreSQL's `LOWER()` handles all letters correctly. Verified in Phase 7.
- **Two identical genres submitted at the same instant.** Both can pass `validate_name()` before either
  is saved. The database constraint then rejects the second with an `IntegrityError`, which becomes a 500
  rather than a 400. It's very unlikely for a single-user app, and the data stays correct.
- **PUT keeps optional fields that are left out** (DRF behaviour; see `backend/README.md`). The frontend
  always sends every field, so this doesn't affect the UI.

## 8. Error-handling strategy

| Situation                  | Backend response                    | Frontend behaviour | Code |
| -------------------------- | ----------------------------------- | ------------------ | ---- |
| Invalid form input caught in the browser | (no request sent)      | Messages under the fields, plus "Please correct the highlighted fields." | `validation.js`, `useFormState` |
| Invalid form input caught by the server | 400 `{field: [messages]}` | Same display as above | `getFieldErrors()` in `useFormState` |
| Bad `?status=` / `?genre=` in the URL | 400 `{field: [messages]}` | The server's message in an `ErrorMessage` on the list | `getErrorMessage()` |
| Unknown or non-numeric book id | 404 `{detail: "..."}`        | "Book not found" with a link back | `isNotFound()` in the detail and form pages |
| Delete a genre that's in use | 409 `{detail: "..."}`             | The message above the genre list; the genre stays | `GenresPage.handleDelete` |
| Delete a book fails        | any                                 | Message below the page header; the button re-enables | `BookDetailPage.handleDelete` |
| Backend unreachable / timeout | (no response)                    | "Cannot reach the server…" plus **Try again** | `getErrorMessage()`, `useApiData.reload` |
| 400 whose body is HTML, not JSON (e.g. a `Host` not in `ALLOWED_HOSTS`) | 400 HTML page | Generic "Some of the information is invalid…" | `getErrorMessage()`; `isPlainObject` guard added in Phase 7 |
| A bug in our own code (not an HTTP error) | —                    | `error.message`; the full error and stack trace are logged with `console.error` | `getErrorMessage()` |
| Unknown frontend URL       | —                                   | "Page not found" | `NotFoundPage` (`path="*"`) |

## 9. Explicitly out of scope (for now)

Authentication, pagination, text search, file uploads, production deployment.
These are listed under *Future improvements* in the root README.
