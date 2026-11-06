from rest_framework import status
from rest_framework.exceptions import APIException


class GenreInUse(APIException):
    """
    Raised when deleting a genre that books still reference.

    DRF has no built-in 409 exception. Subclassing APIException means DRF's
    normal error handling turns it into {"detail": "..."} with status 409,
    exactly like its own NotFound (404) or ValidationError (400).
    """

    status_code = status.HTTP_409_CONFLICT
    default_detail = "This genre is still used by one or more books."
    default_code = "genre_in_use"
