# Reading List — Backend

Django 5.2 + Django REST Framework API for the Reading List app.
For the overall project, see the [root README](../README.md).

> **Status:** API complete and tested: models, migrations, CRUD endpoints, validation, admin, and 57 tests
> (95% line coverage).
> Full endpoint reference: [root README §13](../README.md#13-api-documentation).

## Folder layout

```
backend/
├── config/            # The Django *project*: configuration only, no business logic
│   ├── settings.py    # All settings; secrets/env-specific values read from .env
│   ├── urls.py        # Root URL table: /admin/ and /api/ (delegates to apps/library/urls.py)
│   ├── wsgi.py        # Entry point for traditional (sync) production servers
│   └── asgi.py        # Entry point for async-capable production servers
├── apps/
│   ├── __init__.py    # Makes "apps" a Python package so "apps.library" can be imported
│   └── library/       # The Django *app*: everything about books and genres
│       ├── models.py        # Genre, Book; field validators; database constraints
│       ├── serializers.py   # GenreSerializer, BookSerializer: JSON <-> model, validation
│       ├── views.py         # GenreViewSet, BookViewSet: HTTP behaviour, filtering
│       ├── exceptions.py    # GenreInUse: the 409 error for deleting a genre in use
│       ├── urls.py          # DRF router that generates the /books/ and /genres/ URLs
│       ├── admin.py         # How the models appear in Django Admin
│       ├── tests/           # python manage.py test
│       │   ├── test_genre_api.py      # /api/genres/ behaviour
│       │   ├── test_book_api.py       # /api/books/ behaviour
│       │   ├── test_models.py         # database constraints, without HTTP
│       │   └── test_project_setup.py  # API index, CORS, admin
│       ├── apps.py          # App config: name = "apps.library", label = "library"
│       ├── fixtures/sample_data.json   # Demo data for `loaddata`
│       └── migrations/0001_initial.py  # Creates library_genre and library_book
├── db.sqlite3         # The database (git-ignored, created by `migrate`)
├── venv/              # Python virtual environment (git-ignored, created per machine)
├── manage.py          # Command-line entry point: runserver, migrate, test, shell …
├── requirements.txt   # Exact pinned dependencies
├── .env.example       # Template listing every environment variable (committed)
└── .env               # Your real values (git-ignored, you create it)
```

## Setup

All commands are run from the `backend/` folder. The project path contains a space, so keep the quotes.

```bash
cd "/path/to/project setup/backend"
```

**1. Create the virtual environment** with Python 3.10 or newer (3.11 used here). On macOS, plain
`python3` may be 3.9, which Django 5.2 does not support.

```bash
python3.11 -m venv venv
```

**2. Activate it.** Your prompt will show `(venv)`. Do this in every new terminal.

```bash
source venv/bin/activate
```

**3. Install dependencies.**

```bash
pip install -r requirements.txt
```

**4. Create your `.env` file** from the template.

```bash
cp .env.example .env
```

**5. Generate a secret key** and paste it into `.env` as the value of `DJANGO_SECRET_KEY`, inside the single quotes.

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

**6. Check the configuration.** Expected output: `System check identified no issues (0 silenced).`

```bash
python manage.py check
```

**7. Create the database tables.**

```bash
python manage.py migrate
```

**8. Load the sample data (optional):** 4 genres and 5 books.

```bash
python manage.py loaddata sample_data
```

**9. Create an admin login (optional)** for <http://127.0.0.1:8000/admin/>.

```bash
python manage.py createsuperuser
```

**10. Run the tests.** Expected: `Ran 57 tests … OK`.

```bash
python manage.py test
```

**11. Start the development server.**

```bash
python manage.py runserver
```

Open <http://127.0.0.1:8000/api/> to see the browsable API index, which links to `/api/books/` and
`/api/genres/`. Stop the server with `Ctrl+C`.

## Environment variables

Defined in `.env`, loaded by `python-dotenv` at the top of `config/settings.py`.
A variable set in the real shell environment takes priority over the file.

| Variable               | Required | Default (if unset)      | Purpose |
| ---------------------- | -------- | ----------------------- | ------- |
| `DJANGO_SECRET_KEY`    | **Yes**  | — (startup fails)       | Signs sessions, CSRF tokens, password-reset links. Must be secret and unique per installation. |
| `DJANGO_DEBUG`         | No       | `False`                 | `True` shows detailed error pages and serves static files. Development only. |
| `DJANGO_ALLOWED_HOSTS` | No       | `localhost,127.0.0.1`   | Host names the server will answer to; other `Host` headers get HTTP 400. |
| `CORS_ALLOWED_ORIGINS` | No       | empty (no origins)      | Browser origins allowed to call the API, e.g. the React dev server `http://localhost:5173`. |

Why the defaults look like this:

- **No default secret key.** A fallback would end up committed to git and shared by every copy of the project.
- **`DEBUG` defaults to `False`.** Forgetting the variable is then safe, not dangerous.

## Dependencies

| Package               | Version | Why it is here |
| --------------------- | ------- | -------------- |
| Django                | 5.2.19  | Web framework, ORM, migrations, admin |
| djangorestframework   | 3.18.3  | Serializers, ViewSets, routers, browsable API |
| django-cors-headers   | 4.9.0   | Adds CORS headers so the React dev server may call the API |
| python-dotenv         | 1.2.4   | Reads `.env` into environment variables |
| asgiref, sqlparse     | —       | Installed automatically as Django's own dependencies |

To add a package: `pip install <name>`, then update `requirements.txt` with its exact version and a
short comment saying why it is needed.

## Common commands

| Command                              | What it does |
| ------------------------------------ | ------------ |
| `python manage.py runserver`         | Start the dev server on port 8000 (auto-reloads on code changes) |
| `python manage.py check`             | Validate settings and code without starting the server |
| `python manage.py shell`             | Python shell with Django loaded, for trying ORM queries |
| `python manage.py makemigrations`    | Write a migration file after changing `models.py` |
| `python manage.py migrate`           | Apply database migrations |
| `python manage.py showmigrations`    | List migrations and whether each is applied |
| `python manage.py loaddata sample_data` | Load the demo genres and books |
| `python manage.py createsuperuser`   | Create an admin login |
| `python manage.py test`              | Run the backend test suite |
| `python manage.py dbshell`           | Open a SQL prompt on the database |
| `deactivate`                         | Leave the virtual environment |

## Where validation happens

| Rule | Field validator (`models.py`) | DB constraint (`models.py` Meta) | Serializer (`serializers.py`) |
| ---- | :---: | :---: | :---: |
| Required fields, max lengths, valid status choice | ✔ (field options) | ✔ (`NOT NULL`, `varchar`) | ✔ (generated automatically) |
| Rating between 1 and 5 | ✔ | — | ✔ (generated from the field validator) |
| Finished date not in the future | ✔ | — (the database can't compare with "today") | ✔ (generated from the field validator) |
| Rating / finished date only on finished books | — | ✔ `CheckConstraint` | ✔ `validate()` |
| Genre name unique, ignoring case | — | ✔ `UniqueConstraint(Lower("name"))` | ✔ `validate_name()` |

- **The serializer** produces the friendly, per-field `400` messages for the API.
- **The database constraints** are the safety net for any other code path: the admin turns them into
  form errors, and a script in `manage.py shell` would get an `IntegrityError`.

## PUT vs PATCH in DRF: a detail worth knowing

| Request | Required fields | Optional fields left out of the body |
| ------- | --------------- | ------------------------------------ |
| `PUT`   | must all be sent (else 400) | **keep their saved values.** They are *not* reset to defaults |
| `PATCH` | may be left out | keep their saved values |

So to clear an optional field you must send it explicitly, e.g. `"rating": null`. For example, a PUT of
`{"status": "reading", ...}` without `rating` on a rated book is rejected with "Only finished books can
have a rating.", because the saved rating still applies. The frontend's `toBookPayload()` always sends
`rating` and `finished_on` (as `null` when cleared) for this reason. Both cases are covered by
`test_put_leaves_omitted_optional_fields_unchanged` and `test_put_to_unfinished_must_clear_rating_explicitly`.
