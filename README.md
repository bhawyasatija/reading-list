# Reading List

A small full-stack web application for tracking books you want to read, are reading,
or have finished. Built with a **Django REST Framework** API and a **React (Vite)** frontend.

> **Project status:** the application is complete, tested and documented.
> - **Features:** full CRUD for books and genres, filters, and validation in the browser and on the server.
> - **Tests:** 57 backend tests with 95% line coverage, plus manual browser checks.
> - **Setup instructions:** confirmed by setting up a clean copy from scratch.
> - **New to the code?** Start with [docs/CODEBASE_GUIDE.md](docs/CODEBASE_GUIDE.md). It covers the
>   architecture, every file, one feature traced end to end, and modification exercises.
>
> See [docs/DEVELOPMENT_NOTES.md](docs/DEVELOPMENT_NOTES.md) for the detailed log.

---

## Quick start

For when you already have **Python 3.10+ (3.11 used)**, **Node.js 22.22+** and **Git**. Each step is
explained in full in sections 7–12.

**Terminal 1 — backend.** Run from the project root.

1. Create the virtual environment, install the dependencies, and create `.env`:

   ```bash
   cd backend && python3.11 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && cp .env.example .env
   ```

2. Put a freshly generated secret key into `.env`, replacing the placeholder:

   ```bash
   python -c "from django.core.management.utils import get_random_secret_key; from pathlib import Path; env = Path('.env'); env.write_text(env.read_text().replace('replace-me-with-a-generated-secret-key', get_random_secret_key()))"
   ```

3. Create the database, load the sample books, and start the API on <http://127.0.0.1:8000/>:

   ```bash
   python manage.py migrate && python manage.py loaddata sample_data && python manage.py runserver
   ```

**Terminal 2 — frontend.** Run from the project root. This installs, creates `.env`, and starts the app:

```bash
cd frontend && npm install && cp .env.example .env && npm run dev
```

Then open <http://localhost:5173/>.

