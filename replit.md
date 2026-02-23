# TutorTrack - Tuition Schedule & Fee Management

## Overview
A web application for managing tuition schedules and fee collection from students. Built with React + Express + PostgreSQL.

## Architecture
- **Frontend**: React with Wouter routing, TanStack Query, Shadcn UI components
- **Backend**: Express.js with Drizzle ORM
- **Database**: PostgreSQL (Neon-backed via Replit)
- **Styling**: Tailwind CSS with Shadcn component library

## Project Structure
- `shared/schema.ts` - Data models: students, schedules, payments
- `server/routes.ts` - REST API endpoints (/api/students, /api/schedules, /api/payments)
- `server/storage.ts` - Database storage layer using Drizzle ORM
- `server/db.ts` - Database connection
- `server/seed.ts` - Seed data for initial population
- `client/src/pages/` - Dashboard, Students, Schedules, Payments pages
- `client/src/components/app-sidebar.tsx` - Navigation sidebar

## Key Features
- Student management (CRUD)
- Weekly schedule management
- Fee/payment recording and tracking
- Dashboard with overview stats

## Running
- Workflow "Start application" runs `npm run dev`
- Frontend and backend served on port 5000
