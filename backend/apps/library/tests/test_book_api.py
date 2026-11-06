from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.library.models import Book, Genre


class BookApiTests(APITestCase):
    def setUp(self):
        self.fantasy = Genre.objects.create(name="Fantasy")
        self.scifi = Genre.objects.create(name="Science Fiction")
        self.finished_book = Book.objects.create(
            title="The Hobbit",
            author="J. R. R. Tolkien",
            genre=self.fantasy,
            status=Book.Status.FINISHED,
            rating=5,
        )
        self.list_url = reverse("book-list")
        self.detail_url = reverse("book-detail", args=[self.finished_book.pk])

    def valid_payload(self, **overrides):
        payload = {"title": "Dune", "author": "Frank Herbert", "genre": self.scifi.pk}
        payload.update(overrides)
        return payload

    # --- Create -------------------------------------------------------------

    def test_create_book_with_defaults(self):
        response = self.client.post(self.list_url, self.valid_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "want_to_read")
        self.assertEqual(response.data["genre_name"], "Science Fiction")
        self.assertIsNone(response.data["rating"])

    def test_create_finished_book_with_rating_and_date(self):
        yesterday = timezone.localdate() - timedelta(days=1)
        payload = self.valid_payload(status="finished", rating=4, finished_on=yesterday.isoformat())

        response = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["rating"], 4)
        self.assertEqual(response.data["finished_on"], yesterday.isoformat())

    def test_create_accepts_todays_date_as_finished_date(self):
        # Boundary of the "not in the future" rule: today itself is allowed.
        today = timezone.localdate().isoformat()
        payload = self.valid_payload(status="finished", finished_on=today)

        response = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_trims_whitespace_around_text_fields(self):
        payload = self.valid_payload(title="  Dune  ", author="  Frank Herbert ")

        response = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(response.data["title"], "Dune")
        self.assertEqual(response.data["author"], "Frank Herbert")

    def test_create_ignores_read_only_fields(self):
        payload = self.valid_payload(id=999, genre_name="Hacked", created_at="2000-01-01T00:00:00Z")

        response = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(response.data["id"], 999)
        self.assertEqual(response.data["genre_name"], "Science Fiction")
        self.assertNotEqual(response.data["created_at"][:4], "2000")

    def test_create_requires_title_author_and_genre(self):
        response = self.client.post(self.list_url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data), {"title", "author", "genre"})

    def test_create_rejects_title_longer_than_200_characters(self):
        response = self.client.post(self.list_url, self.valid_payload(title="x" * 201), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("title", response.data)

    def test_create_rejects_unknown_status(self):
        response = self.client.post(self.list_url, self.valid_payload(status="lost"), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)

    def test_create_rejects_unknown_genre(self):
        response = self.client.post(self.list_url, self.valid_payload(genre=9999), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["genre"], ["This genre no longer exists. Please choose another."]
        )

    def test_create_rejects_rating_outside_1_to_5(self):
        for rating in (0, 6):
            with self.subTest(rating=rating):
                payload = self.valid_payload(status="finished", rating=rating)
                response = self.client.post(self.list_url, payload, format="json")

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("rating", response.data)

    def test_create_rejects_rating_on_unfinished_book(self):
        payload = self.valid_payload(status="reading", rating=4)
        response = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["rating"], ["Only finished books can have a rating."])

    def test_create_rejects_finished_date_on_unfinished_book(self):
        yesterday = (timezone.localdate() - timedelta(days=1)).isoformat()
        payload = self.valid_payload(status="reading", finished_on=yesterday)

        response = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["finished_on"], ["Only finished books can have a finished date."]
        )

    def test_create_rejects_finished_date_in_the_future(self):
        tomorrow = timezone.localdate() + timedelta(days=1)
        payload = self.valid_payload(status="finished", finished_on=tomorrow.isoformat())
        response = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("finished_on", response.data)

    # --- Read ---------------------------------------------------------------

    def test_retrieve_book(self):
        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "The Hobbit")

    def test_retrieve_unknown_book_returns_404(self):
        response = self.client.get(reverse("book-detail", args=[9999]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_retrieve_non_numeric_id_returns_404_not_500(self):
        response = self.client.get("/api/books/abc/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_shows_most_recently_updated_first(self):
        newer = Book.objects.create(title="Dune", author="Herbert", genre=self.scifi)

        response = self.client.get(self.list_url)

        self.assertEqual(response.data[0]["id"], newer.pk)

    def test_list_uses_one_query_however_many_books(self):
        # Guards the select_related("genre") in BookViewSet: without it, each
        # book's genre_name would cost one extra query (the "N+1" problem).
        for number in range(5):
            Book.objects.create(title=f"Book {number}", author="A", genre=self.scifi)

        with self.assertNumQueries(1):
            self.client.get(self.list_url)

    def test_filter_by_status(self):
        Book.objects.create(title="Dune", author="Herbert", genre=self.scifi, status="reading")

        response = self.client.get(self.list_url, {"status": "reading"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([book["title"] for book in response.data], ["Dune"])

    def test_filter_by_genre(self):
        Book.objects.create(title="Dune", author="Herbert", genre=self.scifi)

        response = self.client.get(self.list_url, {"genre": self.fantasy.pk})

        self.assertEqual([book["title"] for book in response.data], ["The Hobbit"])

    def test_filter_by_status_and_genre_together(self):
        Book.objects.create(title="Dune", author="Herbert", genre=self.scifi, status="finished")
        Book.objects.create(title="Hyperion", author="Simmons", genre=self.scifi, status="reading")

        response = self.client.get(self.list_url, {"status": "finished", "genre": self.scifi.pk})

        self.assertEqual([book["title"] for book in response.data], ["Dune"])

    def test_invalid_filter_values_return_400(self):
        for params in ({"status": "lost"}, {"genre": "abc"}):
            with self.subTest(params=params):
                response = self.client.get(self.list_url, params)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                # Same {"field": ["message"]} shape as serializer errors.
                field = next(iter(params))
                self.assertIsInstance(response.data[field], list)

    # --- Update -------------------------------------------------------------

    def test_put_leaves_omitted_optional_fields_unchanged(self):
        # DRF detail worth knowing: PUT requires every *required* field, but
        # optional fields that are left out keep their saved values; they are
        # NOT reset to defaults. That is why the frontend's toBookPayload()
        # always sends rating and finished_on, as null when they are cleared.
        payload = self.valid_payload(title="The Hobbit (Annotated)", status="finished")

        response = self.client.put(self.detail_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.finished_book.refresh_from_db()
        self.assertEqual(self.finished_book.title, "The Hobbit (Annotated)")
        self.assertEqual(self.finished_book.rating, 5)

    def test_put_to_unfinished_must_clear_rating_explicitly(self):
        without_rating = self.valid_payload(status="reading")
        with_rating_cleared = self.valid_payload(status="reading", rating=None)

        rejected = self.client.put(self.detail_url, without_rating, format="json")
        accepted = self.client.put(self.detail_url, with_rating_cleared, format="json")

        self.assertEqual(rejected.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("rating", rejected.data)
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)
        self.assertIsNone(accepted.data["rating"])

    def test_put_requires_all_required_fields(self):
        response = self.client.put(self.detail_url, {"title": "Only a title"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data), {"author", "genre"})

    def test_patch_updates_only_the_fields_sent(self):
        response = self.client.patch(self.detail_url, {"notes": "Loved it."}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.finished_book.refresh_from_db()
        self.assertEqual(self.finished_book.notes, "Loved it.")
        self.assertEqual(self.finished_book.rating, 5)

    def test_patch_status_away_from_finished_is_rejected_while_rated(self):
        # The saved rating must be taken into account even though only
        # "status" is sent; otherwise the database constraint would fail.
        response = self.client.patch(self.detail_url, {"status": "reading"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("rating", response.data)

    def test_patch_status_and_clear_rating_together(self):
        response = self.client.patch(
            self.detail_url, {"status": "reading", "rating": None}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "reading")

    def test_updated_at_changes_on_update(self):
        before = self.finished_book.updated_at

        self.client.patch(self.detail_url, {"notes": "Changed."}, format="json")

        self.finished_book.refresh_from_db()
        self.assertGreater(self.finished_book.updated_at, before)

    # --- Delete -------------------------------------------------------------

    def test_delete_book(self):
        response = self.client.delete(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Book.objects.filter(pk=self.finished_book.pk).exists())

    def test_delete_unknown_book_returns_404(self):
        response = self.client.delete(reverse("book-detail", args=[9999]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
