from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.library.models import Book, Genre


class GenreApiTests(APITestCase):
    def setUp(self):
        self.fantasy = Genre.objects.create(name="Fantasy")
        # reverse() builds URLs from the router's names, so tests don't break
        # if the URL prefix changes.
        self.list_url = reverse("genre-list")
        self.detail_url = reverse("genre-detail", args=[self.fantasy.pk])

    # --- Read ---------------------------------------------------------------

    def test_list_returns_genres_in_alphabetical_order(self):
        Genre.objects.create(name="Biography")
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([genre["name"] for genre in response.data], ["Biography", "Fantasy"])

    def test_retrieve_unknown_genre_returns_404(self):
        response = self.client.get(reverse("genre-detail", args=[9999]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- Create -------------------------------------------------------------

    def test_create_genre(self):
        response = self.client.post(
            self.list_url, {"name": "Poetry", "description": "Verse."}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Poetry")
        self.assertTrue(Genre.objects.filter(name="Poetry").exists())

    def test_create_rejects_duplicate_name_ignoring_case(self):
        response = self.client.post(self.list_url, {"name": "fantasy"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["name"], ["A genre with this name already exists."])

    def test_duplicate_check_ignores_surrounding_whitespace(self):
        # DRF trims whitespace before validate_name() runs, so "  Fantasy  "
        # is compared as "Fantasy".
        response = self.client.post(self.list_url, {"name": "  Fantasy  "}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_create_rejects_blank_name(self):
        response = self.client.post(self.list_url, {"name": "   "}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_create_rejects_name_longer_than_50_characters(self):
        response = self.client.post(self.list_url, {"name": "x" * 51}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    # --- Update -------------------------------------------------------------

    def test_update_can_keep_its_own_name(self):
        response = self.client.put(
            self.detail_url, {"name": "Fantasy", "description": "Updated."}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["description"], "Updated.")

    def test_update_can_change_the_case_of_its_own_name(self):
        response = self.client.put(self.detail_url, {"name": "FANTASY"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "FANTASY")

    def test_rename_to_another_genres_name_is_rejected(self):
        poetry = Genre.objects.create(name="Poetry")

        response = self.client.put(
            reverse("genre-detail", args=[poetry.pk]), {"name": "fantasy"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    # --- Delete -------------------------------------------------------------

    def test_delete_unused_genre(self):
        response = self.client.delete(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Genre.objects.filter(pk=self.fantasy.pk).exists())

    def test_delete_genre_in_use_returns_409_and_keeps_it(self):
        Book.objects.create(title="The Hobbit", author="Tolkien", genre=self.fantasy)

        response = self.client.delete(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("1 book(s)", response.data["detail"])
        self.assertTrue(Genre.objects.filter(pk=self.fantasy.pk).exists())
