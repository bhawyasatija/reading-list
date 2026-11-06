"""
Tests for the library app, one module per area:

    test_genre_api.py      /api/genres/ endpoints
    test_book_api.py       /api/books/ endpoints
    test_models.py         model behaviour and database constraints (no HTTP)
    test_project_setup.py  configuration: API index, CORS, Django Admin

Run all of them with:   python manage.py test
Run one module with:    python manage.py test apps.library.tests.test_book_api

Django finds test modules because their names start with "test". This
__init__.py file makes the folder a Python package, which is required for that.

Each test runs against a separate, empty test database and is rolled back
afterwards, so tests never touch db.sqlite3 and can't affect each other.
"""
