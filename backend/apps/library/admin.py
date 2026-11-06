from django.contrib import admin

from .models import Book, Genre


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at"]
    search_fields = ["name"]


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "genre", "status", "rating", "updated_at"]
    list_filter = ["status", "genre"]
    search_fields = ["title", "author"]
    # Fetch each book's genre in the same query used for the list page.
    list_select_related = ["genre"]
