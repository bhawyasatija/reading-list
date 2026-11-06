"""
Django settings for the Reading List backend.

Anything that differs between machines or must stay secret (secret key, debug
flag, allowed hosts, CORS origins) is read from environment variables. In
development those come from backend/.env, which is git-ignored; see
backend/.env.example for the full list.

Reference: https://docs.djangoproject.com/en/5.2/ref/settings/
"""

import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

# backend/ — the folder that contains manage.py.
BASE_DIR = Path(__file__).resolve().parent.parent

# Copy values from backend/.env into os.environ. Variables that are already
# set in the real environment win, so a server can override the file.
load_dotenv(BASE_DIR / ".env")


def env_bool(name, default=False):
    """Read an environment variable as a boolean ("true", "1", "yes", "on")."""
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"true", "1", "yes", "on"}


def env_list(name, default=""):
    """Read a comma-separated environment variable as a list of strings."""
    value = os.environ.get(name, default)
    return [item.strip() for item in value.split(",") if item.strip()]


# --- Security ---------------------------------------------------------------

# Fail loudly instead of falling back to a hard-coded key: a default key would
# end up in git and be shared by every installation.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY is not set. Copy backend/.env.example to "
        "backend/.env and fill in a secret key (see backend/README.md)."
    )

# Defaults to False so that forgetting the variable is safe, not dangerous.
DEBUG = env_bool("DJANGO_DEBUG", default=False)

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", default="localhost,127.0.0.1")


# --- Applications -----------------------------------------------------------

INSTALLED_APPS = [
    # Django built-ins
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "corsheaders",
    # Project apps
    "apps.library",
]

MIDDLEWARE = [
    # CorsMiddleware must come before any middleware that can return a
    # response (e.g. CommonMiddleware), otherwise those responses would be
    # missing the CORS headers and the browser would block them.
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# --- Database ---------------------------------------------------------------

# SQLite keeps setup to zero steps. Only standard ORM features are used, so
# moving to PostgreSQL later means changing this block (ENGINE, NAME, USER,
# PASSWORD, HOST, PORT read from env) and installing psycopg — not the models.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# --- Password validation (used by the admin's user accounts) ---------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# --- Internationalisation ---------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# --- Static files (CSS/JS for the admin and browsable API) -----------------

STATIC_URL = "static/"


# --- Django REST Framework --------------------------------------------------

REST_FRAMEWORK = {
    # Stated explicitly even though it is DRF's default: v1 has no user
    # accounts, so every endpoint is public. Change this when adding auth.
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
}


# --- CORS (django-cors-headers) ---------------------------------------------

# Exact origins allowed to call the API from a browser, e.g. the Vite dev
# server. Listed explicitly rather than allowing every origin.
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS")
