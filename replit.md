# GestãoPro — Business Management System

## Project Overview
A full-stack business management system (ERP) for service providers. Manages clients, budgets, work orders, receipts, and financial records. Includes WhatsApp integration for sending PDFs and notifications.

## Architecture
- **Frontend**: React 18 + Vite (port 5000) — Tailwind CSS, Radix UI, TanStack Query, React Router
- **Backend**: Express 5 (port 3001) — JWT auth, PostgreSQL via `pg`, Multer for file uploads
- **Database**: Replit built-in PostgreSQL (DATABASE_URL env var auto-provided)
- **WhatsApp**: `@whiskeysockets/baileys` — connects via QR code, sends PDFs

## Running the App
```
npm run dev
```
Starts both the Express backend (port 3001) and Vite dev server (port 5000) concurrently. Vite proxies `/api` and `/uploads` requests to the backend.

## Key Files
- `server.js` — Express backend, DB schema init, all API routes
- `src/App.jsx` — React root, routing, auth context
- `src/api/localClient.js` — Frontend API client (relative `/api` paths)
- `src/lib/AuthContext.jsx` — Auth state management
- `whatsapp/service.js` — WhatsApp connection management
- `whatsapp/pdfGenerator.js` — PDF generation with pdfkit

## Environment Variables
- `DATABASE_URL` — Replit PostgreSQL connection string (auto-set)
- `JWT_SECRET` — Secret for JWT token signing (set as Replit secret)

## Database
- Auto-initialized on server start via `initDB()` in server.js
- Tables: `users`, `user_permissions`, `clients`, `budgets`, `budget_requests`, `work_orders`, `receipts`, `financial`, `settings`, `layout_settings`, `section_styles`
- Demo users seeded: Admin, Employee, Client

## User Roles
- **admin** — full access to all features
- **employee** — access based on permissions set by admin
- **client** — client portal only (request budgets, view work orders)

## File Uploads
- Stored in `uploads/` directory
- Served statically by Express at `/uploads`
- Max 20MB per file
