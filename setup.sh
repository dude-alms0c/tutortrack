#!/bin/bash
set -e

echo "================================================"
echo "  TutorTrack - Local Mac Setup"
echo "================================================"
echo ""

check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo "ERROR: $1 is not installed."
    echo "$2"
    exit 1
  fi
}

check_command "node" "Install Node.js: https://nodejs.org or run: brew install node"
check_command "npm" "npm should come with Node.js. Reinstall Node.js if missing."

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "ERROR: Node.js 18+ required. You have $(node -v)."
  echo "Update: brew install node"
  exit 1
fi

echo "[1/5] Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
  echo ""
  echo "PostgreSQL is not installed. Install it with:"
  echo "  brew install postgresql@16"
  echo "  brew services start postgresql@16"
  echo ""
  echo "Then re-run this script."
  exit 1
fi

if ! pg_isready -q 2>/dev/null; then
  echo "PostgreSQL is not running. Starting it..."
  brew services start postgresql@16 2>/dev/null || brew services start postgresql 2>/dev/null || {
    echo "Could not start PostgreSQL. Try manually:"
    echo "  brew services start postgresql@16"
    exit 1
  }
  sleep 2
fi
echo "  PostgreSQL is running."

echo ""
echo "[2/5] Creating database..."
DB_NAME="tutortrack"
DB_USER=$(whoami)

if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo "  Database '$DB_NAME' already exists."
else
  createdb "$DB_NAME"
  echo "  Database '$DB_NAME' created."
fi

export DATABASE_URL="postgresql://${DB_USER}@localhost:5432/${DB_NAME}"
echo "  DATABASE_URL=$DATABASE_URL"

echo ""
echo "[3/5] Installing dependencies..."
npm install

echo ""
echo "[4/5] Pushing database schema..."
npx drizzle-kit push

echo ""
echo "[5/5] Setup complete!"
echo ""
echo "================================================"
echo "  To start the application, run:"
echo ""
echo "    export DATABASE_URL=\"$DATABASE_URL\""
echo "    npm run dev"
echo ""
echo "  Then open http://localhost:5000 in your browser."
echo "================================================"
