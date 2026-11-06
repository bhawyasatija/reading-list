"""
Database models for the reading list.

Validation lives in three layers, each with a different job:

1. Field validators (e.g. rating 1-5, finished date not in the future).
   Defined once here; both the admin forms and the DRF serializers run them.
2. Database constraints (Meta.constraints). The final guarantee: the
   database itself rejects bad rows, whichever code path tries to write them.
   The admin also checks them and shows the message as a form error.
3. Serializer validation (serializers.py). Turns the cross-field rules into
   clear, per-field API error messages before anything reaches the database.
"""

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower
from django.utils import timezone


def validate_not_in_future(value):
    """Reject dates later than today."""
    if value > timezone.localdate():
        raise ValidationError("The finished date cannot be in the future.")


class Genre(models.Model):
    """A category that books are grouped under, e.g. "Science Fiction"."""

    name = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            # unique=True on the field would treat "Fantasy" and "fantasy" as
            # different genres. Comparing the lower-cased value prevents that.
            models.UniqueConstraint(
                Lower("name"),
                name="unique_genre_name_case_insensitive",
                violation_error_message="A genre with this name already exists.",
            ),
        ]

    def __str__(self):
        return self.name


class Book(models.Model):
    """A book on the reading list."""

    class Status(models.TextChoices):
        # First value is stored in the database; second is the human label.
        WANT_TO_READ = "want_to_read", "Want to read"
        READING = "reading", "Reading"
        FINISHED = "finished", "Finished"

    title = models.CharField(max_length=200)
    author = models.CharField(max_length=120)
    genre = models.ForeignKey(
        Genre,
        # PROTECT: deleting a genre that still has books raises ProtectedError
        # instead of silently deleting (CASCADE) or orphaning (SET_NULL) them.
        on_delete=models.PROTECT,
        # Lets us write genre.books.all() instead of genre.book_set.all().
        related_name="books",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.WANT_TO_READ,
    )
    rating = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1 to 5. Only allowed once the book is finished.",
    )
    finished_on = models.DateField(
        null=True,
        blank=True,
        validators=[validate_not_in_future],
        help_text="Only allowed once the book is finished.",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Most recently changed books first.
        ordering = ["-updated_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(rating__isnull=True) | Q(status="finished"),
                name="book_rating_only_when_finished",
                violation_error_message="Only finished books can have a rating.",
            ),
            models.CheckConstraint(
                condition=Q(finished_on__isnull=True) | Q(status="finished"),
                name="book_finished_on_only_when_finished",
                violation_error_message="Only finished books can have a finished date.",
            ),
        ]

    def __str__(self):
        return f"{self.title} by {self.author}"
