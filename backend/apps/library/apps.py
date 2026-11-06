from django.apps import AppConfig


class LibraryConfig(AppConfig):
    # Full dotted path, because the app lives inside the "apps" package.
    # Django derives the short label "library" from the last part, which is
    # what appears in table names (library_book) and migration references.
    name = "apps.library"
    verbose_name = "Library"