**Next time,** on macOS, just **double-click `Start Reading List.command`** in the project folder. It
starts both servers and opens the browser (see [§12](#12-running-the-application)). Otherwise, use the
two run commands:
- Backend:
  ```bash
  cd backend && source venv/bin/activate && python manage.py runserver
  ```
- Frontend:
  ```bash
  cd frontend && npm run dev
  ```

---

## Table of contents

- [Quick start](#quick-start)

1. [Project overview](#1-project-overview)
2. [Application description](#2-application-description)
3. [Technology stack](#3-technology-stack)
4. [Architecture overview](#4-architecture-overview)
5. [Folder structure](#5-folder-structure)
6. [Prerequisites](#6-prerequisites)
7. [Backend installation](#7-backend-installation)
8. [Frontend installation](#8-frontend-installation)
9. [Environment variables](#9-environment-variables)
10. [Database setup](#10-database-setup)
11. [Migrations](#11-migrations)
12. [Running the application](#12-running-the-application)
13. [API documentation](#13-api-documentation)
14. [Testing](#14-testing)
15. [Troubleshooting](#15-troubleshooting)
16. [Future improvements](#16-future-improvements)

---

## 1. Project overview

This repository is an engineering exercise: a deliberately small application built with
conventional, production-style practices so that every part of it can be read, explained,
and modified by one developer. Priorities are readability, separation of concerns, and
documentation that stays in sync with the code.

## 2. Application description

**Reading List** lets a single user keep a personal reading log.

Features:

- **Books.** Create, view, edit and delete books (title, author, genre, status, rating, finished date,
  notes). Rating and finished date appear only once a book's status is *Finished*.
- **Genres.** Add, rename and delete genres on one page. A genre that books still use can't be deleted,
  and the app explains why.
- **Filters.** Filter the book list by reading status and genre. Filters are kept in the URL, so they
  survive a refresh and can be bookmarked.
- **Validation in two places.**
  - In the browser: instant feedback, and no request is sent for an invalid form.
  - On the server: the authoritative check. Its messages appear under the matching field.
- **States.** Every page has clear loading, error (with *Try again*), empty and not-found states.
- **Layout.** Works at phone width, and in light and dark mode.
- **Admin.** Django Admin is available for inspecting and editing raw data.

## 3. Technology stack

| Layer        | Technology                                   | Version                |
| ------------ | -------------------------------------------- | ---------------------- |
| Language     | Python                                       | 3.11.15                |
| Backend      | Django                                       | 5.2.19 (LTS)           |
| API          | Django REST Framework                        | 3.18.3                 |
| CORS         | django-cors-headers                          | 4.9.0                  |
| Config       | python-dotenv                                | 1.2.4                  |
| Database     | SQLite (PostgreSQL-compatible design)        | 3.53 (bundled with Python) |
| Runtime      | Node.js                                      | 22.22+ (developed on 24.16) |
| Frontend     | React                                        | 19.3.1                 |
| Build tool   | Vite                                         | 8.3.6                  |
| Routing      | React Router                                 | 8.5.1                  |
| HTTP client  | Axios                                        | 1.21.0                 |
| Linting      | oxlint                                       | 1.91.0                 |
| Styling      | Plain CSS (CSS variables, one file per component) | —                 |

Where the exact versions are recorded:
- **Backend:** pinned in [backend/requirements.txt](backend/requirements.txt).
- **Frontend:** recorded in `frontend/package-lock.json`. See [frontend/README.md](frontend/README.md#dependencies)
  for why each package is there.

## 4. Architecture overview

The frontend and backend are two independent applications that communicate only over HTTP
using JSON.

```
Browser (React app, served by Vite at http://localhost:5173)
   page component → useApiData hook → services/booksApi.js → Axios
   │  HTTP request (JSON), cross-origin → allowed by CORS
   ▼
Django (http://127.0.0.1:8000)
   URL routing → DRF ViewSet → Serializer (validation) → Django ORM
   ▼
SQLite database (backend/db.sqlite3)
```

A full explanation lives in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 5. Folder structure

```
project setup/
├── backend/
│   ├── config/                # Django project: settings.py, urls.py, wsgi.py, asgi.py
│   ├── apps/
│   │   └── library/           # The one Django app: books and genres
│   │       ├── models.py      # Genre and Book tables, field validators, DB constraints
│   │       ├── serializers.py # JSON <-> model conversion, cross-field validation
│   │       ├── views.py       # BookViewSet, GenreViewSet (filtering, 409 on protected delete)
│   │       ├── urls.py        # DRF router -> /api/books/, /api/genres/
│   │       ├── exceptions.py  # GenreInUse (HTTP 409)
│   │       ├── admin.py       # Django Admin configuration
│   │       ├── tests/         # 57 tests: genre API, book API, models, project setup
│   │       ├── apps.py        # App configuration (name = "apps.library")
│   │       ├── fixtures/      # sample_data.json: demo genres and books
│   │       └── migrations/    # 0001_initial.py: creates both tables
│   ├── db.sqlite3             # SQLite database (git-ignored, created by migrate)
│   ├── venv/                  # Virtual environment (git-ignored)
│   ├── manage.py              # Django command-line entry point
│   ├── requirements.txt       # Pinned Python dependencies
│   ├── .env.example           # Template for backend environment variables
│   └── README.md              # Backend-specific setup and reference
├── frontend/
│   ├── src/
│   │   ├── main.jsx           # Entry point: mounts React inside BrowserRouter
│   │   ├── App.jsx            # Route table (URL → page)
│   │   ├── index.css          # Design tokens, base styles, buttons
│   │   ├── constants.js       # Book statuses (mirrors the backend)
│   │   ├── validation.js      # Client-side form rules (validateBook, validateGenre)
│   │   ├── dates.js           # Date formatting that avoids time-zone shifts
│   │   ├── pages/             # One per route: BookList, BookDetail, BookForm, Genres, NotFound
│   │   ├── components/        # Reusable UI (cards, forms, filters, states); data via props only
│   │   ├── services/          # Axios instance + one module per API resource
│   │   └── hooks/             # useApiData (loading data), useFormState (form handling)
│   ├── public/                # Static files served as-is (favicon)
│   ├── index.html             # The single HTML page
│   ├── vite.config.js         # Dev server (port 5173, strict) and React plugin
│   ├── package.json           # npm dependencies and scripts
│   ├── package-lock.json      # Exact dependency versions
│   ├── .npmrc                 # Pins the official npm registry
│   ├── .env.example           # Template for frontend environment variables
│   └── README.md              # Frontend-specific setup and reference
├── docs/
│   ├── CODEBASE_GUIDE.md      # Onboarding walkthrough + modification exercises (start here)
│   ├── ARCHITECTURE.md        # How the system is designed and why
│   └── DEVELOPMENT_NOTES.md   # Running log: decisions, problems, status
├── Start Reading List.command  # macOS: double-click to start both servers (README §12)
├── .gitignore                 # Ignore rules for both backend and frontend
└── README.md                  # This file
```

The full list of frontend files is in [frontend/README.md](frontend/README.md#folder-layout).

## 6. Prerequisites

| Tool    | Minimum version | Check with             | Notes |
| ------- | --------------- | ---------------------- | ----- |
| Python  | 3.10 (3.11 used) | `python3.11 --version` | Django 5.2 does **not** support Python 3.9. On macOS, the built-in `python3` is often 3.9 — see [Troubleshooting](#15-troubleshooting). |
| Node.js | 22.22           | `node --version`       | Required by React Router 8. Developed with Node 24.16. |
| npm     | 10              | `npm --version`        | |
| Git     | 2.x             | `git --version`        | |

## 7. Backend installation

Run from the `backend/` folder. Full explanations are in [backend/README.md](backend/README.md).

```bash
cd "/path/to/project setup/backend"
```

```bash
python3.11 -m venv venv
```

```bash
source venv/bin/activate
```

```bash
pip install -r requirements.txt
```

```bash
cp .env.example .env
```

Generate a secret key and paste it into `.env` as `DJANGO_SECRET_KEY='...'`:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Verify the configuration (expected: `System check identified no issues`):

```bash
python manage.py check
```

Then create the database: see [Database setup](#10-database-setup).

## 8. Frontend installation

Run from the `frontend/` folder. Full explanations are in [frontend/README.md](frontend/README.md).

```bash
cd "/path/to/project setup/frontend"
```

```bash
npm install
```

```bash
cp .env.example .env
```

`npm install` reads `frontend/.npmrc`, so it always uses the official registry (`registry.npmjs.org`)
whatever your global npm settings are.

## 9. Environment variables

Rule for this project: real values go in `.env` files, which are git-ignored.
Each app ships a committed `.env.example` listing every variable with a safe placeholder.

**Backend** (`backend/.env`, loaded by python-dotenv in `config/settings.py`):

| Variable               | Required | Default if unset      | Purpose |
| ---------------------- | -------- | --------------------- | ------- |
| `DJANGO_SECRET_KEY`    | **Yes**  | — (startup fails)     | Cryptographic signing key; unique and secret per installation |
| `DJANGO_DEBUG`         | No       | `False`               | Detailed error pages; `True` for development only |
| `DJANGO_ALLOWED_HOSTS` | No       | `localhost,127.0.0.1` | Host names the server answers to |
| `CORS_ALLOWED_ORIGINS` | No       | none                  | Browser origins allowed to call the API |

**Frontend** (`frontend/.env`, read by Vite when `npm run dev` starts):

| Variable            | Required | Example                     | Purpose |
| ------------------- | -------- | --------------------------- | ------- |
| `VITE_API_BASE_URL` | **Yes**  | `http://127.0.0.1:8000/api` | Base URL of the Django API, without a trailing slash |

Notes on how the two files relate:
- **Frontend values are public.** They are built into the JavaScript sent to the browser, so they must
  never contain secrets.
- **Keep the two files in step.** The frontend's origin (`http://localhost:5173`) has to be listed in
  the backend's `CORS_ALLOWED_ORIGINS`. If you change the frontend port, update both files.

## 10. Database setup

The database is a single SQLite file, `backend/db.sqlite3`. It is created on first `migrate` and is
git-ignored, so every developer has their own copy. All commands run from `backend/` with the venv active.

**1. Create all tables.** This includes Django's built-in tables (users, sessions, admin log) and this project's tables.

```bash
python manage.py migrate
```

**2. Load the sample data (optional):** 4 genres and 5 books, so the UI has something to show.

```bash
python manage.py loaddata sample_data
```

**3. Create an admin login** for <http://127.0.0.1:8000/admin/>. It prompts for a username, an email (optional) and a password.

```bash
python manage.py createsuperuser
```

**Tables:**

| Table           | Model   | Key columns |
| --------------- | ------- | ----------- |
| `library_genre` | `Genre` | `id` (PK), `name` (unique, case-insensitive), `description`, `created_at` |
| `library_book`  | `Book`  | `id` (PK), `title`, `author`, `genre_id` (FK → `library_genre.id`, PROTECT), `status`, `rating`, `finished_on`, `notes`, `created_at`, `updated_at` |

**Constraints enforced by the database itself:**

| Name | Rule |
| ---- | ---- |
| `unique_genre_name_case_insensitive` | Unique index on `LOWER(name)`: "Fantasy" and "fantasy" cannot both exist |
| `book_rating_only_when_finished` | `rating IS NULL OR status = 'finished'` |
| `book_finished_on_only_when_finished` | `finished_on IS NULL OR status = 'finished'` |

**Inspecting the data:**

- **Django Admin:** <http://127.0.0.1:8000/admin/>, after `createsuperuser`.
- **Browsable API:** <http://127.0.0.1:8000/api/books/>.
- **Django shell** (ORM queries): run `python manage.py shell`, then for example:

  ```python
  from apps.library.models import Book
  Book.objects.filter(status="finished")
  ```

- **SQL shell:** `python manage.py dbshell` opens `sqlite3` on the database. Try `.tables`, then
  `SELECT title, status FROM library_book;`, then `.quit` to leave.

**Starting over:** stop the server, delete `backend/db.sqlite3`, then run `migrate` (and `loaddata`) again.

## 11. Migrations

A migration is a Python file in `apps/library/migrations/` describing a schema change. It is committed
to git, so every database built from the code ends up with the same structure.

| Command | Purpose |
| ------- | ------- |
| `python manage.py makemigrations` | Compare `models.py` with the existing migrations and write a new migration file for any differences |
| `python manage.py migrate` | Apply all unapplied migrations to the database |
| `python manage.py showmigrations` | List migrations and whether each is applied (`[X]`) |
| `python manage.py sqlmigrate library 0001` | Show the SQL a migration will run, without running it |
| `python manage.py makemigrations --check --dry-run` | Exit with an error if `models.py` has changes that have no migration yet |

**Workflow when changing a model:**
1. Edit `models.py`.
2. Run `makemigrations`.
3. Read the generated file.
4. Run `migrate`.
5. Commit the model change and the migration together.

Current migrations: `backend/apps/library/migrations/0001_initial.py` creates both tables, their
constraints, and the index on `genre_id`.

## 12. Running the application

### One click (macOS)

**Double-click `Start Reading List.command`** in the project folder, after completing the one-time setup
in §7–§10. A Terminal window opens and the script:

1. Checks the setup is complete (`venv`, `node_modules`, both `.env` files) and that ports 8000 and 5173
   are free. If anything is missing, it says exactly what to run.
2. Starts Django in the background, and waits until `http://127.0.0.1:8000/api/` answers.
3. Starts Vite in the same window, and opens <http://localhost:5173/> in your default browser.

**Press `Ctrl+C` in that window, or close it, to stop both servers.**

A few details:
- **Node from nvm.** A double-clicked script doesn't load your shell profile, so if Node was installed
  with **nvm**, the script loads nvm itself.
- **Running it from a terminal.** You can also start it there with `./"Start Reading List.command"`.
- **A shortcut.** To get one on your Desktop, make an alias (or symlink) to the *project folder*, not to
  the script. The script finds the project from its own location, so the shortcut must lead to the real
  folder. On this machine the project lives in `~/Developer/project setup`, with a Desktop link called
  "Reading List".

### Two terminals (any OS)

The backend and frontend run in two separate terminals.

**Terminal 1 — backend** (from `backend/`):

```bash
source venv/bin/activate && python manage.py runserver
```

The API server starts at <http://127.0.0.1:8000/>, and the admin is at <http://127.0.0.1:8000/admin/>.

**Terminal 2 — frontend** (from `frontend/`):

```bash
npm run dev
```

Open <http://localhost:5173/>. Start the backend first; otherwise the page shows *"Cannot reach the
server"*. If you start the backend afterwards, click **Try again**.

Stop either server with `Ctrl+C` in its terminal.

## 13. API documentation

**Base URL:** `http://127.0.0.1:8000/api/`
- Every request and response body is JSON.
- No authentication is required (see [Future improvements](#16-future-improvements)).
- Open any endpoint in a browser to get DRF's interactive *browsable API*.
- **URLs end with a slash.** A GET to `/api/books` is redirected (301) to `/api/books/`, but a POST,
  PUT, PATCH or DELETE without the slash fails (see [Troubleshooting](#15-troubleshooting)).

### Endpoints

| Method | URL                 | Action                        | Success | Error statuses |
| ------ | ------------------- | ----------------------------- | ------- | -------------- |
| GET    | `/api/`             | Index of available resources  | 200 | — |
| GET    | `/api/books/`       | List books (newest change first) | 200 | 400 bad filter |
| POST   | `/api/books/`       | Create a book                 | 201 | 400 |
| GET    | `/api/books/{id}/`  | Retrieve one book             | 200 | 404 |
| PUT    | `/api/books/{id}/`  | Replace a book (all required fields) | 200 | 400, 404 |
| PATCH  | `/api/books/{id}/`  | Update only the fields sent   | 200 | 400, 404 |
| DELETE | `/api/books/{id}/`  | Delete a book                 | 204 (no body) | 404 |
| GET    | `/api/genres/`      | List genres (alphabetical)    | 200 | — |
| POST   | `/api/genres/`      | Create a genre                | 201 | 400 |
| GET    | `/api/genres/{id}/` | Retrieve one genre            | 200 | 404 |
| PUT    | `/api/genres/{id}/` | Replace a genre               | 200 | 400, 404 |
| PATCH  | `/api/genres/{id}/` | Update only the fields sent   | 200 | 400, 404 |
| DELETE | `/api/genres/{id}/` | Delete a genre                | 204 (no body) | 404, **409 if books still use it** |

### Book

**Response body** (single object; list endpoints return an array of these):

```json
{
  "id": 1,
  "title": "The Hobbit",
  "author": "J. R. R. Tolkien",
  "genre": 1,
  "genre_name": "Fantasy",
  "status": "finished",
  "rating": 5,
  "finished_on": "2026-03-14",
  "notes": "Re-read before starting The Lord of the Rings.",
  "created_at": "2026-02-01T10:00:00Z",
  "updated_at": "2026-03-14T20:00:00Z"
}
```

**Request body (POST / PUT):**

```json
{
  "title": "Dune",
  "author": "Frank Herbert",
  "genre": 2,
  "status": "reading",
  "rating": null,
  "finished_on": null,
  "notes": ""
}
```

| Field         | Type | Required | Rules |
| ------------- | ---- | -------- | ----- |
| `title`       | string | yes | 1–200 characters; surrounding whitespace is trimmed |
| `author`      | string | yes | 1–120 characters |
| `genre`       | integer | yes | ID of an existing genre (otherwise: "This genre no longer exists. Please choose another.") |
| `status`      | string | no (default `want_to_read`) | One of `want_to_read`, `reading`, `finished` |
| `rating`      | integer or null | no | 1–5; **only allowed when `status` is `finished`** |
| `finished_on` | `YYYY-MM-DD` or null | no | Not in the future; **only allowed when `status` is `finished`** |
| `notes`       | string | no | Any length; may be empty |
| `id`, `genre_name`, `created_at`, `updated_at` | — | read-only | Ignored if sent |

**Order of checks.** DRF first checks each field on its own (required, type, length, range). Cross-field
rules run only if every field passes. So `{"status": "reading", "rating": 9}` first returns only the
1–5 range error; once the rating is fixed, a second request may then return "Only finished books can
have a rating."

For **PATCH**, the "only when finished" rules are checked against the combination of the fields sent
and the values already saved. For example, `{"status": "reading"}` on a rated book is rejected unless
`"rating": null` is sent with it.

**Filtering** (`GET /api/books/`):

| Query parameter | Example | Effect |
| --------------- | ------- | ------ |
| `status` | `?status=reading` | Only books with that status. An unknown value returns 400 |
| `genre`  | `?genre=2` | Only books in that genre. A non-numeric value returns 400; an unknown id returns `[]` |

You can combine them, e.g. `?status=finished&genre=3`.

### Genre

**Response body:**

```json
{ "id": 1, "name": "Fantasy", "description": "Magic, other worlds, and quests.", "created_at": "2026-01-10T09:00:00Z" }
```

| Field         | Type   | Required | Rules |
| ------------- | ------ | -------- | ----- |
| `name`        | string | yes      | 1–50 characters; must be unique, ignoring upper/lower case |
| `description` | string | no       | May be empty |
| `id`, `created_at` | — | read-only | |

### Error responses

All errors are JSON in one of two shapes.

**Validation errors (400)** map each field name to a list of messages, so the frontend can show each
one under the matching input:

```json
{
  "title": ["This field is required."],
  "rating": ["Only finished books can have a rating."]
}
```

**Other errors (404, 409, …)** use a single `detail` message:

```json
{ "detail": "Cannot delete \"Fantasy\" because 1 book(s) still use it. Move or delete those books first." }
```

### Example requests

Run these with the backend running and the sample data loaded. `-i` prints the status line and headers
before the body. **Keep the quotes around each URL**: zsh, the default macOS shell, treats an unquoted
`?` as a filename wildcard and fails with `no matches found`.

**List the finished books.** Expect `HTTP/1.1 200 OK` and two books:

```bash
curl -i "http://127.0.0.1:8000/api/books/?status=finished"
```

**Create a book.** Expect `201 Created` and the new book, including its `id`:

```bash
curl -i -X POST "http://127.0.0.1:8000/api/books/" -H "Content-Type: application/json" -d '{"title": "Hyperion", "author": "Dan Simmons", "genre": 2}'
```

**Mark book 2 (Dune) as finished with a rating.** Expect `200 OK`:

```bash
curl -i -X PATCH "http://127.0.0.1:8000/api/books/2/" -H "Content-Type: application/json" -d '{"status": "finished", "rating": 4}'
```

**Try to delete genre 1 (Fantasy).** Expect `409 Conflict`, because *The Hobbit* still uses it:

```bash
curl -i -X DELETE "http://127.0.0.1:8000/api/genres/1/"
```

These requests change your data. To reset books 1–5 and genres 1–4 to the sample values, run
`python manage.py loaddata sample_data`. Books you created stay; delete them in the app or the admin.

## 14. Testing

**Backend:** 57 tests in `backend/apps/library/tests/`. Run them from `backend/` with the venv active:

```bash
python manage.py test
```

Expected output ends with `Ran 57 tests … OK`. For one line per test, add `-v 2`.

- Django creates a **separate empty test database** for each run and rolls back after every test.
  Your `db.sqlite3` is never touched.
- To run one module, one class, or one test, give its dotted path:

  ```bash
  python manage.py test apps.library.tests.test_book_api
  ```

  ```bash
  python manage.py test apps.library.tests.test_book_api.BookApiTests.test_filter_by_status
  ```

| Module | Tests | What they prove |
| ------ | ----: | --------------- |
| `test_genre_api.py` | 12 | Genre CRUD, ordering, 404. Duplicate names ignoring case and surrounding spaces, including on rename. A genre may change the case of its own name. Blank and too-long names. 409 when deleting a genre in use |
| `test_book_api.py` | 31 | Create with defaults and as finished. Today's date is accepted. Whitespace trimmed; read-only fields ignored. Every validation rule (required fields, lengths, status, genre, rating range, "only when finished" for rating *and* date, future date). 404s, including a non-numeric id. Ordering. **One SQL query for the list.** Each filter and both combined. PUT and PATCH behaviour; `updated_at` changes. Delete |
| `test_models.py` | 8 | The **database itself** rejects bad rows that skip the serializer: duplicate genre (any case), rating or finished date on an unfinished book. `PROTECT` blocks deleting a genre in use. `__str__` and defaults |
| `test_project_setup.py` | 6 | The API index lists both resources. CORS allows the frontend origin, refuses others, and answers the preflight. Admin pages load, and the admin form shows DB-constraint errors |

**Measuring coverage (optional).** `coverage` is deliberately not in `requirements.txt`, because the app
doesn't need it to run. To measure coverage, install it into your venv, run it, then uninstall it if you
like:

```bash
pip install coverage
```

```bash
coverage run --source=apps,config manage.py test && coverage report -m --omit="*/migrations/*,*/tests/*"
```

At the end of Phase 7 the result was 95% of lines. The only uncovered lines are `wsgi.py` and `asgi.py`
(production entry points) and the missing-secret-key branch in `settings.py` (checked by hand).

**Frontend:** there are no automated frontend tests yet (see [Future improvements](#16-future-improvements)).
Two automatic checks run from `frontend/`:

```bash
npm run lint
```

```bash
npm run build
```

- **`npm run lint`** runs oxlint, which catches broken Rules of Hooks, missing effect dependencies and
  similar mistakes. It should report 0 warnings.
- **`npm run build`** fails on syntax errors and broken imports.

**Manual browser checklist.** Last run in full in Phase 6; the error paths were re-run after the DRF upgrade
in Phase 7. Repeat it after significant changes:

| Area | Check |
| ---- | ----- |
| List | All books show. Status and genre filters update the URL and the list. A refresh keeps the filters. *Clear filters* resets them. No matches shows "No matching books". `?status=lost` shows the server's message |
| Create | An empty submit shows three field errors and sends **no** request. Typing clears that field's error. *Finished* reveals Rating and Finished on. A future date is rejected. A valid submit opens the new book |
| Edit | The form is prefilled. Switching to *Reading* hides the rating and clears it on save |
| Server errors | A genre deleted while the form is open shows "This genre no longer exists…" under Genre, and the typed values are kept |
| Detail | Facts, notes with line breaks, and dates without time-zone shift. Cancelling Delete keeps the book. Confirming Delete returns to the list, and Back skips the deleted page |
| Genres | Add, then the form resets. Duplicate name (any case): error under Name. Rename in place. Deleting a genre in use shows the 409 message; deleting an unused one works |
| Not found | `/books/9999`, `/books/abc`, `/books/9999/edit` show "Book not found"; other URLs show "Page not found" |
| Backend down | "Cannot reach the server", and *Try again* recovers once Django is back |
| Layout | Phone width (375 px), no horizontal scroll, on every page. Light and dark themes |
| Console | No React warnings. Only expected network errors for requests that failed on purpose |

## 15. Troubleshooting

**`python3 -m venv` creates an environment but `pip install django` fails or installs an old version.**
macOS ships Python 3.9 as `/usr/bin/python3`, which Django 5.2 does not support.
Create the virtual environment with an explicit newer interpreter: `python3.11 -m venv venv`.

**`ImproperlyConfigured: DJANGO_SECRET_KEY is not set`.**
`backend/.env` is missing or has no key. Run `cp .env.example .env` in `backend/` and fill in a generated key.

**`DisallowedHost: Invalid HTTP_HOST header`, or HTTP 400 for every request.**
The host name you used is not listed in `DJANGO_ALLOWED_HOSTS`. Add it (comma-separated) in `backend/.env`.

**`ModuleNotFoundError: No module named 'django'`.**
The virtual environment is not active in this terminal. Run `source venv/bin/activate` from `backend/`.

**`You have 18 unapplied migration(s)` when starting the server.**
Expected until you run `python manage.py migrate` (see [Migrations](#11-migrations)).

**`no such table: library_book` (or `library_genre`).**
The database exists but migrations haven't been applied. Run `python manage.py migrate`.

**`RuntimeError: You called this URL via POST, but the URL doesn't end in a slash`.**
API URLs end in `/`. Use `/api/books/`, not `/api/books`. `CommonMiddleware` (`APPEND_SLASH`) can
redirect a GET to the slashed URL, but not a POST, because browsers drop the request body on redirect.

**`IntegrityError: CHECK constraint failed` or `UNIQUE constraint failed`.**
A write bypassed the serializer (e.g. code in `manage.py shell`) and the database rejected it.
The API itself returns 400 for these cases; if the API ever returns a 500 like this, a validation rule
is missing from `serializers.py`.

**Is it safe to run `loaddata sample_data` twice?**
Yes. The fixture has fixed IDs, so a second run overwrites rows 1–4 (genres) and 1–5 (books) with the
sample values instead of duplicating them. Any edits you made to those rows are lost, though. It fails
with `UNIQUE constraint failed` only if you created a genre with a sample name (e.g. "Fantasy") under a
different ID. In that case, rename or delete that genre, or start over (see [Database setup](#10-database-setup)).

**`python manage.py …` or `npm run dev` hangs forever, printing nothing (macOS).**

**Likely cause:** the project is in an iCloud-synced folder (Desktop or Documents, with "Desktop &
Documents Folders" turned on), and "Optimize Mac Storage" has moved files to the cloud. Reading such a
"dataless" placeholder waits for a download; if the download stalls, Python or Node waits forever.
Servers that are already running keep working, because their files are already in memory.

**Confirm it:** run this from the project folder. A large number means files have been evicted.

```bash
find backend frontend -flags +dataless | wc -l
```

**Fix it**, in order of preference:
1. **Move the project out of iCloud**, e.g. to `~/Developer/`. This is best for code, because `venv/`
   and `node_modules/` are rebuilt from `requirements.txt` and `package-lock.json` anyway.
   - Make sure the source files themselves are downloaded first: in Finder, right-click the project
     folder and choose **Download Now**.
   - After moving, delete and recreate `backend/venv` and `frontend/node_modules`.
2. **Download the files in place.** Right-click the project folder in Finder and choose **Download Now**.
   This works until macOS evicts them again.
3. **Free disk space.** Eviction happens when the disk is nearly full.

**The project path contains a space (`project setup`).**
Always quote the path in terminal commands, e.g. `cd "project setup"`.

**`npm install` hangs.**
A global npm config may point at a slow or unreachable mirror. Inside `frontend/`, `npm config get registry`
should print `https://registry.npmjs.org/`, thanks to `frontend/.npmrc`. If it doesn't, check that you are
in the `frontend/` folder.

**The frontend shows "Cannot reach the server".**
The Django server isn't running, or `VITE_API_BASE_URL` points somewhere else. Start the backend, check
<http://127.0.0.1:8000/api/> in the browser, then click **Try again**.

**The browser console shows `blocked by CORS policy: No 'Access-Control-Allow-Origin' header`.**
The page's origin isn't in the backend's `CORS_ALLOWED_ORIGINS`. Compare the address bar (`localhost` and
`127.0.0.1` count as *different* origins, and so do different ports) with `backend/.env`, then restart Django.

**`npm run dev` fails with `Port 5173 is already in use`.**
Another dev server is still running. Stop it, or find it with `lsof -i :5173`. The port is fixed on purpose
(`strictPort` in `vite.config.js`), because a different port would be blocked by CORS.

**Blank white page, with `VITE_API_BASE_URL is not set` in the browser console.**
`frontend/.env` is missing. Run `cp .env.example .env` in `frontend/` and restart `npm run dev`.

**I changed `frontend/.env` but nothing happened.**
Vite reads `.env` only at startup. Stop `npm run dev` with `Ctrl+C` and start it again.

**Every API request appears twice in the browser's Network tab.**
Expected in development. React's `StrictMode` (in `main.jsx`) runs effects twice to expose bugs.
Production builds make each request once.

**The browser console shows `Failed to load resource: … 400 (Bad Request)` (or 404/409).**
Browsers log *every* failed HTTP request, even when the app handles it correctly (e.g. a form the server
rejected). If the page shows a sensible message, nothing is wrong.

**A genre I just added doesn't appear in the book form's dropdown.**
Each page loads its data when it opens. Navigate to the form again, or refresh, to reload the genres.

**`npm warn EBADENGINE` or React Router errors on install.**
Your Node.js version is older than 22.22. Upgrade Node (e.g. `nvm install 24`).

## 16. Future improvements

- User accounts and authentication (each user sees only their own books).
- Pagination of the book list.
- Text search across title and author (planned as a learning exercise).
- Frontend unit tests (Vitest + React Testing Library), e.g. for `useApiData` and form validation.
- A custom confirmation dialog instead of the browser's `window.confirm`.
- A warning when leaving a form with unsaved changes.
- Data caching between pages, e.g. TanStack Query, so the genre list isn't refetched on every page.
- PostgreSQL configuration for production. This would also make the case-insensitive genre-name check work
  for non-English letters: on SQLite, "Émile" and "émile" count as different names.
- Return 400 rather than 500 in the rare case where two identical genre names are submitted at the same
  moment. Both pass the serializer check, then the database constraint rejects the second.
- **Deployment configuration.** Serve static files, and use a production WSGI server (e.g. Gunicorn).
  `python manage.py check --deploy` currently lists five settings to change before going live:
  - `DEBUG = False`
  - `SECURE_SSL_REDIRECT`
  - `SECURE_HSTS_SECONDS`
  - `SESSION_COOKIE_SECURE`
  - `CSRF_COOKIE_SECURE`
