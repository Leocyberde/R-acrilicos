# GestãoPro - Business Management System

## Overview
A comprehensive ERP/CRM business management system for handling budgets, work orders, financial tracking, and client relationships. Built with React (frontend) and Express (backend).

## Architecture
- **Frontend**: React 18 + Vite, served on port 5000
- **Backend**: Express.js API server on port 3001
- **Database**: PostgreSQL (Replit built-in, via DATABASE_URL)
- **Auth**: JWT + BcryptJS

## Key Files
- `server.js` - Express backend with all API routes and DB initialization
- `src/` - React frontend application
- `src/pages/` - Application views (Dashboard, Budgets, WorkOrders, Clients, Financial, etc.)
- `src/components/` - Reusable UI components (shadcn/ui-style)
- `src/api/localClient.js` - API client for backend communication
- `src/lib/` - Auth context, utilities
- `vite.config.js` - Vite config with proxy to backend
- `uploads/` - File upload storage

## Running the App
```bash
npm run dev
```
This uses `concurrently` to start both the Express server (port 3001) and Vite dev server (port 5000).

## Default Demo Accounts
- `admin@gestao.pro` / `demo` — Administrator (full access)
- `funcionario@gestao.pro` / `demo` — Employee (operational access)
- `cliente@gestao.pro` / `demo` — Client (portal access)

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (set by Replit)
- `JWT_SECRET` — JWT signing secret (defaults to hardcoded value, should be set in production)

## Dependencies
- **Frontend**: React, React Router, TanStack Query, Tailwind CSS, Radix UI, Recharts, Lucide
- **Backend**: Express 5, pg, jsonwebtoken, bcryptjs, multer, cors
