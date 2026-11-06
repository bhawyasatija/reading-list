#!/bin/zsh
# ---------------------------------------------------------------------------
# Reading List: start the backend and the frontend together (macOS).
#
# Double-click this file in Finder (macOS runs it in a Terminal window),
# or run it from a terminal:   ./"Start Reading List.command"
#
# What it does:
#   1. Checks the one-time setup is done (venv, node_modules, both .env files)
#      and that ports 8000 and 5173 are free.
#   2. Starts Django on http://127.0.0.1:8000 in the background.
#   3. Waits until the API answers, then starts Vite on http://localhost:5173
#      in this window and opens the app in your browser.
#
# Press Ctrl+C in this window, or close the window, to stop BOTH servers.
# ---------------------------------------------------------------------------

PROJECT_DIR="${0:A:h}"     # the folder this script lives in, however it was started
cd "$PROJECT_DIR" || exit 1

fail() {
  print -P "\n%F{red}✗ $1%f"
  print "  Fix: $2\n"
  read -k1 "?Press any key to close this window…"
  exit 1
}

# A double-clicked script doesn't load your shell profile, so Node installed
# with nvm isn't on PATH yet. Load nvm if that's how Node was installed.
if ! command -v npm >/dev/null 2>&1; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  [[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh" >/dev/null 2>&1
fi
command -v npm >/dev/null 2>&1 || fail "Node.js/npm not found." "Install Node.js 22.22+ (README §6)."

# 1. One-time setup and free ports
[[ -x backend/venv/bin/python ]] || fail "The backend virtual environment is missing." "Follow README → Quick start, Terminal 1."
[[ -f backend/.env ]]            || fail "backend/.env is missing." "In backend/: cp .env.example .env, then add a secret key (README §7)."
[[ -d frontend/node_modules ]]   || fail "Frontend dependencies are not installed." "In frontend/: npm install"
[[ -f frontend/.env ]]           || fail "frontend/.env is missing." "In frontend/: cp .env.example .env"
for port in 8000 5173; do
  if lsof -nP -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1; then
    fail "Port $port is already in use. Is the app already running in another window?" \
         "Close that window, or see what is using it: lsof -iTCP:$port -sTCP:LISTEN"
  fi
done

# 2. Backend, in the background
print -P "%F{cyan}▶ Starting the backend (Django) on http://127.0.0.1:8000 …%f"
( cd backend && exec ./venv/bin/python manage.py runserver 127.0.0.1:8000 ) &
BACKEND_PID=$!

stop_backend() {
  # runserver's auto-reloader is a parent process that runs the real server
  # as its child. Stop the child; the parent then exits by itself. Signalling
  # the parent at the same moment makes it print a harmless but alarming
  # "SystemExit" traceback, so it is only forced if it is still alive after 2 s.
  pkill -P $BACKEND_PID 2>/dev/null
  for attempt in {1..20}; do
    kill -0 $BACKEND_PID 2>/dev/null || return 0
    sleep 0.1
  done
  kill $BACKEND_PID 2>/dev/null
}
trap 'print -P "\n%F{cyan}■ Stopping both servers…%f"; stop_backend; exit 0' INT TERM HUP
trap stop_backend EXIT

# 3. Wait (up to 15 s) for the API to answer
for attempt in {1..30}; do
  curl -s -o /dev/null http://127.0.0.1:8000/api/ && break
  kill -0 $BACKEND_PID 2>/dev/null || fail "The backend stopped while starting." "Read the error above; common causes are in README §15."
  sleep 0.5
done
curl -s -o /dev/null http://127.0.0.1:8000/api/ || fail "The backend did not answer within 15 seconds." "Read the messages above; see README §15."
print -P "%F{green}✓ Backend is answering.%f"

# Open the browser as soon as Vite is ready (in the background)
( for attempt in {1..40}; do
    curl -s -o /dev/null http://localhost:5173/ && { open http://localhost:5173/; exit 0 }
    sleep 0.5
  done ) &

# Frontend, in the foreground of this window
print -P "%F{cyan}▶ Starting the frontend (Vite) on http://localhost:5173 …%f"
print    "  Press Ctrl+C here, or close this window, to stop both servers.\n"
cd frontend && npm run dev
