# Reading List — Frontend

React 19 single-page app, built with Vite 8, that talks to the Django API in `../backend`.
For the overall project, see the [root README](../README.md).

> **Status:** feature-complete. Full CRUD for books and genres, filters, client-side and server-side
> validation, and loading, error, empty and not-found states are implemented and verified in the browser.
> There are no automated frontend tests (by decision; see `docs/DEVELOPMENT_NOTES.md`, D52). The checks
> are `npm run lint`, `npm run build`, and the manual checklist in the root README §14.

## Folder layout

```
frontend/
├── index.html            # The single HTML page; loads src/main.jsx
├── public/favicon.svg    # Files copied to the site root as-is
├── src/
│   ├── main.jsx          # Entry point: mounts React, wraps the app in BrowserRouter
│   ├── App.jsx           # Route table only (URL → page component)
│   ├── index.css         # Global design tokens, base styles, buttons, form inputs
│   ├── constants.js      # BOOK_STATUSES, mirrors the backend's Book.Status
│   ├── validation.js     # validateBook(), validateGenre(): client-side checks
│   ├── dates.js          # formatDate(), formatDateTime(), todayIsoDate()
│   ├── pages/            # One component per route. Pages load data and own page state.
│   │   ├── BookListPage.jsx (+ .css)   # "/": list + filters (?status=&genre=)
│   │   ├── BookDetailPage.jsx (+ .css) # "/books/:bookId": details, Edit, Delete
│   │   ├── BookFormPage.jsx            # "/books/new" and "/books/:bookId/edit"
│   │   ├── GenresPage.jsx (+ .css)     # "/genres": add, rename, delete
│   │   └── NotFoundPage.jsx            # any unmatched URL
│   ├── components/       # Reusable UI. Gets data via props; never calls the API.
│   │   ├── Layout.jsx (+ .css)         # Header + <Outlet /> around every page
│   │   ├── NavBar.jsx (+ .css)         # Top navigation (Books, Genres)
│   │   ├── BookCard.jsx (+ .css)       # One book in the list; the whole card is a link
│   │   ├── BookFilters.jsx (+ .css)    # Status / genre dropdowns
│   │   ├── BookForm.jsx (+ .css)       # Create/edit form for a book
│   │   ├── GenreForm.jsx (+ .css)      # Add/rename form for a genre
│   │   ├── GenreListItem.jsx (+ .css)  # One genre row, or its inline edit form
│   │   ├── FormField.jsx (+ .css)      # Label + input + error/hint
│   │   ├── RatingStars.jsx (+ .css)    # ★★★★☆
│   │   ├── StatusBadge.jsx (+ .css)    # Coloured reading-status label
│   │   ├── LoadingSpinner.jsx (+ .css) # Loading state
│   │   ├── ErrorMessage.jsx (+ .css)   # Error state with optional "Try again"
│   │   └── EmptyState.jsx (+ .css)     # "Nothing here" state, with an optional action
│   ├── services/         # The only code that knows API URLs or uses Axios
│   │   ├── apiClient.js  # Axios instance + getErrorMessage(), getFieldErrors(), isNotFound()
│   │   ├── booksApi.js   # listBooks, getBook, createBook, updateBook, deleteBook
│   │   └── genresApi.js  # listGenres, createGenre, updateGenre, deleteGenre
│   └── hooks/
│       ├── useApiData.js   # Load data → { data, isLoading, error, reload }
│       └── useFormState.js # Form values, validation, submit, server errors
├── .env.example          # Template for .env (committed)
├── .env                  # Your values (git-ignored)
├── .npmrc                # Pins the official npm registry for this project
├── .oxlintrc.json        # Linter rules
├── vite.config.js        # Dev server on port 5173 (strict), React plugin
├── package.json          # Dependencies and npm scripts
└── package-lock.json     # Exact installed versions (committed)
```

**Dependency direction:** `pages → components`, `pages → hooks`, `pages → services`.
Components never import services. A component can then be reused anywhere, because it only shows
what it's given.

## Setup

Run from the `frontend/` folder. The project path contains a space, so keep the quotes.

```bash
cd "/path/to/project setup/frontend"
```

**1. Check Node.js.** You need 22.22 or newer (React Router 8 requires it).

```bash
node --version
```

**2. Install dependencies.** This uses `package-lock.json`, and the registry set in `.npmrc`.

```bash
npm install
```

