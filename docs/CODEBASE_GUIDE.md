# Codebase Guide

An onboarding walkthrough of the Reading List codebase, written as a senior engineer would brief a new
team member. The goal: after working through it, you can explain every part of this project, trace any
request through it, and change it without help.

**How to use this guide**

- Read it with the code open beside it. Every `file#L123` link points at the exact line being discussed.
- **Sections A–C** explain the architecture and each file.
- **Section D** follows one real feature from click to database and back.
- **Sections E–F** cover the database and the language and framework concepts, as they appear in *this* code.
- **Section G** has exercises. They contain **requirements only**: try each one before asking for a solution.
- Other documents answer other questions:

  | Question | Document |
  | -------- | -------- |
  | *How do I run it?* | [README.md](../README.md) |
  | *Why was it designed this way?* | [ARCHITECTURE.md](ARCHITECTURE.md) |
  | *What happened when?* | [DEVELOPMENT_NOTES.md](DEVELOPMENT_NOTES.md), where decisions are numbered D1–D56 and problems P1–P24 |

---

## Contents

- [A. Architecture](#a-architecture)
- [B. Backend deep dive](#b-backend-deep-dive)
- [C. Frontend deep dive](#c-frontend-deep-dive)
- [D. End-to-end: adding a book](#d-end-to-end-adding-a-book)
- [E. The database](#e-the-database)
- [F. Important technical concepts](#f-important-technical-concepts)
- [G. Modification exercises](#g-modification-exercises)

---

## A. Architecture

### A1. The big picture

```
┌──────────────────────────── Browser ────────────────────────────┐
│  React app (JavaScript), served by Vite at http://localhost:5173 │
│   pages/ → hooks/ → services/ (Axios)                           │
└───────────────────────────────┬──────────────────────────────────┘
                                │  HTTP + JSON   (cross-origin → CORS)
┌───────────────────────────────▼──────────────────────────────────┐
│  Django + DRF (Python), runserver at http://127.0.0.1:8000       │
│   middleware → config/urls.py → library/urls.py → ViewSet        │
│   → Serializer (validation) → Model (ORM)                         │
└───────────────────────────────┬──────────────────────────────────┘
                                │  SQL
                        ┌───────▼────────┐
                        │ SQLite file    │
                        │ db.sqlite3     │
                        └────────────────┘
```

There are **two programs** (the Vite dev server and Django) and **one data file**. Each one can be started,
stopped and tested without the others.

### A2. Why Django and React are separated

Django *can* render HTML pages itself, using templates. This project uses Django only as an **API** (it
returns JSON), and lets React draw the UI in the browser. The trade-offs:

| Benefit | Cost |
| ------- | ---- |
| **A clear contract.** The two sides share nothing but URLs and JSON shapes (README §13), so either side can be rewritten while the contract holds | **Two toolchains** (pip/venv and npm/node), and two servers to run |
| **An interactive UI.** React updates parts of the page without reloading it | **CORS** has to be configured, because the two run on different origins |
| **One API, many clients.** The same API could serve a mobile app or a script | **Duplicated rules.** Some validation is written twice, once in `validation.js` and once in the serializer (D39) |

### A3. How the two communicate

- **The transport** is plain HTTP. The frontend sends methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
  to URLs under `/api/`, and bodies are JSON. The backend answers with a **status code** and a JSON body.
- **Who talks to whom:**
  - **Only** the files in `frontend/src/services/` know URLs.
  - They use one configured Axios instance, [`apiClient`](../frontend/src/services/apiClient.js#L16), whose
    `baseURL` comes from `VITE_API_BASE_URL` in `frontend/.env`.
- **The two origins.** The page comes from `http://localhost:5173` and the API lives at
  `http://127.0.0.1:8000`. A different host or port counts as a different *origin*, so the browser
  blocks the responses unless Django says otherwise. That permission comes from `django-cors-headers`
  (see [B6](#b6-cors)).
- **The status code carries meaning:**

  | Code | Meaning in this app |
  | ---- | ------------------- |
  | 200 | OK |
  | 201 | Created |
  | 204 | Deleted (no body) |
  | 400 | Your data is invalid; the body says which fields |
  | 404 | No such record |
  | 409 | Conflict: a genre still in use |

### A4. The role of the database

- **It holds the state.** The database is the only place data survives. If you restart both servers,
  every book is still there.
- **Each layer has its own job:**
  - **Django models** describe the tables in Python.
  - **Migrations** create and alter the tables.
  - **The ORM** turns Python method calls into SQL.
- **The last line of defence.** The database also enforces three **constraints**, which reject bad data
  even when the Python checks are skipped (see [E](#e-the-database)).

### A5. The request–response lifecycle in one paragraph

> A user action in a **page** component calls a function in **services/** (e.g. `createBook`) → Axios
> sends an HTTP request → Django's **middleware** runs (CORS headers, security, sessions…) →
> **`config/urls.py`** matches `api/` and hands over to **`apps/library/urls.py`** → the DRF **router**
> picks the **ViewSet** and action (`BookViewSet.create`) → the **serializer** turns JSON into validated
> Python data → the **ORM** runs `INSERT` → the serializer turns the saved model back into JSON →
> Django returns `201` → Axios resolves the Promise → the page updates state or navigates → React
> re-renders.

[Section D](#d-end-to-end-adding-a-book) walks through this with the real code at every step.

---

## B. Backend deep dive

### B1. Django *project* vs Django *app*

| | Project: `backend/config/` | App: `backend/apps/library/` |
| - | --------------------------- | ----------------------------- |
| What | Settings, the root URL table, server entry points | One feature area: models, API, admin, tests |
| How many | Exactly one per site | Any number; each is pluggable |
| Created by | `django-admin startproject config .` | `python manage.py startapp library apps/library` |
| Contains business logic? | **No** | **Yes** |

The project *installs* apps by listing them in
[`INSTALLED_APPS`](../backend/config/settings.py#L59). This project has one app of its own (D4). Book and
Genre always change together, so splitting them would only add imports between apps. The `apps/` folder
leaves room for, say, an `accounts` app later.

### B2. File by file

Each important file is described the same way: **why it exists**, **what it contains**, **what depends on
it**, and **what happens if you change it**.

#### `backend/manage.py`
- **Why:** the command-line entry point (`runserver`, `migrate`, `test`, `shell`…).
- **Contains:** generated code that sets `DJANGO_SETTINGS_MODULE=config.settings`, then runs the command.
- **Depends on:** `config/settings.py`.
- **If changed:** you rarely edit it. Pointing it at another settings module changes every command.

#### `backend/config/settings.py`
- **Why:** all configuration in one place.
- **Contains:**
  - [`load_dotenv`](../backend/config/settings.py#L23) copies `backend/.env` into environment variables
    first, so settings can read them.
  - [`env_bool`](../backend/config/settings.py#L26) and [`env_list`](../backend/config/settings.py#L34)
    are small helpers that turn the text values into a boolean and a list.
  - [`SECRET_KEY`](../backend/config/settings.py#L44) comes from the environment. If it's missing, startup
    **fails on purpose** with a message saying what to do (D12).
  - [`DEBUG`](../backend/config/settings.py#L52) defaults to `False`, and
    [`ALLOWED_HOSTS`](../backend/config/settings.py#L54) is read from `.env`.
  - [`INSTALLED_APPS`](../backend/config/settings.py#L59) lists Django's built-ins, then `rest_framework`
    and `corsheaders`, then our `apps.library`.
  - [`MIDDLEWARE`](../backend/config/settings.py#L74), with `CorsMiddleware` first (see [B5](#b5-middleware)).
  - [`DATABASES`](../backend/config/settings.py#L113) points at SQLite, in the file `db.sqlite3`.
  - [`REST_FRAMEWORK`](../backend/config/settings.py#L148) makes `AllowAny` explicit: there is no login (D22).
  - [`CORS_ALLOWED_ORIGINS`](../backend/config/settings.py#L159) is read from `.env`.
- **Depends on:** `backend/.env` and the installed packages.
- **Used by:** everything. Django imports it before anything else runs.
- **If changed:**
  - Removing an app from `INSTALLED_APPS` makes its models and migrations disappear.
  - Reordering `MIDDLEWARE` can break CORS.
  - Switching `DATABASES` to PostgreSQL needs no model changes.
  - Restart `runserver` after changing `.env`. Changing `settings.py` itself triggers an auto-reload.

#### `backend/config/urls.py`
- **Why:** Django's first stop when a request arrives (`ROOT_URLCONF = "config.urls"`).
- **Contains:** two prefixes only: [`admin/`](../backend/config/urls.py#L12) and
  [`api/`](../backend/config/urls.py#L13), which hands over with `include("apps.library.urls")`.
- **If changed:** renaming `api/` to `api/v1/` moves every endpoint. The frontend then needs
  `VITE_API_BASE_URL` updated, though no frontend code changes. The tests keep passing, because they build
  URLs with `reverse()` and the router names.

#### `backend/config/wsgi.py` and `asgi.py`
Entry points for production servers such as Gunicorn (WSGI) or Uvicorn (ASGI). `runserver` doesn't use
them, which is why test coverage shows them as 0% (that's expected).

#### `backend/apps/library/apps.py`
- **Why:** tells Django the app's import path.
- **Contains:** [`LibraryConfig`](../backend/apps/library/apps.py#L4), with `name = "apps.library"`.
  Django derives the short **label** `library` from that, which is why tables are called `library_book`
  and migrations refer to `library`.
- **If changed:** changing the name or label breaks the existing migrations and table names.

#### `backend/apps/library/models.py`
- **Why:** the single source of truth for the data's shape.
- **Contains:**
  - [`validate_not_in_future`](../backend/apps/library/models.py#L23): a field validator that is reused
    automatically by both the admin and DRF.
  - [`Genre`](../backend/apps/library/models.py#L29): `name`, `description`, `created_at`. Its
    `Meta.ordering = ["name"]` sorts genres alphabetically. A
    [`UniqueConstraint(Lower("name"))`](../backend/apps/library/models.py#L41) makes names unique
    ignoring case.
  - [`Book`](../backend/apps/library/models.py#L52):
    - [`Status`](../backend/apps/library/models.py#L55), a `TextChoices` enum
    - the `genre` foreign key with [`on_delete=models.PROTECT`](../backend/apps/library/models.py#L67)
      and [`related_name="books"`](../backend/apps/library/models.py#L69)
    - `rating`, with [1–5 validators](../backend/apps/library/models.py#L79)
    - `finished_on`, with the [future-date validator](../backend/apps/library/models.py#L85)
    - `notes`, and the timestamps
    - `Meta`: [ordering by `-updated_at`](../backend/apps/library/models.py#L94) and two
      [`CheckConstraint`s](../backend/apps/library/models.py#L96) ("only finished books")
- **Used by:** serializers, views, admin, migrations, tests, fixtures.
- **If changed:** you **must** run `makemigrations` and then `migrate`, otherwise the database and the
  code disagree (`no such column`). Adding a field also means updating the serializer's `fields` list
  before the API exposes it.

#### `backend/apps/library/migrations/0001_initial.py`
- **Why:** a recorded, replayable instruction to build the tables.
- **Contains:** `CreateModel` operations for both models, including their constraints. It was generated
  by `makemigrations`.
- **If changed:** never hand-edit a migration that has already been applied. Make a new one instead.
  Deleting migrations breaks every existing database built from them.

#### `backend/apps/library/serializers.py`
- **Why:** the boundary between JSON and Python. It does **validation** on the way in and
  **representation** on the way out.
- **Contains:**
  - [`GenreSerializer`](../backend/apps/library/serializers.py#L18), whose
    [`validate_name`](../backend/apps/library/serializers.py#L24) gives the friendly duplicate check.
  - [`BookSerializer`](../backend/apps/library/serializers.py#L35):
    - `genre_name`, a read-only extra field
    - [`extra_kwargs`](../backend/apps/library/serializers.py#L56), which supplies a readable
      "genre no longer exists" message (D46)
    - [`validate`](../backend/apps/library/serializers.py#L67), the cross-field rule
    - [`_current_value`](../backend/apps/library/serializers.py#L87), which makes that rule work for PATCH (P7)
- **Depends on:** `models.py`. `ModelSerializer` generates most fields from it (`max_length`, choices, validators).
- **Used by:** `views.py`, through `serializer_class`.
- **If changed:** this file *is* the API contract. Renaming a field breaks the frontend. Removing a
  check lets bad data reach the database, which then raises `IntegrityError`, a 500 error.

#### `backend/apps/library/views.py`
- **Why:** HTTP behaviour: which records, which serializer, and how errors map to status codes.
- **Contains:**
  - [`GenreViewSet`](../backend/apps/library/views.py#L25). It only overrides
    [`perform_destroy`](../backend/apps/library/views.py#L29), to turn `ProtectedError` into a 409.
  - [`BookViewSet`](../backend/apps/library/views.py#L43). It overrides
    [`get_queryset`](../backend/apps/library/views.py#L46), which uses
    [`select_related("genre")`](../backend/apps/library/views.py#L49), and adds
    [`_apply_filters`](../backend/apps/library/views.py#L54) for `?status=` and `?genre=`.
  - Everything else (`list`, `create`, `retrieve`, `update`, `partial_update`, `destroy`) is inherited
    from DRF's `ModelViewSet`.
- **If changed:** removing `select_related` causes the "N+1 queries" problem: the list goes from 1 query
  to 1 + N, and `test_list_uses_one_query_however_many_books` fails (D51).

#### `backend/apps/library/exceptions.py`
- **Contains:** [`GenreInUse`](../backend/apps/library/exceptions.py#L5), an `APIException` with
  `status_code = 409`. Raising it anywhere in a view produces `{"detail": "..."}` with status 409,
  handled by DRF's standard exception handling.

#### `backend/apps/library/urls.py`
- **Contains:** a `DefaultRouter` with [`books`](../backend/apps/library/urls.py#L10) and
  [`genres`](../backend/apps/library/urls.py#L11) registered.
- **What the router generates:**
  - for each resource, a *list* URL (`books/`) and a *detail* URL (`books/<pk>/`)
  - URL names such as `book-list` and `book-detail`
  - the `/api/` index page
- **Why `basename="book"`:** `BookViewSet` has no `queryset` attribute (it uses `get_queryset()`), so the
  router can't work out the name prefix by itself.

#### `backend/apps/library/admin.py`
- **Contains:** the [`GenreAdmin`](../backend/apps/library/admin.py#L7) and
  [`BookAdmin`](../backend/apps/library/admin.py#L13) list pages, with filters and search.
- **Used by:** `/admin/` only.
- **Note:** the admin validates with the *model* (field validators and constraints), not with the
  serializer. That's why the database constraints matter (D15).

#### `backend/apps/library/fixtures/sample_data.json` and `tests/`
- **The fixture** holds the demo data for `loaddata sample_data`. Rows have fixed primary keys, so loading
  it again overwrites them instead of duplicating them.
- **The tests** are 57 of them, one module per area. See README §14.

### B3. The Django ORM, using our real queries

The ORM turns method calls on a model's **manager** (`Book.objects`) into SQL. **QuerySets are lazy**:
building one runs nothing; iterating, slicing or `len()` on it runs the query.

| Python in this codebase | Where | SQL it produces (abridged) |
| ----------------------- | ----- | -------------------------- |
| `Genre.objects.all()` | `GenreViewSet.queryset` | `SELECT … FROM library_genre ORDER BY name` (ordering from `Meta`) |
| `Book.objects.select_related("genre")` | `get_queryset` | `SELECT book.*, genre.* FROM library_book INNER JOIN library_genre … ORDER BY updated_at DESC` |
| `.filter(status=status)` | `_apply_filters` | `… WHERE status = 'finished'` |
| `.filter(genre_id=int(genre))` | `_apply_filters` | `… WHERE genre_id = 2` |
| `Genre.objects.filter(name__iexact=value).exclude(pk=…).exists()` | `validate_name` | `SELECT 1 AS "a" FROM library_genre WHERE (name LIKE 'fantasy' ESCAPE '\' AND NOT (id = 1)) LIMIT 1`. On SQLite, `iexact` becomes `LIKE`, which is case-insensitive for A–Z only (P20) |
| `instance.delete()` on a genre with books | `perform_destroy` | `SELECT … FROM library_book WHERE genre_id = …` to find related rows. Some are found, so `ProtectedError` is raised and **no `DELETE` is ever sent** |
| `serializer.save()` → `Book.objects.create(...)` | DRF | `INSERT INTO library_book (…) VALUES (…) RETURNING id` |

This is the real SQL captured for `GET /api/books/?status=finished`. It's a single query, thanks to
`select_related`:

```sql
SELECT "library_book"."id", "library_book"."title", … , "library_genre"."id", "library_genre"."name", …
FROM "library_book"
INNER JOIN "library_genre" ON ("library_book"."genre_id" = "library_genre"."id")
WHERE "library_book"."status" = 'finished'
ORDER BY "library_book"."updated_at" DESC
```

To see SQL yourself, run `python manage.py shell` and then:

```python
from apps.library.models import Book
print(Book.objects.select_related("genre").filter(status="finished").query)
```

### B4. Django REST Framework (DRF)

DRF adds four building blocks on top of Django:

| Piece | Our code | Job |
| ----- | -------- | --- |
| **Serializer** | `BookSerializer`, `GenreSerializer` | Validate incoming JSON; turn models into JSON |
| **ViewSet** | `BookViewSet`, `GenreViewSet` | Group the CRUD actions for one resource |
| **Router** | `DefaultRouter` in `urls.py` | Generate the URLs, and map HTTP methods to ViewSet actions |
| **Exceptions** | `ValidationError`, `NotFound`, our `GenreInUse` | Raised anywhere, converted to a JSON error with the right status |

How the router maps requests to `ModelViewSet` actions:

| Method + URL | Action | Inherited from |
| ------------ | ------ | -------------- |
| `GET /books/` | `list` | `ListModelMixin` |
| `POST /books/` | `create` | `CreateModelMixin` |
| `GET /books/7/` | `retrieve` | `RetrieveModelMixin` |
| `PUT /books/7/` | `update` | `UpdateModelMixin` |
| `PATCH /books/7/` | `partial_update` | `UpdateModelMixin` (with `partial=True`) |
| `DELETE /books/7/` | `destroy` | `DestroyModelMixin` |

**Hooks, not rewrites.** DRF's actions call small methods you can override:
- `get_queryset()` decides **which records**.
- `perform_create()`, `perform_update()` and `perform_destroy()` decide **how to save or delete**.

We override `get_queryset` and `perform_destroy` and inherit everything else. That's why `views.py` is
short.

**The browsable API.** Opening <http://127.0.0.1:8000/api/books/> in a browser shows DRF's HTML view of the
same endpoint, with forms. It's very useful when exploring the API.

### B5. Middleware

Middleware are layers that **every** request passes through on the way in, and every response on the way
out, in the order of [`MIDDLEWARE`](../backend/config/settings.py#L74):

| # | Middleware | What it does here |
| - | ---------- | ----------------- |
| 1 | `corsheaders…CorsMiddleware` | Answers CORS preflights; adds `Access-Control-Allow-Origin` for allowed origins |
| 2 | `SecurityMiddleware` | Security headers (more of them in production) |
| 3 | `SessionMiddleware` | Cookie sessions, used by the admin login |
| 4 | `CommonMiddleware` | `APPEND_SLASH`: redirects `GET /api/books` to `/api/books/` (P9) |
| 5 | `CsrfViewMiddleware` | CSRF protection for forms (DRF exempts its views and handles CSRF itself) |
| 6 | `AuthenticationMiddleware` | Sets `request.user` (anonymous for our API calls) |
| 7 | `MessageMiddleware` | One-off messages in the admin ("Book added") |
| 8 | `XFrameOptionsMiddleware` | Stops other sites from putting our pages in an `<iframe>` |

**Why CORS comes first:** a middleware that returns a response early (such as `CommonMiddleware`'s
redirect) would otherwise send it without CORS headers, and the browser would hide it from the app.
Phase 3 confirmed that even a `400 Bad Host` response carries the header.

**Why the React calls don't trip CSRF:** DRF checks CSRF only for *session-authenticated* requests.
Axios requests from another origin send no cookies (`withCredentials` is off), so they count as
anonymous and no CSRF token is needed.

### B6. CORS

- **The problem:** a page on origin A (`localhost:5173`) may *send* a request to origin B
  (`127.0.0.1:8000`). But the browser lets the page *read* the response only if B replies with
  `Access-Control-Allow-Origin: A`.
- **Preflight:** for a "non-simple" request, such as a POST with `Content-Type: application/json`, the
  browser first sends an `OPTIONS` **preflight** asking permission. You can watch this in the Network tab:
  `OPTIONS /api/books/` → 200, then `POST` → 201.
- **Our configuration:** `CORS_ALLOWED_ORIGINS` lists exact origins from `.env`. Nothing is allowed by
  wildcard. `localhost` and `127.0.0.1` count as different origins, which is why both are listed.
- **Tested:** in [`test_project_setup.py`](../backend/apps/library/tests/test_project_setup.py). Removing
  the middleware makes those tests fail (D51).
- **CORS isn't security for the server.** It protects *users' browsers*. `curl` ignores CORS entirely.

---

## C. Frontend deep dive

### C1. Component architecture

There are three kinds of module, with one rule about which may import which:

```
pages/        own the data: call hooks + services, hold page state, decide navigation
  │  props ↓        ↑ callbacks (onSubmit, onRetry, onChange, onDelete…)
components/   display only: get everything through props, never import services/
hooks/        reusable stateful logic (no JSX): useApiData, useFormState
services/     the only code that knows URLs and Axios
```

**Data flows down, events flow up.** For example:
- `GenresPage` owns the `genres` list and passes `genre` to each `GenreListItem`.
- When you click **Delete**, the item calls its `onDelete` prop.
- The *page* then calls the API and reloads.

A component written this way can be reused anywhere and tested on its own (D29).

The full component tree is in [ARCHITECTURE.md §7.1](ARCHITECTURE.md#71-component-tree).

### C2. `main.jsx` and `App.jsx`

- **[`main.jsx`](../frontend/src/main.jsx#L11)** is the file `index.html` loads.
  - `createRoot(...).render(...)` puts React in charge of `<div id="root">`.
  - It wraps the app in `<StrictMode>`, which adds development checks. One visible effect is that
    effects run twice in development, so each request appears twice in the Network tab.
  - It then wraps everything in [`<BrowserRouter>`](../frontend/src/main.jsx#L17).
  - `index.css` is imported **before** `App`, so component CSS loads later and wins ties (P12).
- **[`App.jsx`](../frontend/src/App.jsx#L10)** is *only* the route table.
  - A [`<Route element={<Layout />}>`](../frontend/src/App.jsx#L15) with **no path** wraps every page.
    `Layout` draws the navbar and places an `<Outlet />` where the matching child page appears.
  - Under it come `index` (the list), `books/new`, `books/:bookId`, `books/:bookId/edit`, `genres`, and
    `*` (not found).

### C3. React Router

| Tool | Where it's used | What it does |
| ---- | --------------- | ------------ |
| `<Routes>` / `<Route>` | `App.jsx` | URL pattern → component. `:bookId` is a URL parameter |
| `<Link to>` / `<NavLink>` | `BookCard`, `NavBar`, pages | Navigate without reloading the page. `NavLink` adds the `active` class |
| `useParams()` | [`BookDetailPage`](../frontend/src/pages/BookDetailPage.jsx#L17), [`BookFormPage`](../frontend/src/pages/BookFormPage.jsx#L16) | Read `:bookId` from the URL. **It's always a string** |
| `useNavigate()` | after save and after delete | Navigate from code. `{ replace: true }` replaces the history entry instead of adding one (D42) |
| `useSearchParams()` | [`BookListPage`](../frontend/src/pages/BookListPage.jsx#L19) | Read and write `?status=&genre=`, so the filters live in the URL (D40) |

React Router 8 is used in **declarative mode**: components plus hooks, with no route `loader`s (D25).
Everything is imported from `react-router`, because v8 removed `react-router-dom` (P10).

### C4. Props and state

- **Props** are a component's inputs, set by its parent and read-only. For example,
  [`BookCard({ book })`](../frontend/src/components/BookCard.jsx#L8) and
  [`BookForm({ book, genres, submitLabel, onSubmit, onCancel })`](../frontend/src/components/BookForm.jsx#L54).
- **State** is data a component owns and can change with a setter. Calling the setter makes React
  re-render the component. Examples:

  | State | Where | Holds |
  | ----- | ----- | ----- |
  | [`editingId`](../frontend/src/pages/GenresPage.jsx#L17) | `GenresPage` | Which genre row shows its edit form |
  | [`isDeleting`](../frontend/src/pages/BookDetailPage.jsx#L25) | `BookDetailPage` | Disables the Delete button while the request runs |
  | [`values`](../frontend/src/hooks/useFormState.js#L23) | `useFormState` | Every form input's current text |

- **Derived values aren't state.** For example, `const isFinished = values.status === 'finished'` in
  `BookForm`, and `isLoading` in [`useApiData`](../frontend/src/hooks/useApiData.js#L49). They are
  recomputed on every render, so they can never go stale (D28).
- **Lifting state up.** `GenreListItem` doesn't know whether it's being edited; the page passes
  `isEditing`. That way only one row can be in edit mode at a time.

### C5. Hooks

**Built-in hooks used in this project:**

| Hook | What it does | Example |
| ---- | ------------ | ------- |
| `useState` | Component memory | Everywhere |
| `useEffect` | Run code after rendering, to sync with something outside React (here, the API). The **cleanup function** runs before the next run or on unmount | [`useApiData`](../frontend/src/hooks/useApiData.js#L28) |
| `useCallback` | Keep the *same function object* between renders until its dependencies change | [`loadBooks`](../frontend/src/pages/BookListPage.jsx#L25), [`loadBook`](../frontend/src/pages/BookDetailPage.jsx#L22) |
| `useId` | A unique id per component instance, for linking labels to inputs | [`useFormState`](../frontend/src/hooks/useFormState.js#L30) |

**Our own hooks** are functions that start with `use` and call other hooks:

- **[`useApiData(fetchData)`](../frontend/src/hooks/useApiData.js#L16)** returns
  `{ data, isLoading, error, reload }`.
  - It runs `fetchData` in an effect whenever `fetchData` changes or `reload()` is called.
  - The [`ignore`](../frontend/src/hooks/useApiData.js#L31) flag in the cleanup discards responses that
    arrive too late. That happens if you switch from book 1 to book 2 before book 1's response arrives.
  - **Why callers use `useCallback`:** the effect depends on `fetchData`. A new function on every render
    would re-run the effect, and with it the request, forever.
- **[`useFormState(initialValues, validate, onSubmit)`](../frontend/src/hooks/useFormState.js#L22)** is
  shared by both forms. Section D walks through it.

**Rules of Hooks:** call hooks only at the top level of a component or hook, never inside `if`, loops or
callbacks. The linter enforces this (`react/rules-of-hooks`).

### C6. Axios and the service layer

- **[`apiClient`](../frontend/src/services/apiClient.js#L16)** is the single `axios.create()` instance,
  with `baseURL`, a 10 s timeout and `Accept: application/json`. If `VITE_API_BASE_URL` is missing it
  **throws at import time**, which gives a blank page and a clear console message.
- **One module per resource:** [`booksApi.js`](../frontend/src/services/booksApi.js) and
  [`genresApi.js`](../frontend/src/services/genresApi.js). Each function awaits Axios and returns
  `response.data`, so components never see Axios response objects.
- **What Axios does for us:**
  - It turns a JS object body into JSON and sets `Content-Type: application/json`.
  - It parses the JSON reply.
  - It **rejects the Promise for any status outside 200–299**, so a 400 response becomes an exception
    the caller can catch.
- **Errors are not caught in services.** They travel up to the page or form, which knows how to show
  them. Three helpers translate them:
  - [`getErrorMessage`](../frontend/src/services/apiClient.js#L35) gives one human sentence for any
    failure. It handles a server answer, no answer at all, a timeout, and a bug in our own code (that
    one is also logged with `console.error`).
  - [`getFieldErrors`](../frontend/src/services/apiClient.js#L86) gives `{field: message}` for a 400
    response, to show under the inputs.
  - [`isNotFound`](../frontend/src/services/apiClient.js#L99) checks for a 404, to show "Book not found".

### C7. Form submission (summary)

1. Inputs are **controlled**: `value` comes from state, and `onChange` updates it.
2. `<form noValidate onSubmit>` runs `handleSubmit`, which first calls `event.preventDefault()`, then
   validates in the browser, then calls the `onSubmit` prop.
3. The *page's* `onSubmit` calls the API and navigates.
4. Any server rejection comes back into the form as per-field messages.

Every line of this is traced in [D](#d-end-to-end-adding-a-book).

### C8. Loading, error and empty states

Every page that fetches data renders **exactly one** of four states. The pattern appears in
[`BookListContent`](../frontend/src/pages/BookListPage.jsx#L88):

```jsx
if (isLoading) return <LoadingSpinner … />
if (error)     return <ErrorMessage message={getErrorMessage(error)} onRetry={onRetry} />
if (books.length === 0) return <EmptyState … />   // two variants: no books vs no matches
return <ul className="book-list">…</ul>
```

- **Loading:** `LoadingSpinner` has `role="status"`, so screen readers announce it.
- **Error:** `ErrorMessage` has `role="alert"` and an optional **Try again** button, which calls `reload()`.
- **Not found:** the detail and form pages check `isNotFound(error)` before the generic error, so a 404
  shows "Book not found" instead of an error message.

### C9. The remaining components at a glance

| Component | Props in | Events out | Notes |
| --------- | -------- | ---------- | ----- |
| `Layout` | — | — | NavBar + `<Outlet />` |
| `NavBar` | — | — | `NavLink end` on "/" so it isn't active on every page |
| `BookCard` | `book` | — | The whole card is one link, via a stretched `::after` (D44) |
| `BookFilters` | `status, genre, genres` | `onChange(name, value)`, `onClear()` | Controlled selects |
| `BookForm` | `book?, genres, submitLabel` | `onSubmit(payload)`, `onCancel()` | Converts values with `toFormValues` / `toBookPayload` |
| `GenreForm` | `genre?, submitLabel` | `onSubmit(payload)`, `onCancel?()` | Used for add *and* inline rename |
| `GenreListItem` | `genre, isEditing` | `onEdit, onCancelEdit, onSave, onDelete` | Shows a row, or a `GenreForm` |
| `FormField` | `id, label, error, hint, required, children` | — | The input is passed in as `children` |
| `StatusBadge`, `RatingStars` | `status` / `rating` | — | Display only |
| `LoadingSpinner`, `ErrorMessage`, `EmptyState` | text, plus `onRetry` / `children` | `onRetry()` | The shared states |

---

## D. End-to-end: adding a book

**The scenario:** at <http://localhost:5173/books/new> the user fills in *Title* "Dune Messiah",
*Author* "Frank Herbert", *Genre* "Science Fiction", and clicks **Add book**. The SQL and JSON below
were captured from this exact request in the real app.

### 1. What happens in the React component?

- **What's on screen.** The route `books/new` renders
  [`BookFormPage`](../frontend/src/pages/BookFormPage.jsx#L15). Because `useParams()` has no `bookId`,
  `isEditing` is `false`.
- **What it loaded first.** The page loaded the genre list with `useApiData(listGenres)` and rendered
  [`<BookForm>`](../frontend/src/components/BookForm.jsx#L54), passing it the genres, the label
  "Add book", and **its own** `handleSubmit` as the `onSubmit` prop.
- **What the click triggers.** `<button type="submit">` inside
  [`<form onSubmit={handleSubmit} noValidate>`](../frontend/src/components/BookForm.jsx#L64) fires the
  form's submit event. That calls `handleSubmit` from
  [`useFormState`](../frontend/src/hooks/useFormState.js#L44).

### 2. How is the form data collected?

There's nothing to "collect": the data is **already in React state**, because every input is
*controlled*.

- [`fieldProps('title')`](../frontend/src/components/BookForm.jsx#L72) spreads `value={values.title}`
  and `onChange={handleChange}` onto the input.
- Each keystroke runs [`handleChange`](../frontend/src/hooks/useFormState.js#L32), which calls
  [`setValues(current => ({ ...current, [name]: value }))`](../frontend/src/hooks/useFormState.js#L34).
  It copies the old object and replaces one key, using the input's `name` attribute.
- So when the user clicks **Add book**, `values` is already:

  ```js
  { title: 'Dune Messiah', author: 'Frank Herbert', genre: '2', status: 'want_to_read', rating: '', finished_on: '', notes: '' }
  ```

  Note that `genre` is the **string** `'2'`: inputs always produce strings.

### 3. How is validation performed?

[`handleSubmit`](../frontend/src/hooks/useFormState.js#L44):

1. [`event.preventDefault()`](../frontend/src/hooks/useFormState.js#L46) stops the browser's
   old-fashioned full-page form post.
2. [`validate(values)`](../frontend/src/hooks/useFormState.js#L48) runs
   [`validateBook`](../frontend/src/validation.js#L12): title and author present and not too long, a
   genre chosen, no future date.
   - If it returns errors, they go into state, the messages appear under the fields, and **no request is sent**.
3. Here everything is valid, so `isSubmitting` becomes `true` (the button now says "Saving…" and is
   disabled), and [`await onSubmit(values)`](../frontend/src/hooks/useFormState.js#L59) runs.
4. `BookForm` passed a small wrapper as `onSubmit`, which first converts the values with
   [`toBookPayload`](../frontend/src/components/BookForm.jsx#L32):
   - text is trimmed, and `genre: '2'` becomes `2`
   - `rating` and `finished_on` become `null`, because the status isn't *finished*
5. It then calls the page's [`handleSubmit(payload)`](../frontend/src/pages/BookFormPage.jsx#L30).

### 4. How does Axios send the request?

`BookFormPage.handleSubmit` calls [`createBook(payload)`](../frontend/src/services/booksApi.js#L24),
which does `apiClient.post('/books/', book)`. Axios then:

1. Joins `baseURL` with the path: `http://127.0.0.1:8000/api` + `/books/`.
2. Serialises the object to JSON and sets `Content-Type: application/json`.
3. Lets the browser notice the request is cross-origin and "non-simple" (because of JSON), so the
   browser first sends **`OPTIONS /api/books/`**. Django's `CorsMiddleware` answers 200, with
   `Access-Control-Allow-Origin: http://localhost:5173` and the allowed methods and headers.
4. Sends the real request:

   ```http
   POST /api/books/ HTTP/1.1
   Host: 127.0.0.1:8000
   Origin: http://localhost:5173
   Content-Type: application/json

   {"title":"Dune Messiah","author":"Frank Herbert","genre":2,"status":"want_to_read","rating":null,"finished_on":null,"notes":""}
   ```

### 5. Which Django URL receives it?

1. The request passes through the [middleware](#b5-middleware), from top to bottom.
2. Django reads [`ROOT_URLCONF`](../backend/config/settings.py#L88) = `config.urls`. In it,
   [`path("api/", include(...))`](../backend/config/urls.py#L13) matches and strips `api/`, then passes
   `books/` on to [`apps/library/urls.py`](../backend/apps/library/urls.py#L10).
3. The router's list pattern `^books/$` matches, with URL name `book-list`, and maps **POST** to the
   **`create`** action.

### 6. Which view handles it?

[`BookViewSet`](../backend/apps/library/views.py#L43). We didn't write a `create` method; it's inherited
from DRF's `CreateModelMixin`. This is the real library code, from
`venv/lib/python3.11/site-packages/rest_framework/mixins.py`, lines 16–24:

```python
def create(self, request, *args, **kwargs):
    serializer = self.get_serializer(data=request.data)     # BookSerializer, from serializer_class
    serializer.is_valid(raise_exception=True)               # step 7
    self.perform_create(serializer)                         # step 8: calls serializer.save()
    headers = self.get_success_headers(serializer.data)
    return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)   # step 9
```

`request.data` is the JSON body, already parsed by DRF into a Python `dict`.

### 7. How does the serializer validate it?

`is_valid(raise_exception=True)` runs validation in a fixed order:

1. **Each field on its own.** These field definitions were generated from the model by `ModelSerializer`:
   - `title` and `author`: required; whitespace trimmed; `max_length` 200 / 120.
   - `genre`: a `PrimaryKeyRelatedField`, which **looks the id up in the database**. That's the first
     SQL query in step 8, and it replaces `2` with the actual `Genre` object. An unknown id gives
     "This genre no longer exists…" (from [`extra_kwargs`](../backend/apps/library/serializers.py#L56)).
   - `status` must be one of the choices; `rating` must be 1–5 (copied from the model's validators);
     `finished_on` must pass [`validate_not_in_future`](../backend/apps/library/models.py#L23).
   - `validate_<field>()` methods run here too. `GenreSerializer` has one; `BookSerializer` doesn't.
2. **Cross-field:** [`BookSerializer.validate(attrs)`](../backend/apps/library/serializers.py#L67), the
   "only finished books can have a rating or finished date" rule. It runs **only if every field passed**,
   which is why errors can appear in two rounds (README §13).
3. **If anything fails,** DRF raises `ValidationError`. Its exception handler turns that into
   **400 `{"field": ["message"]}`**, and steps 8–9 never happen.

Here everything is valid, so `serializer.validated_data` is
`{'title': 'Dune Messiah', 'author': 'Frank Herbert', 'genre': <Genre: Science Fiction>, 'status': 'want_to_read', 'rating': None, 'finished_on': None, 'notes': ''}`.

### 8. How does the ORM save it?

`perform_create` → `serializer.save()` → `ModelSerializer.create(validated_data)` →
`Book.objects.create(**validated_data)`. Django fills in `created_at` (`auto_now_add`) and `updated_at`
(`auto_now`). These are **the two real SQL statements** this request ran:

```sql
-- from step 7: PrimaryKeyRelatedField checking that genre 2 exists
SELECT "library_genre"."id", "library_genre"."name", "library_genre"."description", "library_genre"."created_at"
FROM "library_genre" WHERE "library_genre"."id" = 2 LIMIT 21;

-- the save itself
INSERT INTO "library_book" ("title", "author", "genre_id", "status", "rating", "finished_on", "notes", "created_at", "updated_at")
VALUES ('Dune Messiah', 'Frank Herbert', 2, 'want_to_read', NULL, NULL, '', '2026-11-06 10:49:34.881162', '2026-11-06 10:49:34.881330')
RETURNING "library_book"."id";
```

- **The constraints run here.** SQLite checks the two `CHECK` constraints during the `INSERT`. They pass,
  because both `rating` and `finished_on` are `NULL`.
- **Getting the id back.** `RETURNING "id"` hands the new primary key back to Python. The `book.id` is
  `11` here, because ids are never reused after deletes.

### 9. What response does Django return?

The serializer now **represents** the saved instance. `genre_name` comes from `book.genre.name`, which
costs no extra query, because the `Genre` object from step 7 is already attached. The response is
**`201 Created`**:

```json
{"id":11,"title":"Dune Messiah","author":"Frank Herbert","genre":2,"genre_name":"Science Fiction",
 "status":"want_to_read","rating":null,"finished_on":null,"notes":"",
 "created_at":"2026-11-06T10:49:34.881162Z","updated_at":"2026-11-06T10:49:34.881330Z"}
```

On the way out, `CorsMiddleware` adds `Access-Control-Allow-Origin: http://localhost:5173`, so the
browser lets JavaScript read the body.

### 10. How does React update its interface?

1. **The Promise resolves.** Axios's Promise resolves, `createBook` returns `response.data`, and in
   [`BookFormPage.handleSubmit`](../frontend/src/pages/BookFormPage.jsx#L31) `savedBook` is the object above.
2. **Navigation.** [`navigate(`/books/${savedBook.id}`)`](../frontend/src/pages/BookFormPage.jsx#L32)
   changes the URL to `/books/11`, with no page reload.
3. **The form is cleaned up.** Back in `useFormState`, the `finally` block sets `isSubmitting` back to
   `false`. React Router swaps `BookFormPage` for `BookDetailPage`, and the form is unmounted.
4. **The new page loads its data.** [`BookDetailPage`](../frontend/src/pages/BookDetailPage.jsx#L15)
   mounts. `useParams()` gives `bookId = '11'`, and
   [`loadBook`](../frontend/src/pages/BookDetailPage.jsx#L22) is passed to `useApiData`. The effect runs:
   `GET /api/books/11/` returns 200, and state is updated.
5. **React re-renders.** First the spinner shows, then the details.

**The error variant.** Say the server had rejected the book, for example because the genre was deleted
in another tab:

1. `createBook` rejects with an Axios error whose `response.status` is 400 and whose body is
   `{"genre": ["This genre no longer exists. Please choose another."]}`.
2. `BookFormPage.handleSubmit` doesn't catch it, so the rejection travels back up into
   [`useFormState`'s `catch`](../frontend/src/hooks/useFormState.js#L60).
3. [`getFieldErrors(error)`](../frontend/src/hooks/useFormState.js#L61) gives
   `{genre: "This genre no longer exists…"}`.
4. That goes into `errors` state, and the message appears under the *Genre* select with
   `aria-invalid="true"`.
5. The user's typing is kept, and the button re-enables.

---

## E. The database

### E1. Tables

`python manage.py migrate` creates Django's own tables as well as ours:

| Table | Comes from | Purpose |
| ----- | ---------- | ------- |
| `library_genre` | `Genre` | Our genres |
| `library_book` | `Book` | Our books |
| `django_migrations` | Django | Which migrations have been applied |
| `auth_user`, `auth_group`, `auth_permission`, … | `django.contrib.auth` | Admin logins and permissions |
| `django_session` | sessions | Logged-in admin sessions |
| `django_admin_log` | admin | History of changes made in the admin |
| `django_content_type` | contenttypes | A registry of models (used by permissions and the admin log) |

**Naming:** tables are named `<app label>_<model name in lowercase>`, so the app `library` and the model
`Book` give `library_book`.

These are the columns, from the real `CREATE TABLE` statements (`python manage.py sqlmigrate library 0001`):

```sql
CREATE TABLE "library_genre" (
  "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" varchar(50) NOT NULL,
  "description" text NOT NULL,
  "created_at" datetime NOT NULL);

CREATE TABLE "library_book" (
  "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
  "title" varchar(200) NOT NULL,
  "author" varchar(120) NOT NULL,
  "status" varchar(20) NOT NULL,
  "rating" smallint unsigned NULL CHECK ("rating" >= 0),
  "finished_on" date NULL,
  "notes" text NOT NULL,
  "created_at" datetime NOT NULL,
  "updated_at" datetime NOT NULL,
  "genre_id" bigint NOT NULL REFERENCES "library_genre" ("id") DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT "book_rating_only_when_finished" CHECK (("rating" IS NULL OR "status" = 'finished')),
  CONSTRAINT "book_finished_on_only_when_finished" CHECK (("finished_on" IS NULL OR "status" = 'finished')));

CREATE UNIQUE INDEX "unique_genre_name_case_insensitive" ON "library_genre" ((LOWER("name")));
CREATE INDEX "library_book_genre_id_8cc85e73" ON "library_book" ("genre_id");
```

Things worth noticing:

- **Empty text fields are `NOT NULL`.** `description` and `notes` are `blank=True` in the model, but
  `NOT NULL` in the database. Django stores "empty" text as `''`, not `NULL`, so there's only one kind of
  "empty". `rating` and `finished_on` *are* nullable (`null=True`), because "no value" isn't the same as
  `0` or a date.
- **`CHECK ("rating" >= 0)` comes from `PositiveSmallIntegerField`.** The 1–5 range is enforced by
  validators in Python, not in SQL.
- **A foreign key gets an index automatically,** `library_book_genre_id_…`. That makes filtering by genre
  and joining fast.

### E2. Primary keys, foreign keys and relationships

- **Primary keys.**
  - **What creates them:** Django adds an `id` field to every model, because of
    [`DEFAULT_AUTO_FIELD = BigAutoField`](../backend/config/settings.py#L120). SQLite shows it as
    `integer … AUTOINCREMENT`, which is 64-bit in SQLite.
  - **How they behave:** ids are never reused, which is why a new book can get id 11 when only 5 exist.
- **The foreign key.** `Book.genre` becomes the column `genre_id`, which references `library_genre.id`.
  - In Python, `book.genre` is the `Genre` object (fetched lazily, unless `select_related` was used),
    and `book.genre_id` is just the number.
- **The relationship is one-to-many** (Genre 1 — N Book). Ways to navigate it:

  | Direction | Code | Result |
  | --------- | ---- | ------ |
  | Book → Genre | `book.genre.name` | `"Fantasy"` |
  | Genre → Books | `genre.books.all()` | The books in that genre (named by `related_name="books"`; without it, it would be `genre.book_set`) |
  | Filter across the relation | `Book.objects.filter(genre__name="Fantasy")` | Joins the two tables |

- **What `on_delete` options do** when the parent (a genre) is deleted:

  | Option | Effect | Used? |
  | ------ | ------ | ----- |
  | `CASCADE` | Delete its books too | No: silent data loss |
  | `SET_NULL` | Set `genre_id` to NULL (needs `null=True`) | No: leaves books without a genre |
  | `PROTECT` | Refuse, raising `ProtectedError` | **Yes**, and it becomes a 409 (D5) |

### E3. ORM query cheat sheet (try these in `python manage.py shell`)

```python
from apps.library.models import Book, Genre
from django.db.models import Count

Book.objects.all()                                 # every book (lazy: no SQL yet)
Book.objects.get(pk=1)                             # one book; raises Book.DoesNotExist if it's missing
Book.objects.filter(status="finished")             # WHERE status = 'finished'
Book.objects.filter(rating__gte=4)                 # WHERE rating >= 4  ("field lookups": __gte, __iexact, __icontains…)
Book.objects.exclude(notes="")                     # WHERE NOT notes = ''
Book.objects.filter(genre__name="Fantasy")         # JOIN across the foreign key
Book.objects.order_by("title")[:3]                 # ORDER BY title LIMIT 3
Book.objects.filter(status="reading").count()      # SELECT COUNT(*)
Genre.objects.annotate(n=Count("books")).values("name", "n")   # books per genre, in ONE query
Book.objects.select_related("genre")               # JOIN now, instead of one query per book later
print(Book.objects.filter(status="finished").query) # see the SQL without running it
```

### E4. Migrations

- **The workflow:** edit `models.py` → `makemigrations` (writes a file describing the change) → read the
  file → `migrate` (applies it) → commit the model and the migration *together*.
- **How Django tracks them:** in the `django_migrations` table. `showmigrations` reads it: `[X]` means
  applied.
- **Which SQL a migration will run:** `sqlmigrate library 0001` shows it without running it.
- **A safety check:** `makemigrations --check --dry-run` exits with an error if `models.py` has changes
  with no migration yet. It's useful before committing.
- **Adding a required field to a table that already has rows** needs a default.
  [Exercise G1](#g1-add-a-field-to-an-existing-model) runs into this.

### E5. How to inspect the records

| Tool | Command / URL | Best for |
| ---- | ------------- | -------- |
| Django Admin | <http://127.0.0.1:8000/admin/> (after `createsuperuser`) | Browsing and editing with forms |
| Browsable API | <http://127.0.0.1:8000/api/books/> | Seeing exactly what the frontend receives |
| Django shell | `python manage.py shell` | ORM queries (E3) |
| SQL shell | `python manage.py dbshell` | Raw SQL |

Useful commands inside `dbshell` (SQLite):

```sql
.tables
.schema library_book
SELECT id, title, status, rating FROM library_book;
SELECT g.name, COUNT(b.id) FROM library_genre g LEFT JOIN library_book b ON b.genre_id = g.id GROUP BY g.name;
SELECT app, name, applied FROM django_migrations WHERE app = 'library';
.quit
```

---

## F. Important technical concepts

Each concept is shown where it actually appears in this code.

### F1. Python

| Concept | Where | What to understand |
| ------- | ----- | ------------------ |
| **Classes and inheritance** | `class BookViewSet(viewsets.ModelViewSet)` | We inherit six actions and override two hooks. `super()` isn't needed, because we replace `perform_destroy` entirely |
| **Nested classes** | `class Meta:` in models and serializers; `class Status(models.TextChoices)` | `Meta` is configuration that Django and DRF read. `Status` is an enum *scoped to* `Book` (`Book.Status.FINISHED`) |
| **Enums (`TextChoices`)** | `Book.Status` | `Book.Status.values` gives `['want_to_read', 'reading', 'finished']`, used in `_apply_filters` |
| **Decorators** | `@admin.register(Genre)` in `admin.py`; `@override_settings(...)` in tests | A function that wraps a class or function. `register` adds the class to the admin, as if you'd called `admin.site.register(Genre, GenreAdmin)` |
| **Exceptions** | `try/except ProtectedError` → `raise GenreInUse(...)` in `perform_destroy` | Catch a low-level error and raise one that means something to the API's users |
| **f-strings** | `f'Cannot delete "{instance.name}" because {book_count} book(s)…'` | Put values inside strings |
| **`**kwargs` unpacking** | `Book.objects.create(**validated_data)` inside DRF | Turns a dict into keyword arguments |
| **`getattr`** | `getattr(self.instance, field_name)` in `_current_value` | Read an attribute whose name is in a variable |
| **Truthiness** | `if not SECRET_KEY:` | `None` and `''` are both "falsy" |
| **Virtual environments** | `backend/venv/` | An isolated Python with its own packages. `source venv/bin/activate` puts it first on `PATH` |

### F2. Django and DRF

| Concept | Where | What to understand |
| ------- | ----- | ------------------ |
| **Settings from the environment** | `settings.py` + `.env` | Code is the same everywhere; configuration differs per machine. Secrets never go in git |
| **Lazy QuerySets** | `get_queryset()` returns a query that hasn't run yet | It runs when the serializer iterates over it. `_apply_filters` can keep adding `.filter()` for free |
| **N+1 queries** | `select_related("genre")` | Without it: 1 query for the books, plus 1 per book for `genre_name`. A test guards this |
| **Field validators vs `validate()`** | `models.py` validators; `serializers.py` `validate` | Single-field rules live on the model and are reused. Cross-field rules live in the serializer |
| **Database constraints** | `Meta.constraints` | They protect the data from *every* code path, including the admin and scripts (D15) |
| **Validation order** | step 7 in D | Field checks → `validate_<field>()` → `validate()` |
| **`instance` vs `data`** | `BookSerializer(instance, data=…)` | With an instance it's an update, and `self.instance` is the saved row. That's what `_current_value` relies on |
| **PUT vs PATCH** | `UpdateModelMixin` | PATCH sets `partial=True`, so required fields may be left out. PUT keeps optional fields that are left out (see backend README) |
| **APIException** | `GenreInUse` | Raise it, and DRF builds the JSON and the status code |
| **Router + ViewSet** | `urls.py` | Six URL/method combinations from two `register()` calls |
| **Fixtures** | `loaddata sample_data` | JSON rows with fixed primary keys; loading them again overwrites, never duplicates |
| **The test database** | `APITestCase` | A separate empty database, with every test rolled back, so tests are independent |

### F3. JavaScript

| Concept | Where | What to understand |
| ------- | ----- | ------------------ |
| **ES modules** | `import … from` / `export function` | Each file is a module. `export default` is the main export (components); named exports are for helpers |
| **Promises and `async`/`await`** | every function in `services/`; `handleSubmit` | `await` pauses *that function* until the Promise settles. A rejected Promise becomes an exception you can `try/catch` |
| **`try / catch / finally`** | `useFormState.handleSubmit` | `finally` always runs, so `isSubmitting` is reset on success *and* failure |
| **Destructuring** | `const { bookId } = useParams()`, `function BookCard({ book })` | Pull properties out of objects; component props arrive as one object |
| **The spread operator** | `{ ...current, [name]: value }` | Copy an object and change one key. React state must be *replaced*, never mutated |
| **Computed keys** | `[name]: value` | The key name comes from a variable (the input's `name`) |
| **Optional chaining and nullish coalescing** | `error.response?.data`, `searchParams.get('status') ?? ''` | `?.` stops if the left side is null or undefined; `??` supplies a default for null or undefined only |
| **Template literals** | `` `/books/${id}/` `` | Strings with values inside them |
| **Array methods** | `books.map(...)`, `.filter(...)`, `BOOK_STATUSES.find(...)` | `map` turns data into JSX; `filter` drops empty query parameters in `listBooks` |
| **Closures** | `onSave={(payload) => handleUpdate(genre.id, payload)}` in `GenresPage` | The arrow function "remembers" *this row's* `genre.id` |
| **Strings sort like dates** | `values.finished_on > todayIsoDate()` | `"YYYY-MM-DD"` strings compare in date order, so no `Date` objects are needed |
| **Time zones** | `dates.js` | `new Date("2026-03-14")` means midnight **UTC**, so it's parsed by hand to show the right day everywhere (D45) |

### F4. React

| Concept | Where | What to understand |
| ------- | ----- | ------------------ |
| **Components are functions** | every `.jsx` file | They take props and return JSX. React calls them again (re-renders) when their state or props change |
| **JSX** | `<BookCard book={book} />` | HTML-like syntax that compiles to function calls. `{}` embeds JavaScript. Use `className`, not `class` |
| **Controlled inputs** | `fieldProps()` | `value` comes from state, and `onChange` updates it. React is the single source of truth |
| **Effects and cleanup** | `useApiData` | Effects sync with the outside world. The returned cleanup function prevents stale updates |
| **StrictMode double run** | `main.jsx` | In development, React mounts, unmounts and mounts again, to prove the cleanup works. Hence two requests in the Network tab |
| **`key` in lists** | `books.map(book => <li key={book.id}>)` | Lets React match items between renders. Use a stable id, never the array index |
| **`key` to reset** | `<GenreForm key={createFormKey}>` in [`GenresPage`](../frontend/src/pages/GenresPage.jsx#L58) | A new key means a brand-new component with fresh state: an empty form (D43) |
| **Function identity** | `useCallback` around `loadBooks` | `() => {}` creates a new function each render. Effects compare dependencies by identity |
| **Derived state** | `isLoading` in `useApiData` | Compute it from other state rather than storing it separately, so it can't disagree (D28) |
| **Conditional rendering** | `{isFinished && (<div>…rating…</div>)}` in `BookForm` | `&&` renders the right side only when the left side is true |
| **Lifting state up** | `editingId` in `GenresPage` | Shared state lives in the closest common parent |
| **Escaping** | notes rendered as `{book.notes}` | React escapes text, so a note containing `<script>` is shown as text and never run |

---

## G. Modification exercises

The exercises go from small to large. Each one says **what** to build, never **how**; working out the
how is the exercise. When you've finished one (or you're stuck), say so, e.g. *"G4 done, please review"*.
I'll review your diff and run the tests, and only then show a reference solution.

**For every exercise:**

1. Start from a clean state: `git status` is clean and `python manage.py test` is green.
2. Make a branch: `git switch -c exercise-g1` (or whichever).
3. Keep the **living-documentation rule**: update the README API reference, `ARCHITECTURE.md` and
   `DEVELOPMENT_NOTES.md` wherever your change affects them.
4. Finish with:
   - `python manage.py test` all green, plus your new tests
   - `npm run lint` with 0 warnings
   - `npm run build` succeeding
   - a click-through in the browser

Difficulty: ★ small · ★★ medium · ★★★ large

### G1. Add a field to an existing model

**Difficulty:** ★

**Goal:** books can record how many pages they have.

**Requirements**
1. A new `page_count` field on `Book`. It's **optional**, because existing books don't have one.
2. When given, it must be a whole number from **1 to 10,000**. The API returns 400 under `page_count`
   otherwise, and the admin form rejects it too.
3. `page_count` is readable and writable through `/api/books/`.
4. The book form has a number input for it. The browser rejects out-of-range values with a message
   under the field, **before** any request.
5. The detail page shows "320 pages", or "—" when it's empty.
6. A migration exists and applies cleanly to the existing database, and the existing five books still load.
7. At least three new backend tests: a valid value, 0, and 10,001.

**Where to look:** `models.py`, `serializers.py`, `BookForm.jsx` (`NEW_BOOK_VALUES`, `toFormValues`,
`toBookPayload`), `validation.js`, `BookDetailPage.jsx`, `tests/test_book_api.py`.

**Done when:** `showmigrations` shows `0002_…` applied, and you can add, edit and clear a page count in
the UI.

**Think about:**
- What do `null=True` and `blank=True` each mean, and which do you need?
- Why must the existing rows be considered when you run `makemigrations`?
- The input gives you a string. What should `""` become in the payload?

### G2. Create a new API endpoint

**Difficulty:** ★★

**Goal:** a read-only statistics endpoint.

**Requirements**
1. `GET /api/stats/` returns:

   ```json
   { "total_books": 5,
     "by_status": { "want_to_read": 2, "reading": 1, "finished": 2 },
     "average_rating": 4.5 }
   ```

2. All three statuses are always present, even when their count is 0.
3. `average_rating` is the mean of the *rated* books, rounded to one decimal, and `null` when no book is
   rated.
4. `POST`, `PUT` and `DELETE` on it return **405 Method Not Allowed**.
5. It uses at most **two** SQL queries, whatever the number of books. Prove it with `assertNumQueries`.
6. It appears on the `/api/` index page, or you can explain why it doesn't.
7. Tests cover: an empty database, mixed statuses, no ratings, and 405 for a write.

**Where to look:**
- `views.py` and `urls.py` (router vs `path()`)
- DRF's `APIView` and `@api_view`, or a ViewSet `@action`
- Django's `Count`, `Avg` and `aggregate()`

**Think about:**
- Is this a "resource" for a router, or just a view?
- How do you count per status in one query?
- What does an aggregate return on an empty table?

### G3. Add a new React page

**Difficulty:** ★★

**Goal:** a statistics page using G2's endpoint. Do G2 first.

**Requirements**
1. A route `/stats` and a **Stats** link in the navbar, highlighted when active.
2. It shows the total, a count per status (with the status labels from `constants.js`), and the average
   rating as stars, or "No ratings yet".
3. It has the same loading, error (with *Try again*) and empty handling as the other pages, using the
   **existing** components.
4. Each status count links to the book list, already filtered to that status.
5. The API call lives in a new module in `services/`. The page never imports Axios.
6. It works at phone width (375 px) with no horizontal scroll.

**Where to look:** `App.jsx`, `NavBar.jsx`, `BookListPage.jsx` (the four-state pattern), `useApiData.js`,
`RatingStars.jsx` (does it handle 4.5?), `services/booksApi.js` (as a model).

**Think about:**
- Which component owns the data, and which only displays it?
- What should `RatingStars` do with a non-integer rating? Change it, or add something new?

### G4. Modify an existing API response

**Difficulty:** ★★

**Goal:** each genre reports how many books use it.

**Requirements**
1. Every genre in `GET /api/genres/` and `GET /api/genres/{id}/` includes a read-only
   `"book_count": <int>`.
2. A newly created genre's **POST response** includes `"book_count": 0`.
3. Listing genres uses **one** SQL query, however many genres and books there are (no N+1). Add a test
   with `assertNumQueries`.
4. Sending `book_count` in a POST or PUT is ignored.
5. The genres page shows "3 books" / "1 book" / "No books" on each row.
6. The **Delete** button is disabled for genres in use, with an explanation that's visible and readable
   by screen readers. The 409 handling stays, because the data could change in another tab.

**Where to look:**
- `GenreSerializer` and `GenreViewSet.queryset` / `get_queryset`
- Django's `annotate(Count(...))`
- `GenreListItem.jsx`

**Think about:**
- `SerializerMethodField` vs an annotation: which one causes N+1?
- The object returned by a POST didn't come from your annotated queryset. What's on it?

### G5. Add frontend validation

**Difficulty:** ★

**Goal:** notes have a maximum length that users can see.

**Requirements**
1. Notes are limited to **2,000 characters**, enforced by **both** the frontend and the backend.
2. A live counter under the textarea shows e.g. "1,234 / 2,000", and turns to the error colour when it's
   over the limit.
3. If notes are too long, the client blocks submit and shows a message under the field.
4. The backend rejects longer notes with 400 under `notes`, even when the frontend is bypassed (prove it
   with `curl`). Add a test.
5. Existing short notes are unaffected, and there is no data migration.

**Where to look:** `validation.js`, `BookForm.jsx`, `FormField.jsx` (hint vs error), `serializers.py`
or `models.py`.

**Think about:**
- If you add `maxLength={2000}` to the textarea, can the user still go over the limit? (Try pasting.)
  Then is the validation rule still needed?
- `TextField` has no length limit in the database. Which layer should hold this rule, and why?

### G6. Implement a search filter

**Difficulty:** ★★

**Goal:** find books by text.

**Requirements**
1. `GET /api/books/?search=dune` returns books whose **title or author** contains the text,
   case-insensitive and partial. So `herb` finds Frank Herbert's books.
2. It combines with `?status=` and `?genre=`. Spaces at either end are ignored. An empty `search` means
   no filter.
3. A search box in `BookFilters`. The search is kept in the URL like the other filters, so it survives a
   refresh and *Clear filters* resets it.
4. Typing doesn't send a request on every keystroke. Either search on submit/Enter, or wait about 300 ms
   after the last keystroke. Explain your choice.
5. "No matching books" appears when nothing matches.
6. At least four backend tests: a title match, an author match, case, and combined with status.

**Where to look:** `BookViewSet._apply_filters`, Django `Q` objects and `__icontains`, `BookFilters.jsx`,
`BookListPage.jsx` (`useSearchParams`, `replace: true`).

**Think about:**
- How do you express OR in the ORM?
- What happens to the request count, and the server, if every keystroke triggers a fetch?
- Should the input's state live in the URL while you're still typing?

### G7. Change a database relationship

**Difficulty:** ★★★

**Goal:** a book can belong to **several** genres. The one-to-many relationship becomes many-to-many.

**Requirements**
1. `Book` has a many-to-many relationship with `Genre`. Every book must have **at least one** genre.
2. **No data is lost.** After migrating, every existing book has exactly the genre it had before. This
   needs a *data* migration, not just a schema one.
3. The API uses `"genres": [1, 3]` (ids, writable) and `"genre_names": ["Fantasy", "History"]`
   (read-only). An empty list → 400.
4. `?genre=2` still works: it returns books that have genre 2 among their genres.
5. Deleting a genre that any book uses still returns **409** with a count.
6. The book list still uses a **fixed** number of queries (not N+1).
7. The form lets the user pick several genres (checkboxes or a multi-select), with validation. Cards and
   the detail page show all of a book's genres.
8. The admin works, and the sample-data fixture is updated so `loaddata` still works on a fresh database.
9. All existing tests are updated, and new ones cover multiple genres, the empty list, and the protected
   delete.

**Where to look:**
- Django's `ManyToManyField`, `RunPython` data migrations, and `prefetch_related` (versus `select_related`)
- `perform_destroy`, and the fixture file
- every frontend file that reads `book.genre` or `genre_name` (search for them)

**Think about:**
- A many-to-many field has no `on_delete`. What happens to the "can't delete a genre in use" rule?
- In what **order** must the migrations run: add the new field, copy the data, remove the old field?
  What if you do it in one step?
- Why `prefetch_related` here, and not `select_related`?

### G8. Debugging drills (prediction exercises)

For each drill, **write down your prediction first**, including the exact error, the status code, and
the file at fault. Then try it, and compare. Undo each change afterwards.

1. **The frontend on another port.** Stop `npm run dev`, then start the frontend on another port with
   `npx vite --port 5174`.
   What does the page show, what does the browser console say, and which **two** files would you change
   to make port 5174 work?
2. **A missing optimisation.** Remove `select_related("genre")` from `BookViewSet.get_queryset`. Does the
   app still work in the browser? Which test fails, and what exact message does it print?
3. **A PATCH that conflicts with saved data.** Send `curl -i -X PATCH "http://127.0.0.1:8000/api/books/1/" -H "Content-Type: application/json" -d '{"status": "reading"}'`
   to *The Hobbit*, which is finished and rated 5. What's the status code and body? Which line of which
   file produces it? What would happen without `_current_value`?
4. **A missing secret key.** Rename `backend/.env` to `.env.off` and run `python manage.py runserver`. What
   happens, and where in the code is that decided? Rename it back.
5. **Ports on purpose.** Delete `strictPort: true` from `vite.config.js`, occupy port 5173 with another
   process, and run `npm run dev`. What does Vite do, and why does the app then fail in a confusing way?
   Restore the line.
6. **A trailing slash.** Change `createBook` so it posts to `'/books'` (no trailing slash), and submit the
   form. What does the browser show, what does Django's terminal print, and why does GET work without the
   slash while POST doesn't?

---

*Next step after the exercises: the interactive technical assessment (Phase 10), ten levels of questions,
one at a time.*
