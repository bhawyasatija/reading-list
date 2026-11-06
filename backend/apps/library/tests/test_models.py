"""
Model and database-constraint tests, without HTTP.

The API tests prove the serializers reject bad data. These prove the
database itself rejects it too, for code that skips the serializer (an
admin action, a script in `manage.py shell`, a future management command).
"""

from django.db import IntegrityError, transaction
from django.db.models import ProtectedError
from django.test import TestCase

from apps.library.models import Book, Genre


class GenreModelTests(TestCase):
    def test_str_is_the_name(self):
        self.assertEqual(str(Genre(name="Fantasy")), "Fantasy")

    def test_database_rejects_duplicate_name_ignoring_case(self):
        Genre.objects.create(name="Fantasy")

        with self.assertRaises(IntegrityError):
            Genre.objects.create(name="FANTASY")

    def test_genre_with_books_cannot_be_deleted(self):
        genre = Genre.objects.create(name="Fantasy")
        Book.objects.create(title="The Hobbit", author="Tolkien", genre=genre)

        with self.assertRaises(ProtectedError):
            genre.delete()


class BookModelTests(TestCase):
    def setUp(self):
        self.genre = Genre.objects.create(name="Fantasy")

    def test_str_shows_title_and_author(self):
        book = Book(title="The Hobbit", author="Tolkien", genre=self.genre)

        self.assertEqual(str(book), "The Hobbit by Tolkien")

    def test_new_book_defaults_to_want_to_read(self):
        book = Book.objects.create(title="The Hobbit", author="Tolkien", genre=self.genre)

        self.assertEqual(book.status, Book.Status.WANT_TO_READ)

    def test_database_rejects_rating_on_unfinished_book(self):
        # transaction.atomic() lets the test carry on after the database
        # error. Without it, the failed statement would break the test's own
        # transaction and every later query in this test would fail.
        with self.assertRaises(IntegrityError), transaction.atomic():
            Book.objects.create(
                title="Dune", author="Herbert", genre=self.genre, status="reading", rating=4
            )

    def test_database_rejects_finished_date_on_unfinished_book(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Book.objects.create(
                title="Dune",
                author="Herbert",
                genre=self.genre,
                status="want_to_read",
                finished_on="2026-01-01",
            )

    def test_database_allows_rating_on_finished_book(self):
        book = Book.objects.create(
            title="Dune", author="Herbert", genre=self.genre, status="finished", rating=4
        )

        self.assertEqual(book.rating, 4)