**3. Create your `.env` file.**

```bash
cp .env.example .env
```

**4. Start the dev server.** The backend must also be running (see `../backend/README.md`).

```bash
npm run dev
```

Open <http://localhost:5173/>. You should see the book list. Changes to files in `src/` appear
instantly without a reload; this is Vite's hot module replacement.

## Environment variables

| Variable | Example | Purpose |
| -------- | ------- | ------- |
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000/api` | Where the Django API lives. No trailing slash. |

- **Only `VITE_` variables reach the browser.** Vite exposes only variables starting with `VITE_`, as
  `import.meta.env.VITE_…`.
- **The value is public.** It is copied into the JavaScript that every visitor downloads, so never put
  secrets in a frontend `.env`.
- **Restart after changes.** Vite reads `.env` only when `npm run dev` starts.
- **Missing value.** If the variable is missing, `services/apiClient.js` throws an error that explains
  the fix. The page is blank and the message is in the browser console.

## npm scripts

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Development server with hot reload at <http://localhost:5173/> |
| `npm run lint` | Check the code with oxlint (Rules of Hooks, hook dependency arrays, etc.). Expect `Found 0 warnings and 0 errors.` Warnings don't make the command fail, so read the output. |
| `npm run build` | Production build into `dist/` (git-ignored) |
| `npm run preview` | Serve the production build locally, to check it before deploying |

## Dependencies

| Package | Version | Kind | Why it's here |
| ------- | ------- | ---- | ------------- |
| react, react-dom | 19.3.1 | runtime | UI library, and its renderer for browsers |
| react-router | 8.5.1 | runtime | Maps URLs to page components (`BrowserRouter`, `Routes`, `Link`, …) |
| axios | 1.21.0 | runtime | HTTP client: base URL, JSON handling, and errors for 4xx/5xx statuses |
| vite | 8.3.6 | dev | Dev server and production bundler |
| @vitejs/plugin-react | 6.2.1 | dev | JSX compilation and React hot reload for Vite |
| oxlint | 1.91.0 | dev | Linter (from the Vite template; much faster than ESLint) |
| @types/react, @types/react-dom | 19.3.0 | dev | Type information used by editors for autocomplete in `.jsx` files. Not used at runtime. |

`package.json` lists version *ranges* (`^19.3.1`). `package-lock.json` records the exact versions
installed, and it is committed so every machine gets the same ones.

## Routes

| URL | Page | What it does |
| --- | ---- | ------------ |
| `/` | `BookListPage` | All books. `?status=` and `?genre=` filter the list and are kept in the URL |
| `/books/new` | `BookFormPage` | Empty form; on save, goes to the new book's page |
| `/books/:bookId` | `BookDetailPage` | One book, with Edit and Delete (with a confirmation) |
| `/books/:bookId/edit` | `BookFormPage` | Prefilled form; on save, goes back to the book |
| `/genres` | `GenresPage` | Add a genre; rename or delete genres in place |
| anything else | `NotFoundPage` | "Page not found" |

## How forms work

Both forms (`BookForm`, `GenreForm`) use the `useFormState` hook:

1. Inputs are **controlled**: their value comes from state, and every keystroke updates that state.
2. On submit, `validateBook` / `validateGenre` from `validation.js` run first. If anything fails,
   messages appear under the fields and **no request is sent**.
3. The form calls its `onSubmit` prop. The *page* supplies it and calls the API. The submit button is
   disabled meanwhile, so a double click can't create two records.
4. If the API answers 400, `getFieldErrors()` maps the server's messages onto the matching fields. This
   catches rules only the server can check, such as a duplicate genre name or a genre deleted meanwhile.
5. On success, the page navigates away or resets the form.

The browser's own validation pop-ups are turned off (`noValidate`), so every message appears in the same
place. The `required` and `maxLength` attributes are kept: `maxLength` stops over-long input, and
`required` tells screen readers the field is mandatory.

## Conventions

- **File names:** components and pages use `PascalCase.jsx`; other modules use `camelCase.js`.
- **CSS:**
  - A component's styles live next to it in a file with the same name, and are imported by that component.
  - Class names are prefixed with the component name (`.book-card`, `.book-card__title`), so plain
    global CSS doesn't collide.
  - Shared colours and spacing are CSS variables (`var(--color-primary)`) defined in `index.css`.
- **Code style:** single quotes, no semicolons, matching what the Vite template generated.
