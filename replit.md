# TutorTrack - Tuition Schedule & Fee Management

## Overview
A web application for managing tuition schedules and fee collection from students. Built with React + Express + PostgreSQL. Displays amounts in QAR (Qatari Riyal) with INR (Indian Rupee) conversion.

## Architecture
- **Frontend**: React with Wouter routing, TanStack Query, Shadcn UI components
- **Backend**: Express.js with Drizzle ORM
- **Database**: PostgreSQL (Neon-backed via Replit)
- **Styling**: Tailwind CSS with Shadcn component library

## Project Structure
- `shared/schema.ts` - Data models: students, schedules, payments, studentFees
- `server/routes.ts` - REST API endpoints (/api/students, /api/schedules, /api/payments, /api/student-fees, /api/backup, /api/restore)
- `server/storage.ts` - Database storage layer using Drizzle ORM
- `server/db.ts` - Database connection
- `server/seed.ts` - Seed data for initial population
- `client/src/pages/` - Dashboard, Students, Schedules, Payments, Reports, Backup pages
- `client/src/components/app-sidebar.tsx` - Navigation sidebar
- `client/src/lib/currency.ts` - QAR/INR formatting utilities

## Key Features
- Student management (CRUD) with family/household grouping
- Weekly schedule management
- Fee/payment recording, editing, and tracking
- Variable monthly fees per student (overrides per month/year, default fee as fallback)
- Family grouping: students can be assigned a familyName to identify household members
- Family Fees report: per-household fee summary with paid/pending status per member
- CSV bulk upload for students, schedules, and payments
- Dashboard with overview stats
- Reports with charts (students, schedules, payments, families analytics)
- Backup & restore database (JSON export/import with transactional restore)

## Data Model
- `students` - name, phone, email, grade, subject, monthlyFee (default), status, familyName
- `schedules` - studentId, dayOfWeek, startTime, endTime, subject
- `payments` - studentId, amount, month, year, paidDate, method, notes
- `studentFees` - studentId, month, year, amount (per-month fee overrides)

## Running
- Workflow "Start application" runs `npm run dev`
- Frontend and backend served on port 5000
