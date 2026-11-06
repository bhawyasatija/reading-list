# Development Notes

A running log of what has been built, the decisions made, and problems encountered.
Newest phase at the top of the **Phase log**.

---

## Current status

**Summary (end of Phase 8).** The application is complete, tested and documented.

| Area | State | How to check it yourself |
| ---- | ----- | ------------------------ |
| Backend API | Book and Genre CRUD, filters, validation in three layers, 409 for a genre in use, admin | `python manage.py test`: 57 tests OK |
| Database | SQLite, one migration (`0001_initial`), 3 constraints, sample-data fixture | `python manage.py showmigrations`, `python manage.py dbshell` |
| Frontend | 5 routes, full CRUD, URL filters, browser and server validation, loading, error, empty and not-found states | `npm run lint` (0 warnings), `npm run build`, README §14 checklist |
| Integration | CORS configured from `.env`; every service function checked against the real API | README §13 curl examples |
| Setup | Quick start and full instructions checked on a clean copy | README *Quick start* |
| Dependencies | All current: Django 5.2.19 LTS, DRF 3.18.3, React 19.3, Router 8.5, Vite 8.3. 0 npm vulnerabilities, `pip check` clean | `npm audit`, `pip list --outdated` |
| Docs | README (16 sections + Quick start), backend and frontend READMEs, ARCHITECTURE, this file. Links, paths, function names and tables audited | — |

**Known limitations** (all documented in ARCHITECTURE §7.8): no frontend automated tests (D52), SQLite
case-insensitivity is ASCII-only (P20), the rare simultaneous-duplicate 500, and the UTC-versus-local
"today" near midnight.

| Phase | Description                                   | Status      |
| ----- | --------------------------------------------- | ----------- |
| 1     | Environment inspection and application proposal | ✅ Done |
| 2     | Root directory and project structure          | ✅ Done |
| 3     | Python environment and Django backend setup   | ✅ Done |
| 4     | Database and API implementation               | ✅ Done |
| 5     | React frontend setup                          | ✅ Done |
| 6     | Frontend–backend integration                  | ✅ Done |
| 7     | Testing and debugging                         | ✅ Done |
| 8     | Documentation completion                      | ✅ Done |
| 9     | Codebase walkthrough (CODEBASE_GUIDE.md)      | ✅ Done (fully verified after the move) |
| 10    | Interactive technical assessment              | — |

## Remaining tasks

