from rest_framework.routers import DefaultRouter

from .views import BookViewSet, GenreViewSet

# DefaultRouter generates the list and detail URLs for each ViewSet, plus a
# browsable index at /api/ that links to every registered resource.
router = DefaultRouter()
# BookViewSet defines get_queryset() instead of a queryset attribute, so the
# router can't infer the URL name prefix; basename supplies it ("book-list", "book-detail").
router.register("books", BookViewSet, basename="book")
router.register("genres", GenreViewSet, basename="genre")

urlpatterns = router.urls
