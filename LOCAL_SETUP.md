# TutorTrack - Local Mac Installation Guide

## Prerequisites

You need these installed on your Mac:

1. **Node.js 18+** - Download from [nodejs.org](https://nodejs.org) or install via Homebrew:
   ```bash
   brew install node
   ```

2. **PostgreSQL** - Install via Homebrew:
   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   ```

## Quick Setup (Automated)

Run the setup script which handles everything:

```bash
chmod +x setup.sh
./setup.sh
```

Then start the app:

```bash
export DATABASE_URL="postgresql://$(whoami)@localhost:5432/tutortrack"
npm run dev
```

Open **http://localhost:5000** in your browser.

## Manual Setup (Step by Step)

### 1. Install dependencies

```bash
npm install
```

### 2. Create the database

```bash
createdb tutortrack
```

### 3. Set the database connection

```bash
export DATABASE_URL="postgresql://$(whoami)@localhost:5432/tutortrack"
```

If your PostgreSQL setup uses a password, adjust the URL:

```bash
export DATABASE_URL="postgresql://username:password@localhost:5432/tutortrack"
```

### 4. Push the database schema

```bash
npx drizzle-kit push
```

### 5. Start the application

```bash
npm run dev
```

Open **http://localhost:5000** in your browser. The app will seed itself with sample data on first run.

## Stopping and Restarting

- Press `Ctrl+C` to stop the server
- Run `npm run dev` again to restart (remember to set DATABASE_URL first)

## Tip: Persist DATABASE_URL

Add this to your `~/.zshrc` (or `~/.bashrc`) so you don't have to set it every time:

```bash
echo 'export DATABASE_URL="postgresql://$(whoami)@localhost:5432/tutortrack"' >> ~/.zshrc
source ~/.zshrc
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `psql: command not found` | Run `brew install postgresql@16` |
| PostgreSQL not running | Run `brew services start postgresql@16` |
| Permission denied on database | Try `createdb -U postgres tutortrack` |
| Port 5000 already in use | Set a different port: `PORT=3000 npm run dev` |
| Node version too old | Run `brew install node` to update |