- [ ] Create your own admin login: `python manage.py createsuperuser` (developer; the assistant doesn't set passwords).
- [ ] When you're happy with the new location, drag `~/Desktop/paas/project setup (old copy - moved to Developer)`
  to the Bin yourself. The assistant renamed it but didn't delete it.
- [ ] Phase 10: interactive technical assessment.
- [x] Committed and pushed to the private GitHub repository
  [bhawyasatija/reading-list](https://github.com/bhawyasatija/reading-list) (branch `main`).

Frontend unit tests (Vitest) were offered in Phase 7 and **declined for now** (D52). They are listed under
README *Future improvements*.

---

## Decision log

| # | Decision | Alternatives considered | Reason |
| - | -------- | ----------------------- | ------ |
| D1 | Build a **Reading List** app (Book + Genre) | Task manager, expense tracker | Familiar domain; small enough to understand fully; naturally has a one-to-many relationship and meaningful validation rules. |
| D2 | **Python 3.11** for the virtual environment | System Python 3.9 | Django 5.x requires Python ≥ 3.10. 3.11 is installed and supported by Django 5.2. |
| D3 | **Django 5.2 LTS** | Django 6.0 | 6.0 requires Python ≥ 3.12 (not installed) and is not a long-term-support release. 5.2 is supported until April 2028. |
| D4 | **One Django app** (`library`) inside an `apps/` package | Separate `books` and `genres` apps | The two models are tightly coupled; splitting would add cross-app imports with no real benefit. |
| D5 | `Book.genre` uses **`on_delete=PROTECT`**, surfaced as HTTP 409 | `SET_NULL`, `CASCADE` | Prevents silent data loss and demonstrates a real integrity rule and error path. |
| D6 | **CORS via django-cors-headers**, origins from env | Vite dev proxy | Explicit and closer to how a separately deployed frontend would work. |
| D7 | **Project-level `frontend/.npmrc`** pinning `registry.npmjs.org` | Change the developer's global npm config | Fixes the problem for anyone who clones the repo, without touching machine-wide settings. |
| D8 | **Single root `.gitignore`** | Separate ignore files per sub-project | One place to read and maintain; patterns apply at any depth. |
| D9 | Create `backend/` and `frontend/` **in their own phases**, not empty now | Create empty folders up front | Git does not track empty folders, and `npm create vite` expects to create the `frontend/` folder itself. |
| D10 | **No authentication or pagination** in v1 | Token auth, page-number pagination | Single-user local app; keeps the codebase small. Listed as future improvements. |
| D11 | **`python-dotenv` + two tiny helpers** (`env_bool`, `env_list`) in `settings.py` | `django-environ`, `python-decouple` | The brief named python-dotenv; four variables don't justify an extra library. The helpers are 10 readable lines. |
| D12 | **Missing `DJANGO_SECRET_KEY` stops startup**; **`DEBUG` defaults to `False`** | A fallback dev key; `DEBUG` defaults to `True` | Any fallback key would be committed to git. Safe defaults mean a forgotten variable can't expose debug pages. |
| D13 | **`requirements.txt` pins exact versions** (`==`) and splits direct from transitive dependencies with comments | Ranges (`>=`), raw `pip freeze` output | Exact pins make installs reproducible; the comments show which packages were chosen on purpose and why. |
| D14 | **Migrations are applied in Phase 4**, not 3 | Run `migrate` straight away | Phase 4 is where the database is introduced and explained, so the "unapplied migrations" warning is left visible until then. |
| D15 | **Validation in three layers**: field validators, DB constraints, serializer `validate()` | Serializer only; logic in `Model.clean()` | Serializer-only validation would let the admin and scripts write invalid rows. DRF doesn't call `Model.clean()`. Field validators are shared automatically, and constraints protect every code path. |
| D16 | Genre uniqueness via **`UniqueConstraint(Lower("name"))`** instead of `unique=True` | `unique=True` plus a serializer check | `unique=True` is case-sensitive. A functional constraint enforces the real rule in the database, and it works on both SQLite and PostgreSQL. |
| D17 | **`finished_on` is also only allowed on finished books** | Only checking that the date isn't in the future | Refines the Phase 1 design. A "finished date" on an unread book is contradictory, and it uses the same rule as `rating`. |
| D18 | 409 via a **`GenreInUse(APIException)`** raised in **`perform_destroy`** | Overriding `destroy()` and returning a `Response` | `perform_destroy` is DRF's hook for "how to delete". Raising an APIException reuses DRF's standard error format and handling. |
| D19 | **Hand-written filtering** in `BookViewSet._apply_filters()` | `django-filter` | Two filters don't justify a dependency, and the code shows exactly how query parameters reach the ORM. |
| D20 | **Invalid filter values return 400**, not silently ignored | Ignore unknown values | A typo like `?status=finsihed` returning every book would hide bugs. |
| D21 | **Sample data as a fixture** (`fixtures/sample_data.json`) | A custom management command; a data migration | `loaddata` is Django's standard tool. Sample data shouldn't be a migration, because a migration would also run in production. |
| D22 | **`AllowAny` stated explicitly** in `REST_FRAMEWORK` | Rely on the implicit default | Makes "everything is public" a visible decision, and shows where to change it when auth is added. |
| D23 | **No `createsuperuser` by the assistant** | Create one with a generated password | The admin account belongs to the developer; setting passwords is left to them. The admin was verified with a temporary user inside a rolled-back transaction. |
| D24 | **React Router 8 and Vite 8**, the current stable majors, instead of the planned Router 7 | React Router 7.18 (maintenance line) | Both v8 lines are mature (Router 8.0 June 2026, now 8.5.1; Vite 8.0 March 2026, now 8.3.6). Starting on a maintenance line would mean a migration later. The cost is Node ≥ 22.22, which the machine has (24.16). |
| D25 | React Router in **declarative mode** (`BrowserRouter` / `Routes`) | Data mode (`createBrowserRouter` + loaders) | Data mode would add a second data-loading mechanism alongside the service layer and hook. Declarative mode keeps "URL → component" easy to trace. |
| D26 | **Keep oxlint** from the template, and enable `react/exhaustive-deps` | Swap in ESLint | It's the template default and fast. The extra rule catches stale effect dependencies, which was checked with a deliberately broken file. |
| D27 | **A small custom hook `useApiData`** for loading, error and data | TanStack Query; React 19 `use()` + Suspense | About 50 lines that a junior can read completely. A data library is worth it once caching and retries matter. |
| D28 | **`isLoading` derived during render**, not stored in state | `setIsLoading(true)` at the start of the effect | Avoids a cascading render (the lint warning in P11), and the flag can't drift out of sync with the data. |
| D29 | **Pages fetch, components only render** (components never import `services/`) | Components fetching their own data | Components become reusable and easy to reason about, and the data flow is visible in one place per page. |
| D30 | **`strictPort: true`** on Vite's dev server | Let Vite pick the next free port | Any port other than 5173 is blocked by the backend's CORS list, which fails with confusing errors. A clear "port in use" error is better. |
| D31 | **The edit form will use PUT**, not PATCH | PATCH with only the changed fields | The form always submits every field, so "replace the resource" is the accurate method. PATCH remains available to API clients. |
| D32 | **One CSS file per component**, with name-prefixed classes and CSS variables in `index.css` | CSS Modules; one big stylesheet; Tailwind | Plain CSS as briefed, files that are easy to find, and no extra build concepts. The prefixes prevent clashes between components. |
| D33 | **Caret ranges in `package.json` plus a committed `package-lock.json`** | Exact pins (`save-exact`) like the backend | This is the npm convention. The lockfile already guarantees reproducible installs (`npm ci`), and the ranges make upgrades simpler. |
| D34 | **Phase 5 ships the read-only book list** as its proof of integration; full CRUD pages in Phase 6 | Only the shell, with no data | The smallest real page proves the whole chain (Vite → Axios → CORS → DRF → ORM → render) before more is built on it. |
| D35 | **A `useFormState` hook** shared by `BookForm` and `GenreForm` | Duplicate the logic in each form; a form library (React Hook Form, Formik) | The same 5-step submit flow in two places would drift apart. About 100 commented lines are easier to learn than a library's API. |
| D36 | **Forms receive `onSubmit` and the page calls the API** | The form imports `booksApi` itself | Keeps the "components never call services" rule (D29). One `BookForm` serves create and edit, and one `GenreForm` serves add and inline rename. |
| D37 | **One `BookFormPage` for `/books/new` and `/books/:bookId/edit`** | Two separate pages | They differ only in the starting values and which API function saves them; `isEditing = bookId !== undefined`. |
| D38 | **Rating and Finished on are hidden unless the status is Finished**, and sent as `null` otherwise | Always show them, and let the server reject the data | The UI then can't produce the server's "only finished books" error. The server still enforces the rule for other clients. |
| D39 | **Client validation mirrors only the simple rules** (required, length, future date). Duplicate names and the existence of a genre are left to the server | Also check duplicates in the browser, against the loaded list | The server is authoritative and sees changes made in other tabs or by other users. Duplicating it would be stale and a second source of truth. |
| D40 | **Filters are stored in the URL** with `useSearchParams` and `replace: true` | `useState` in the page | A refresh, a bookmark or a shared link keeps the filters; Back leaves the page instead of undoing each filter. |
| D41 | **`window.confirm` for deletes** | A custom modal component | Accessible and zero code. A styled dialog is listed under Future improvements. |
| D42 | **`navigate('/', { replace: true })` after deleting a book** | A plain `navigate('/')` | Removes the deleted book's URL from history, so Back can't reach a "not found" page. |
| D43 | **Reset the add-genre form by changing its `key`** | A `reset()` function inside `useFormState` | Uses React's own rule (a new key mounts a new component) instead of more hook code. |
| D44 | **The whole book card is clickable**, through a stretched `::after` on the title link | Wrap the card in `<a>`; an `onClick` on the `<article>` | One real link, with the title as its accessible name. It works with keyboard, middle-click and "open in new tab". |
| D45 | **Dates parsed by hand in `dates.js`** | `new Date("2026-03-14")` | That constructor reads a date-only string as midnight UTC, which shows the previous day west of UTC. |
| D46 | **A friendlier `genre` "does not exist" message**, set in `BookSerializer.Meta.extra_kwargs` | Keep DRF's `Invalid pk "7" - object does not exist.` | Found in browser testing (P14). Users shouldn't see "pk". |
| D47 | **Split `tests.py` into a `tests/` package** with one module per area | Keep one file | It would have grown to about 500 lines. Separate modules make it obvious where a new test belongs, and each area can be run on its own. |
| D48 | **Measure coverage in a throwaway venv**; document `coverage` as an optional tool, not a requirement | Add `coverage` to `requirements.txt`, or a `requirements-dev.txt` | The app doesn't need it to run. One optional command in the README is lighter than a second requirements file for a single tool. |
| D49 | **Upgrade DRF 3.16.1 → 3.18.3** | Stay on 3.16 | Phase 3 capped DRF at `<3.17` by mistake. 3.18 supports Django 5.2 and Python 3.11, and has been out for 3 months (3.18.3 for 1). Checked with all 57 tests, `pip check`, a fresh install, and an end-to-end run of every frontend error path. |
| D50 | **Test the database constraints directly** (`test_models.py`) | Rely on the API tests | The constraints exist for code paths that skip the serializer, so the tests skip it too. Otherwise the safety net would be untested. |
| D51 | **Mutation checks**: briefly break the code to confirm a new test fails | Trust that green tests are meaningful | A test that can't fail proves nothing. Checked for the PATCH rule (Phase 4), `select_related` (7 queries instead of 1), and the CORS middleware. |
| D52 | **No frontend test framework yet**, raised as an option instead | Add Vitest now | The brief asked for backend tests; a new dev dependency should be your decision. The candidate targets are the pure functions, where the HTML-400 bug (P17) was found by hand. |
| D53 | **`console.error` for non-HTTP errors** in `getErrorMessage()` | Show the message only | The user sees one line. The developer needs the stack trace to find a bug in our own code. |
| D54 | **A Quick start at the top of the README**, including a one-line command that writes a secret key into `.env` | Only the full step-by-step sections | A newcomer can be running in a few commands; the numbered sections still explain every step. The one-liner removes the error-prone copy-and-paste. Both were checked on a clean copy. |
| D55 | **User-facing READMEs describe the current state, not phases** | "Current state (Phase 6)" labels | A reader cares what *is*, not when it was built. The phase history belongs in this file. |
| D56 | **Check documentation with a script**, not only by eye: links, anchors, file paths, function names, table columns | A manual reread | It found the wrong migration path (P24); the table check would have caught P22. Kept outside the repo, because it's a one-off tool. |
| D57 | **The guide quotes captured reality**: real SQL from `CaptureQueriesContext`, a real response body, and DRF's real `CreateModelMixin` source with line numbers | Write the examples from memory | Memory was wrong once: I'd claimed a protected delete runs no SQL, and it actually runs a `SELECT` first. Captured output can't drift from the truth. |
| D58 | **Exercises give requirements, hints and "think about" questions, but no solutions** | Include the solutions | As briefed: you attempt each one first, and solutions come after a review of your attempt. |
| D59 | **A double-clickable `Start Reading List.command` launcher** (zsh) that starts both servers, waits for the API, opens the browser, and stops both on Ctrl+C or when the window closes | Two terminals by hand; `npm-run-all` / `concurrently` | Your request; no new dependency. It checks the setup and the ports first and explains any problem. It loads nvm itself, because double-clicked scripts don't read your shell profile. It stops Django's reloader child before the parent to avoid a misleading traceback (P26). |
| D60 | **Relocate by copying, never by reading placeholders:** a script copied every real file, skipped iCloud placeholders and rebuildable folders, verified each file by SHA-256, then rebuilt `venv` and `node_modules` | `mv` the folder; "Download Now" first | Reading a placeholder was exactly what hung (P25). Everything that was skipped was either rebuildable (venv, node_modules, `__pycache__`, git sample hooks), unused (89 git objects that nothing refers to, with 0 commits and an empty index), or better replaced (`.env`, with a new key). The old folder was renamed, not deleted. |

---

## Problems encountered

| # | Problem | Cause | Solution |
| - | ------- | ----- | -------- |
| P1 | Default `python3` is 3.9.6 | macOS ships an old Python at `/usr/bin/python3` | Use `python3.11` explicitly when creating the venv (D2). Documented in README Troubleshooting. |
| P2 | npm registry check hung for more than 2 minutes | Global npm config points at `https://registry.npmmirror.com`, which was unresponsive; `https://registry.npmjs.org` responded immediately | Project-level `frontend/.npmrc` (D7), added in Phase 5 ✅. `npm install` there completes in seconds. |
| P3 | Project path contains a space (`project setup`) | Folder name chosen before the project started | Always quote paths in commands. Noted in README Troubleshooting. |
| P4 | `git init` failed with `.git: Operation not permitted` | The AI assistant's command sandbox forbids creating `.git/` directories | Developer ran `git init -b main` in their own terminal ✅. Ignore rules were verified separately in a temporary repo. |
| P5 | `runserver` failed in the assistant's shell with `[Errno 1] Operation not permitted`, and `curl` couldn't connect to `127.0.0.1:8000` | The assistant's sandbox blocks listening on, and connecting to, local ports | The server was started in the developer's terminal, and HTTP was checked in a browser and with Django's test client. Not a project problem: on a normal machine `runserver` works as documented. |
| P6 | The Django test client got HTTP 400 for every request in `manage.py shell` | The test client sends `Host: testserver`, which isn't in `ALLOWED_HOSTS` (the test runner adds it automatically, but `shell` doesn't) | Passed `HTTP_HOST='localhost'`. This also showed that host validation works. |
| P7 | A PATCH of `{"status": "reading"}` on a rated book could reach the database and fail the CHECK constraint (500) | On PATCH, `validate(attrs)` receives only the fields sent, so the saved `rating` was invisible to it | `BookSerializer._current_value()` falls back to the saved value. A test covers it, and temporarily removing the fallback was confirmed to make that test fail with `IntegrityError`. |
| P8 | Filter errors had a different shape from serializer errors (`{"status": "msg"}` vs `{"title": ["msg"]}`) | A `ValidationError` raised directly with a dict of strings isn't wrapped in lists, unlike one raised in `validate()` | Messages are wrapped in lists in `views.py`, and a test asserts the list shape. Found during browser testing. |
| P9 | README draft said `/api/books` (no slash) returns 404 | Assumption, not checked | Tested: GET → 301 redirect, POST → `RuntimeError` (APPEND_SLASH). README corrected. |
| P10 | The planned versions (React Router 7, "Vite current") didn't match the current stable releases (Router 8, Vite 8), and Router 8 removed `react-router-dom` | Releases since the plan was written | Checked release dates and the 8.0.0 changelog before installing (D24). Everything is imported from `react-router`. The Node minimum is documented and enforced with `engines` in `package.json`. |
| P11 | oxlint warning `react(set-state-in-effect)` in `useApiData` | `setIsLoading(true)` / `setError(null)` ran synchronously at the start of the effect, causing an extra render | Redesigned the hook to derive `isLoading` from which request the stored result belongs to (D28). Lint is now clean. |
| P12 | The page heading sat against the navbar: `.layout__main`'s top padding was ignored | `main.jsx` imported `index.css` after `App`, so the global `.container { padding: 0 … }` loaded later and overrode it (equal specificity, so the later rule wins) | Import `index.css` first, with a comment explaining why. Confirmed `padding-top: 32px` in the browser. |
| P13 | Both servers had to be run outside the assistant's sandbox | The same sandbox port restriction as P5 | Vite and Django run in the developer's Terminal panel tabs; checks were made in the in-app browser. |
| P14 | When a genre was deleted while the book form was open, the error under Genre read `Invalid pk "7" - object does not exist.` | DRF's default `does_not_exist` message for `PrimaryKeyRelatedField` | A custom message in `extra_kwargs` (D46). The test now asserts the exact text, and the change was rechecked in the browser. |
| P15 | `oxlint` printed nothing when its output was piped, which looked like it hadn't run | With no problems and no TTY, oxlint's default reporter prints no summary | Use `--format=default` (or run it in a terminal) to see `Found 0 warnings and 0 errors.` Exit code 0 confirmed. |
| P16 | The rule "only finished books can have a finished date" had **no test** | Only the matching rating rule was tested; coverage showed `serializers.py` line 82 never ran | Added API and database-level tests for it. |
| P17 | **Bug:** for a 400 response with an HTML body, the frontend showed `< ! D O C T Y P E …` letter by letter | `getErrorMessage()` called `Object.values()` on the body, which returns a string's characters. Django sends an HTML 400 for a `Host` not in `ALLOWED_HOSTS` | Read field messages only from plain objects (or lists). Reproduced before the fix; after it, 11 error shapes were checked in the browser. |
| P18 | A new test, `test_put_replaces_all_fields`, failed | The test assumed PUT resets optional fields it leaves out. DRF actually keeps them | Confirmed with a direct serializer call. The test was replaced by two that pin down the real behaviour, and it's documented in `backend/README.md`. |
| P19 | DRF was two minor versions behind | `<3.17` cap chosen in Phase 3 without checking the latest release | Upgraded (D49). |
| P20 | The case-insensitive genre check misses non-ASCII letters ("Émile" / "émile") | SQLite's `LOWER()` and `LIKE` are ASCII-only | Documented as a known limitation that goes away on PostgreSQL. The serializer and the database agree, so there's no 500. |
| P21 | A verification script crashed on its first line | It ran against the real database and tried to create "Fantasy", which exists. The `atomic()` block rolled back, and nothing changed (still 4 genres) | Re-ran with unused names. Lesson: one-off scripts should use names that can't collide, or the test database. |
| P22 | The ARCHITECTURE §8 table had two header rows and rendered broken | The Phase 6 edit replaced the rows but not the old header | Fixed. Added a column-count check across all docs: 0 problems. |
| P23 | The README's `curl http://…/api/books/?status=finished` fails in macOS Terminal with `zsh: no matches found` | zsh, the default macOS shell, treats an unquoted `?` as a filename wildcard | Quoted every URL in the examples, and explained why next to them. All four examples were then run in zsh: 200, 201, 200 and 409, as documented. |
| P24 | README §11 gave the migration path as `library/0001_initial.py` | Shortened by hand | Corrected to `backend/apps/library/migrations/0001_initial.py`. Found by the audit script (D56). |
| P25 | **Every new Django process hung at startup, printing nothing**, even `manage.py check` and even in an unsandboxed terminal. The already-running `runserver` kept answering | `faulthandler` showed Python stuck in `importlib … get_data`, reading a file. **7,003 files in `backend/`** (6,983 of them in `venv/`, plus `.env`, `__pycache__` and `__init__.py` files) and **1,301 in `frontend/node_modules`** are iCloud **"dataless" placeholders**. The project is on the iCloud-synced Desktop, the disk is 94% full (12 GB free), and macOS evicted the files; downloading them on demand stalls. `frontend/src` and `docs/` are unaffected | **Resolved: the project moved to `~/Developer/project setup`**, which isn't iCloud-synced (D60). Placeholders were skipped rather than downloaded; `venv/` and `node_modules/` were rebuilt; `backend/.env` got a **new** secret key, so the old one that was synced to iCloud is no longer used. A Desktop link "Reading List" points to the new folder. |
| P26 | (launcher) Ctrl+C printed `Exception ignored in Popen.__del__ … SystemExit: 0` | The script killed Django's reloader child and immediately sent SIGTERM to the parent while it was cleaning up its child | Stop the child, wait up to 2 s for the parent to exit on its own, and only then signal it. Retested: clean output, both ports free. |

---

## Phase log

### Published to GitHub

**Before committing,** all 86 files were reviewed:
- There are no real `.env` files; only the two `.env.example` templates are included.
- `db.sqlite3`, `venv/`, `node_modules/`, `.claude/` and the ChatGPT briefing are all git-ignored.
- A secret scan found no real key and no token-like strings. The largest file is the 68 KB codebase guide.

**The commit:** a single initial commit, `9f3f405`, authored by Bhawya, with **no co-author or tool
attribution lines**, at the developer's request.

**On GitHub:** the private repository `bhawyasatija/reading-list` was created with `gh repo create
--private --source=. --push`. A check against GitHub's API confirmed:
- the remote `main` is identical to the local commit, and `main` tracks `origin/main`
- the visibility is PRIVATE
- there are 86 files, the only `.env*` files are the examples, and there is no database, venv or node_modules
- the commit has the correct author and no attribution lines

### Walkthrough condensed + ChatGPT briefing

**At the developer's request,** walkthrough stops 3–6 were given in one message rather than one by one.

**Briefing created:** `PROJECT_BRIEFING_FOR_CHATGPT.md` in the project root, about 3,300 lines and 119 KB.
- **Contents:**
  - instructions for the reading AI
  - the executive summary (stack, architecture, data model, API, testing, decisions, problems, limitations)
  - an interview guide: a 60-second pitch and 33 questions across the 10 levels
  - the **complete source** of 51 files, generated directly from the repository. CSS is summarised, not included.
- **Checked:**
  - The real secret key is absent; only the `.env.example` placeholder appears.
  - Code fences are balanced, and all 51 file sections are present.
- **Git-ignored**, because it's a snapshot that would go stale. Regenerate it by asking the assistant, or
  copy the files again.

### Relocation to `~/Developer` and a one-click launcher (between Phases 9 and 10)

**Why:** P25. iCloud had evicted 8,300 files on the synced Desktop, so new Python and Node processes hung.

**What was done:**

1. **Took inventory.** Outside `venv/` and `node_modules/`, the only placeholders were:
   - `backend/.env`
   - 16 `__pycache__` files
   - 15 git sample-hook and description files
   - 89 git objects. Since `git rev-list --all` gave 0 and the index is empty, nothing refers to them.
2. **Stopped both servers.** Then `safe_copy.py` (a one-off script kept outside the repo) copied
   **94 files** to `~/Developer/project setup` with **0 SHA-256 mismatches**. It skipped the placeholders
   and the rebuildable folders, and refused to overwrite an existing destination.
3. **Checked the copy.** It has the same 85 git-trackable files as the original, plus `db.sqlite3` and
   `frontend/.env`, and **0 placeholders**. `git fsck` reports only the known dangling blobs.
4. **Rebuilt.**
   - The git sample hooks came from git's own templates.
   - `venv` was recreated with Python 3.11 from `requirements.txt`.
   - `backend/.env` was recreated with a **new** secret key.
   - `node_modules` was installed with `npm ci`, from the lockfile exactly.
5. **Moved the session** to the new folder. On the Desktop, a symlink `Reading List` now points to
   `~/Developer/project setup`. The old folder was renamed `project setup (old copy - moved to Developer)`.

**Rechecked in the new location:**

| Check | Result |
| ----- | ------ |
| venv | Paths point to the new location |
| Backend | `check` clean, `0001_initial` applied, no missing migrations, 5 books and 4 genres, **57/57 tests**, `pip check` clean |
| Old path | No references to `Desktop/paas` anywhere outside `venv` and `node_modules` |
| Frontend | Registry from `.npmrc`, lint 0 warnings, build OK, `npm audit` 0 vulnerabilities |
| Git ignore rules | Still correct |
| Guide | The CODEBASE_GUIDE §E3 queries, blocked before, all run as documented, including the exact `validated_data` |

**Launcher tests (D59):**
- **Bare environment.** Run with `env -i` and a minimal `PATH` (no profile, no nvm), like a Finder
  double-click: the nvm fallback found Node, the API answered, Vite started, and the browser opened.
  Full CRUD and the 409 worked through the app.
- **Ctrl+C.** Both ports were freed and no `runserver` processes remained. The first version printed a
  `SystemExit` traceback (P26); after the fix, it prints only "■ Stopping both servers…".
- **Port 8000 already taken** by a dummy server: it refused with the port, the likely cause and the
  `lsof` command.
- **A real double-click.** `open` on the launcher *through the Desktop symlink* started a Terminal.app
  window, both ports listened, and the app loaded with no console errors. **It was left running for the
  developer.**

### Phase 9 — Codebase walkthrough

**Created:** `docs/CODEBASE_GUIDE.md`, about 1,170 lines covering the brief's sections A–G:

| Section | Contents |
| ------- | -------- |
| A | Architecture: the diagram, why there are two apps, how they communicate, the database's role, the lifecycle in one paragraph |
| B | Project vs app. Every backend file, in the same layout: why it exists, what it contains, what depends on it, what happens if you change it. The ORM with real SQL, DRF's building blocks, middleware in order, CORS |
| C | Frontend: the dependency rule, `main.jsx` / `App.jsx`, the Router tools, props and state, built-in and custom hooks, Axios and the service layer, forms, the four-state pattern, a component table |
| D | "Add a book", answering the brief's 10 questions with links to the real lines, the real HTTP request, DRF's real `create()` source, the two real SQL statements, the real 201 body, and the error variant |
| E | The real `CREATE TABLE` SQL, PKs and FKs, `on_delete` options, an ORM cheat sheet, the migrations workflow, and how to inspect data (with `dbshell` SQL) |
| F | Python, Django/DRF, JavaScript and React concepts, each tied to where it appears in the code |
| G | Seven exercises (field, endpoint, page, response change, validation, search, M2M relationship) plus six prediction drills, with **no solutions** (D58) |

**Verified:**
- **Line references:** 99 `file#Lnn` links checked by script. 84 match the named code exactly; the other
  15 point at a line *inside* the named file or component, which is correct on manual review.
- **Links:** the audit (D56) found two real anchor problems, both fixed. One was a link into
  ARCHITECTURE §7.1, whose headings had stale `_(implemented)_` markers (now removed). The other was the
  ★ in exercise headings (moved out of the headings).
- **Captured from the running system:** the SQL in B3, D8 and E1, the `iexact` SQL, the protected-delete
  queries (which corrected a wrong claim, D57), the 201 body, and DRF's `mixins.py` lines 16–24. Data was
  rolled back to 5 books each time.
- **Drill G8-1:** rewritten to use a plain `--port` flag rather than a CLI flag I couldn't confirm.

**Verified with `sqlite3`** (part of macOS, so not affected by P25): every E5 statement. The tables match
E1, there are 5 books and 4 genres, and `library 0001_initial` is applied. `db.sqlite3` itself was not evicted.

**Not verified (blocked by P25):** the queries in the E3 cheat sheet, which need a new Django process. They
are standard ORM calls, and several were already run in earlier phases, but this exact list hasn't been
run. Do so once P25 is fixed.

### Phase 8 — Documentation completion

**Audit (D56).** A script checked all five documents for:
- relative links and `#anchors` (GitHub's heading rules)
- file paths in backticks
- function names written as calls
- table column counts

It reported 13 flags. One was real: the migration path (P24). The others were naming patterns (`PascalCase.jsx`),
SQL (`LOWER()`), a planned file (`CODEBASE_GUIDE.md`), and files this log mentions as history.

**Stale content.**
- **No placeholders left.** None of "Not yet implemented", "planned", TODO or FIXME remain in the
  user-facing docs or the code.
- **Counts and versions** (57 tests, DRF 3.18.3) agree everywhere.
- **Code comments.** Each "see …" pointer was checked: `settings.py` → backend README, `Layout.jsx` →
  `App.jsx`, `BookCard.jsx` → `BookCard.css`, `.npmrc` → P2. All of them are valid.
- **Status lines.** The status lines in the root README, the frontend README and ARCHITECTURE were updated,
  and the "(Phase 6)" label was removed from the README's folder tree (D55).

**Commands actually run:**
- Every bash block in the three READMEs was listed. The setup commands were already run on a clean copy in Phase 7.
- Newly run here:
  - the single-module and single-test `manage.py test` paths (31 tests and 1 test, both OK)
  - `showmigrations` and `sqlmigrate`
  - the four curl examples, in zsh through the real terminal, after fixing P23
- Data was restored afterwards with `loaddata` plus deleting the created book: 5 books, and Dune back to *reading*.

**Quick start (D54).** Added at the top of the README and linked from the table of contents. The key
one-liner was checked in a scratch folder (0 placeholders, a 50-character key). The whole Quick start then
ran on a clean copy of the 84 trackable files: install, key, migrate, load data, `check`, `npm install`,
`.env`, build. The final `runserver` / `npm run dev` were replaced by `check` / `build`, because the
assistant's sandbox can't open ports. Both servers were already shown running in Phases 3–7.

### Phase 7 — Testing and debugging

**1. Coverage.** Measured with `coverage.py` in a throwaway venv (D48):

| Measure | Before | After |
| ------- | -----: | ----: |
| Tests | 22 | **57** |
| Lines covered | 93% | **95%** |

All of `apps/` is covered. What's left is `wsgi.py`, `asgi.py` and two branches in `settings.py`.
Coverage also exposed the untested "finished date" rule (P16).

**2. New tests**, in `apps/library/tests/` (D47):
- **Genre API:** rename collisions, changing the case of a genre's own name, surrounding spaces,
  the length limit, 404.
- **Book API:**
  - creating a finished book, with today's date accepted as the boundary
  - trimming whitespace, ignoring read-only fields, length and status rules
  - 404s, including a non-numeric id and DELETE of an unknown id
  - ordering, a one-query list (`assertNumQueries(1)`), and combined filters
  - PUT semantics (P18), and `updated_at` changing
- **Models:** the database rejects bad rows directly; `PROTECT`; `__str__`.
- **Project setup:** the API index, CORS (with `override_settings`), the admin pages, and an admin
  constraint error.
- **Mutation checks (D51):**
  - Removing `select_related` → 7 queries instead of 1, and the test fails.
  - Removing `CorsMiddleware` → the CORS tests fail.
  - Both files were restored and confirmed byte-identical.

**3. Code review** of every file:

| Finding | Outcome |
| ------- | ------- |
| HTML 400 body shown letter by letter | **Bug, fixed** (P17), plus `console.error` for unexpected errors (D53) |
| Trailing slash in `VITE_API_BASE_URL` | Not a problem: Axios joins `…/api` + `/books/` and `…/api/` + `/books/` the same way (checked) |
| HTML or script in book notes | Not a problem: there's no `dangerouslySetInnerHTML` or `innerHTML` in `src/`, and React escapes all text |
| Non-ASCII case-insensitivity on SQLite | Known limitation (P20) |
| A simultaneous duplicate genre gives a 500 | Known limitation, documented |
| PUT keeps omitted optional fields | Expected DRF behaviour, documented and tested (P18) |

**4. Fresh-clone setup.** I copied only the git-trackable files (84) into an empty folder whose path also
contains a space. No `.env`, `venv`, database, `node_modules` or `.claude` came along. Then I followed
the README word for word:

- **Backend:**
  - venv created with Python 3.11.15 and requirements installed
  - `.env` created and the key pasted in (0 placeholders left)
  - `check` clean; `migrate` OK; `loaddata` installed 9 objects
  - **57/57 tests**, and the API served 5 books and 4 genres
  - repeated after the DRF upgrade: 3.18.3 installed, 57/57 tests
- **Frontend:**
  - the registry came from `.npmrc`; `npm install` took 8 s with 0 vulnerabilities
  - lint and build clean; `npm ci` succeeded, so the lockfile is consistent
  - the bundle contains the URL from `.env`
- **Missing frontend `.env`:** a preview build without it showed a blank page, and the console said
  `VITE_API_BASE_URL is not set. Copy frontend/.env.example …`, exactly as the README describes.

**5. Health checks:**

| Check | Result |
| ----- | ------ |
| `pip check` | No broken requirements |
| `makemigrations --check` | No changes |
| `npm audit` | 0 vulnerabilities |
| `npm outdated` | Everything current |
| `pip list --outdated` | DRF 3.16.1 → 3.18.3 available; upgraded (D49). Django 6 isn't offered (it needs Python 3.12) |
| `check --deploy` | 5 expected production warnings (W004, W008, W012, W016, W018), listed in README *Future improvements*. No warning about the secret key, so it's strong enough |

**After the DRF upgrade:** the server was restarted, and every error path the UI depends on was rechecked
from the frontend's origin. The 400 field errors, the 400 filter error, the duplicate genre, the 409, the
404, and create/delete all kept the same shapes. Data back to 5 books and 4 genres.

### Phase 6 — Frontend–backend integration

**Created (in `frontend/src/`):**

- `validation.js` (`validateBook`, `validateGenre`, `hasErrors`) and `dates.js` (`formatDate`,
  `formatDateTime`, `todayIsoDate`).
- `hooks/useFormState.js`: values, field errors, the form message, `isSubmitting`, `handleSubmit`,
  `fieldId()` and `fieldProps()`.
- Components, each with its CSS: `FormField`, `BookForm`, `GenreForm`, `GenreListItem`, `BookFilters`
  and `RatingStars`.
- Pages: `BookDetailPage` (+ CSS), `BookFormPage`, and `GenresPage` (+ CSS).

**Changed:**

- `App.jsx`: routes for `books/new`, `books/:bookId`, `books/:bookId/edit` and `genres`.
- `NavBar`: a Genres link.
- `BookCard`: the whole card is a link (D44), and it uses `RatingStars`.
- `BookListPage`: filters in the URL, an Add book button, and separate empty states for "no books" and
  "no matches".
- `services/apiClient.js`: `getFieldErrors()` and `isNotFound()`; a 400 now shows the server's own messages.
- `index.css`: `.button--danger`, `.button--small`, `.input` with an `aria-invalid` style, and `.back-link`.
- Backend `serializers.py`: the custom `genre` "does not exist" message (D46), with the test updated.

**Verified in the browser** (Vite 5173 → Django 8000):

| Flow | Result |
| ---- | ------ |
| Filters | `?status=finished` → 2 books ("2 books matching filters"); `+genre=4` → "No matching books"; a refresh keeps both selects; *Clear filters* → `/` and 5 books; `?status=lost` → the server's message |
| Create, client checks | An empty submit shows 3 field errors, **0 requests sent**, each error linked through `aria-describedby`. Typing in Title clears only that error. *Finished* reveals Rating and Finished on. A 2030 date is rejected; the picker's `max` is today |
| Create, success | Navigated to `/books/8`. "15 Oct 2026" (no time-zone shift), notes keep their line break, timestamps in local time |
| Edit | Prefilled correctly. Switching to *Reading* hides the two fields and shows a hint. After saving, Rating and Finished on are "—" |
| Server field error | Genre deleted behind the open form → message under Genre, typed values kept, button re-enabled. Rechecked after the D46 fix |
| Genres | Duplicate "fantasy" → error under Name. Add "Poetry" → the form resets and the list re-sorts. Inline rename → "Poetry and Verse". Deleting History (in use) → 409 message and the genre kept. Deleting the unused genre → removed, and the earlier error cleared. All element ids unique with two forms on the page |
| Delete book | Cancelling the confirmation keeps the book (checked through the API). OK → `/`, and Back goes to the page before, not the deleted book |
| Navigation | Clicking a card's empty area opens it. `/books/9999`, `/books/abc` and `/books/9999/edit` → "Book not found" |
| Phone width | Detail, edit form and genres page all 375 px wide (no horizontal scroll) |
| Console | No React warnings. Errors only for requests that failed on purpose (400/404/409, and the earlier backend-down test) |
| Lint / build / backend tests | 0 warnings on 28 files / build OK / 22 tests OK |

All test records were removed afterwards, so the data is back to the 5 sample books and 4 genres.

**Not covered:** automated frontend tests (none exist yet; see README *Future improvements*). Keyboard-only
navigation was not walked through end to end, although focus styles and native controls are used throughout.

### Phase 5 — React frontend setup

**Created (all in `frontend/`):**

- **Scaffolding.** Made with `create-vite@9.3.4 --template react`. Demo content was removed (the
  `App.css` and `assets/` images, `icons.svg`, the Vite favicon, and the template's own `.gitignore`,
  which the root `.gitignore` covers). `README.md` was rewritten.
- **Configuration files:**
  - `.npmrc` pins the official registry (P2 resolved).
  - `.env.example` and `.env` (git-ignored) hold `VITE_API_BASE_URL`.
  - `vite.config.js` uses port 5173 with `strictPort`.
  - `package.json` was renamed, with `engines` set to Node ≥ 22.22.
  - `.oxlintrc.json` gained the `exhaustive-deps` rule.
- **Installed:** react-router 8.5.1 and axios 1.21.0, plus the template's React 19.3.1, Vite 8.3.6,
  plugin-react 6.2.1, oxlint 1.91.0 and @types. npm reports 0 vulnerabilities.
- **`index.html`** (title, description, favicon) and **`public/favicon.svg`** (a simple book icon).
- **`src/`:**
  - `main.jsx` and `App.jsx`
  - `constants.js`
  - `index.css` (tokens, dark theme, base styles, buttons)
  - `services/apiClient.js`, `booksApi.js`, `genresApi.js`
  - `hooks/useApiData.js`
  - `components/` (Layout, NavBar, BookCard, StatusBadge, LoadingSpinner, ErrorMessage, EmptyState,
    each with its CSS file)
  - `pages/BookListPage.jsx` (+ CSS) and `pages/NotFoundPage.jsx`

**Verified:**

| Check | Result |
| ----- | ------ |
| `npm run lint` | 0 warnings, after fixing P11 |
| `exhaustive-deps` rule active | Flags a deliberately broken file |
| `npm run build` | Succeeds (JS 318 kB, 104 kB gzipped) |
| `npm run dev` | Vite 8.3.6 ready in about 200 ms on port 5173 |
| Book list at `localhost:5173` | All 5 books shown, with title, author, genre, status badge and stars; count "5 books" |
| Cross-origin GET | Works (CORS) |
| Light and dark themes | Both render correctly |
| Phone width (375 px) | One column, page width 375 px (no horizontal scroll) |
| Unknown URL | 404 page with a "Back to books" button |
| Backend stopped | "Cannot reach the server…" plus **Try again**; after restarting Django, Try again loads the list |
| Every service function run from the app's origin | list/get/create/update/delete for books and genres OK. Invalid create → 400 with field errors; genre in use → 409 with its `detail`; deleted book → 404. Test records cleaned up |
| CORS preflight | Browser sent `OPTIONS` before POST/PUT, Django answered 200 |
| Empty filters | `listBooks({status: 'finished', genre: ''})` requested `?status=finished` only |
| Console on a normal load | No errors. Two `GET /api/books/` requests, both 200 (StrictMode's development double run, documented) |

**Observed, for later:** a request with `rating: 9` on a `reading` book returns only the 1–5 error, not
the "only finished books" error. DRF runs each field's own checks first, and calls `validate()` only if
they all pass. The Phase 6 form should therefore expect errors to appear in rounds.

**Not verified in Phase 5:** the empty state with real data. It would mean deleting all the books; Phase 6
filters make it reachable naturally (e.g. a genre with no books).

### Phase 4 — Database and API implementation

**Created (all in `backend/`):**

- `apps/__init__.py` and `apps/library/`, generated with `startapp`. `apps.py` was changed to `name = "apps.library"`.
- `models.py`:
  - `Genre` and `Book`, with `Book.Status` as `TextChoices`
  - the `validate_not_in_future` field validator
  - three constraints: a case-insensitive unique genre name, and two CHECKs for "only when finished"
- `migrations/0001_initial.py`: generated, and its SQL reviewed with `sqlmigrate`.
- `serializers.py`: `GenreSerializer` (case-insensitive duplicate check) and `BookSerializer`
  (read-only `genre_name`, cross-field `validate()` that works for PATCH).
- `exceptions.py`: `GenreInUse` (409).
- `views.py`: `GenreViewSet` (protected delete becomes 409) and `BookViewSet` (`select_related`, validated filters).
- `urls.py`: `DefaultRouter`. `config/urls.py` mounts it under `api/`.
- `admin.py`: list display, filters and search for both models.
- `tests.py`: 22 `APITestCase` tests.
- `fixtures/sample_data.json`: 4 genres and 5 books. "History" has no books, so deleting it works;
  the other genres demonstrate the 409.
- `config/settings.py`: added `apps.library` and the `REST_FRAMEWORK` settings.

**Database:** `migrate` applied 18 built-in migrations plus `library.0001_initial`, and sample data was loaded.

**Verified:**

| Check | Result |
| ----- | ------ |
| `manage.py check` and `makemigrations --check` | No issues; models and migrations in sync |
| `manage.py test` | 22/22 pass |
| Mutation check on the PATCH rule | Removing the fix makes the test fail (`IntegrityError`) |
| Real HTTP via the browser against `runserver`: index, list, filter, create, PATCH, PUT, delete, 404, 409, duplicate genre | All status codes and bodies as documented. Records created during testing were deleted; sample data intact (5 books) |
| Admin pages (dashboard, both list pages, a filter, the change form) | 200 |
| Admin form rejects a rating on an unread book and a duplicate genre | Form errors shown, from the DB constraints |
| GET without trailing slash / POST without trailing slash | 301 redirect / `RuntimeError`, as now documented |
| `loaddata` run twice | No duplicates (4 genres, 5 books) |

### Phase 3 — Python environment and Django backend setup

**Created:**

- `backend/venv/`: Python 3.11.15 virtual environment (git-ignored).
- `backend/requirements.txt`: Django 5.2.19, djangorestframework 3.16.1, django-cors-headers 4.9.0,
  python-dotenv 1.2.4, plus the transitive dependencies asgiref and sqlparse.
- `backend/manage.py` and `backend/config/`, generated with `django-admin startproject config .`.
  The trailing `.` puts `manage.py` directly in `backend/` instead of a nested `config/config/`.
- `backend/config/settings.py`, rewritten to:
  - read its values from the environment (D11, D12)
  - add `rest_framework` and `corsheaders` to `INSTALLED_APPS`
  - put `CorsMiddleware` first in the middleware list
- `backend/.env.example`, committed, and `backend/.env`, git-ignored, holding a freshly generated
  50-character secret key.
- `backend/README.md`: backend setup, environment variables, dependencies and common commands.

**Unchanged:** `config/urls.py`, `wsgi.py`, `asgi.py`. The generated versions are correct for now.
`urls.py` gets the API routes in Phase 4.

**Verified:**

| Check | Result |
| ----- | ------ |
| `python manage.py check` | No issues |
| Settings loaded from `.env` | DEBUG=True, hosts and CORS origins parsed into lists, key isn't the insecure default |
| `.env` missing and no key set | Clear `ImproperlyConfigured` message pointing to the README |
| `runserver` | Starts; shows the expected "18 unapplied migrations" warning |
| `GET /` in a browser | Django welcome page |
| `GET /admin/` in a browser | Redirects to the login page, which renders with its CSS (static files served) |
| CORS, allowed origin (`http://localhost:5173`) | `Access-Control-Allow-Origin: http://localhost:5173` returned |
| CORS, other origin | No CORS header returned (the browser would block the request) |
| CORS preflight `OPTIONS` | 200, allowed methods: DELETE, GET, OPTIONS, PATCH, POST, PUT |
| Disallowed `Host` header | 400 |
| `git check-ignore` | `backend/.env` and `backend/venv` ignored; `backend/.env.example` tracked |

### Phase 2 — Root directory and project structure

**Created:**

- `.gitignore` — ignores secrets (`.env*` except `.env.example`), Python artefacts (`venv/`, `__pycache__/`,
  `db.sqlite3`), Node artefacts (`node_modules/`, `dist/`), OS/editor files, and local AI-tool config (`.claude/`).
- `README.md` — all 16 required sections; unimplemented ones clearly marked with the phase that fills them.
- `docs/ARCHITECTURE.md` — agreed system design, data model, CORS approach, error-handling strategy.
- `docs/DEVELOPMENT_NOTES.md` — this file.

**Verified:** `.gitignore` tested with `git check-ignore` in a throwaway repository — secrets, `venv/`,
`db.sqlite3`, `__pycache__/`, `node_modules/`, `dist/`, `.DS_Store`, and `.claude/` are ignored;
`.env.example`, `.npmrc`, `requirements.txt`, and docs are tracked (16/16 checks passed).

**Git:** `git init -b main` was blocked by the assistant's sandbox (P4) and run by the developer instead.
Repository is on branch `main`; `git status` shows exactly the four files above as untracked. No commits yet.

### Phase 1 — Environment inspection and proposal

Inspected the machine and empty project folder:

- Python: system 3.9.6 (too old), 3.11.15 available at `~/.local/bin/python3.11`.
- Node 24.16.0, npm 11.13.0, Git 2.54, SQLite 3.53 (bundled with Python 3.11).
- PyPI reachable; global npm registry mirror unresponsive (P2).

Proposed and agreed: Reading List app, data model, endpoints, and decisions D1–D10.
