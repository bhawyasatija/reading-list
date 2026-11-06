"""
API views for books and genres.

ModelViewSet provides the five standard actions, and the router in urls.py
maps them to URLs and HTTP methods:

    list            GET     /api/<resource>/
    create          POST    /api/<resource>/
    retrieve        GET     /api/<resource>/<id>/
    update          PUT     /api/<resource>/<id>/   (all fields)
    partial_update  PATCH   /api/<resource>/<id>/   (only the fields sent)
    destroy         DELETE  /api/<resource>/<id>/

Only the behaviour that differs from those defaults is written here.
"""

from django.db.models import ProtectedError
from rest_framework import serializers, viewsets

from .exceptions import GenreInUse
from .models import Book, Genre
from .serializers import BookSerializer, GenreSerializer


class GenreViewSet(viewsets.ModelViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer

    def perform_destroy(self, instance):
        # Book.genre uses on_delete=PROTECT, so the database layer refuses to
        # delete a genre that is still in use. Without this handler that would
        # surface as a 500 error; here it becomes a clear 409 Conflict.
        try:
            instance.delete()
        except ProtectedError as error:
            book_count = len(error.protected_objects)
            raise GenreInUse(
                f'Cannot delete "{instance.name}" because {book_count} '
                f"book(s) still use it. Move or delete those books first."
            )


class BookViewSet(viewsets.ModelViewSet):
    serializer_class = BookSerializer

    def get_queryset(self):
        # select_related joins the genre table in the same SQL query. Without
        # it, serializing genre_name would run one extra query per book.
        queryset = Book.objects.select_related("genre")
        if self.action == "list":
            queryset = self._apply_filters(queryset)
        return queryset

    def _apply_filters(self, queryset):
        """
        Filter by ?status=<value> and/or ?genre=<id>, rejecting bad values with 400.

        Error messages are wrapped in lists to match the {"field": ["message"]}
        shape DRF uses for serializer errors, so the frontend handles one format.
        """
        params = self.request.query_params

        status = params.get("status")
        if status:
            if status not in Book.Status.values:
                allowed = ", ".join(Book.Status.values)
                raise serializers.ValidationError(
                    {"status": [f'"{status}" is not a valid status. Use one of: {allowed}.']}
                )
            queryset = queryset.filter(status=status)

        genre = params.get("genre")
        if genre:
            if not genre.isdigit():
                raise serializers.ValidationError(
                    {"genre": [f'"{genre}" is not a valid genre id. Use a whole number.']}
                )
            queryset = queryset.filter(genre_id=int(genre))

        return queryset
