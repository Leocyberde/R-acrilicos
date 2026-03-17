# GestãoPro — Business Management App

## Overview
A comprehensive Brazilian business management application (GestãoPro) built with React/Vite for the frontend and Express/PostgreSQL for the backend. The UI is in Portuguese (Brazilian) and manages budgets, work orders, receipts, clients, financial records, production tracking, and accounts receivable.

## Architecture

### Frontend
- **React 18** with **Vite** (port 5000)
- **Tailwind CSS** + **shadcn/ui** (Radix UI components)
- **React Router v6** for client-side routing
- **TanStack React Query** for server state
- **Recharts** for charts, **jsPDF** + **html2canvas** for PDF export

### Backend
- **Express** server (port 3001)
- **PostgreSQL** via Replit's built-in database
- **JWT** authentication (stored in localStorage)
- **multer** for file uploads (saved to `/uploads/`)
- **bcryptjs** for password hashing

### Key Files
- `server.js` — Express API server (auth, entities, file upload)
- `src/api/localClient.js` — Frontend API client (replaces Base44 SDK)
- `src/api/base44Client.js` — Re-exports `localClient` as `base44` (backward compat)
- `src/lib/AuthContext.jsx` — Auth state management via JWT
- `src/pages/Login.jsx` — Login page
- `src/Layout.jsx` — App shell with sidebar navigation
- `src/pages.config.js` — Page routing configuration
- `src/pages/` — All application pages

## Database Tables
- `users` — User accounts with roles (admin, user, cliente)
- `user_permissions` — Module-level permissions per user
- `clients` — Client records
- `budgets` — Budget records
- `budget_requests` — Client budget requests
- `work_orders` — Work orders
- `receipts` — Payment receipts
- `financial` — Financial transactions
- `settings` — Company settings
- `layout_settings` — Page layout configurations
- `section_styles` — Section style configurations

## Running the App
- `npm run dev` — Starts both Express server and Vite dev server concurrently
- Default admin: `admin@gestao.pro` / `admin123`

## Migration Notes
Migrated from Base44 platform to Replit:
- Replaced `@base44/sdk` with local `src/api/localClient.js`
- Replaced Base44 auth with JWT-based auth via Express + PostgreSQL
- Replaced Base44 entity storage with PostgreSQL tables
- Replaced Base44 file uploads with multer + local disk storage
- Removed `@base44/vite-plugin` from Vite config
- Added login page (`src/pages/Login.jsx`)
