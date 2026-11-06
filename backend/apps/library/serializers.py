"""
Serializers convert between JSON and model instances.

Reading:  Book instance  -> serializer.data            -> JSON response
Writing:  request JSON   -> serializer.is_valid()      -> serializer.save() -> Book instance

ModelSerializer builds most fields automatically from the model, including
max_length, required/optional, choices, and the field validators defined in
models.py. Only rules that the model can't express as field validators are
written by hand below.
"""

from rest_framework import serializers

from .models import Book, Genre


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ["id", "name", "description", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_name(self, value):
        """Reject a name that matches an existing genre, ignoring case."""
        duplicates = Genre.objects.filter(name__iexact=value)
        # When updating, the genre being edited may keep its own name.
        if self.instance is not None:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError("A genre with this name already exists.")
        return value


class BookSerializer(serializers.ModelSerializer):
    # Read-only convenience field so the frontend can show the genre name
    # without a second request. Clients still write the genre by its id.
    genre_name = serializers.CharField(source="genre.name", read_only=True)

    class Meta:
        model = Book
        fields = [
            "id",
            "title",
            "author",
            "genre",
            "genre_name",
            "status",
            "rating",
            "finished_on",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            # DRF's default here is 'Invalid pk "7" - object does not exist.',
            # which is accurate but meaningless to a user (e.g. if someone
            # deleted the genre while the form was open).
            "genre": {
                "error_messages": {
                    "does_not_exist": "This genre no longer exists. Please choose another.",
                },
            },
        }

    def validate(self, attrs):
        """
        Cross-field rule: rating and finished date are only allowed on finished books.

        For a PATCH request, attrs contains only the fields that were sent, so
        missing values are taken from the existing book. Without this, a PATCH
        of {"status": "reading"} on a rated book would slip past the check and
        then be rejected by the database constraint as a 500 error.
        """
        status = self._current_value(attrs, "status", default=Book.Status.WANT_TO_READ)
        if status != Book.Status.FINISHED:
            errors = {}
            if self._current_value(attrs, "rating") is not None:
                errors["rating"] = "Only finished books can have a rating."
            if self._current_value(attrs, "finished_on") is not None:
                errors["finished_on"] = "Only finished books can have a finished date."
            if errors:
                raise serializers.ValidationError(errors)
        return attrs

    def _current_value(self, attrs, field_name, default=None):
        """Value being submitted, else the saved value, else the default."""
        if field_name in attrs:
            return attrs[field_name]
        if self.instance is not None:
            return getattr(self.instance, field_name)
        return default
