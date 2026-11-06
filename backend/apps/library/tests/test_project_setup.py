"""
Tests for project wiring rather than features: the API index, CORS
configuration, and the Django Admin registration. These catch mistakes in
settings.py, urls.py and admin.py that the feature tests wouldn't notice.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APITestCase

from apps.library.models import Book, Genre

FRONTEND_ORIGIN = "http://localhost:5173"


class ApiIndexTests(APITestCase):
    def test_api_root_lists_both_resources(self):
        response = self.client.get("/api/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.data), {"books", "genres"})


# override_settings makes the test independent of whatever is in the
# developer's .env file.
@override_settings(CORS_ALLOWED_ORIGINS=[FRONTEND_ORIGIN])
class CorsTests(APITestCase):
    def test_allowed_origin_receives_cors_header(self):
        response = self.client.get("/api/books/", HTTP_ORIGIN=FRONTEND_ORIGIN)

        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), FRONTEND_ORIGIN)

    def test_other_origin_receives_no_cors_header(self):
        response = self.client.get("/api/books/", HTTP_ORIGIN="http://evil.example")

        self.assertNotIn("Access-Control-Allow-Origin", response.headers)

    def test_preflight_allows_json_writes(self):
        # Before a cross-origin POST with a JSON body, the browser sends this
        # OPTIONS "preflight" request and only continues if it is allowed.
        response = self.client.options(
            "/api/books/",
            HTTP_ORIGIN=FRONTEND_ORIGIN,
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("POST", response.headers["Access-Control-Allow-Methods"])
        self.assertIn("content-type", response.headers["Access-Control-Allow-Headers"])


class AdminTests(TestCase):
    def setUp(self):
        genre = Genre.objects.create(name="Fantasy")
        self.book = Book.objects.create(title="The Hobbit", author="Tolkien", genre=genre)
        admin_user = get_user_model().objects.create_superuser(username="admin", email="")
        # force_login skips the password check; this test is about the admin
        # pages, not about logging in.
        self.client.force_login(admin_user)

    def test_admin_pages_load(self):
        urls = [
            "/admin/",
            "/admin/library/book/",
            "/admin/library/book/?status__exact=finished",
            "/admin/library/book/?q=hobbit",
            "/admin/library/genre/",
            f"/admin/library/book/{self.book.pk}/change/",
        ]
        for url in urls:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 200)

    def test_admin_form_shows_database_constraint_as_form_error(self):
        response = self.client.post(
            "/admin/library/book/add/",
            {"title": "X", "author": "Y", "genre": self.book.genre_id, "status": "reading", "rating": 3},
        )

        # 200 means the form was shown again with errors; a save would redirect (302).
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Only finished books can have a rating.")
