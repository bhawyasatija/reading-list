"""
Root URL configuration: the first place Django looks when a request arrives.

Each app owns its own URL patterns; this file only decides the prefix
under which each app is mounted.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.library.urls")),
]
