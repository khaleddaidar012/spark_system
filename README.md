# Spark Engineering ERP System

A modern, responsive ERP web application for **Spark Engineering Company**.

Built with clean architecture from day one — ready for future phases.

---

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6 Modules) |
| Backend | Node.js, Express.js |
| Database | MongoDB (connection placeholder — Phase 1) |

---

## Features (Phase 1)

- Modern professional dashboard (mobile-first, responsive)
- Full **Dark / Light mode** (saved in Local Storage)
- Full **Arabic (RTL) / English (LTR)** localization (translation JSON files)
- Login page (UI only — no real authentication yet)
- Dashboard with statistic cards, placeholder charts, recent activities and quick actions
- Module layouts ready for future development:
  - Projects, Materials, Finance, Clients, Suppliers, Workers, Reports, Settings
- Reusable sidebar / navbar / footer layout rendered from shared components
- Automatic breadcrumb + active menu highlighting
- Smooth 200–300ms transitions and subtle animations only

---

## Folder Structure

```
backend/
  config/        Database connection (placeholder)
  controllers/   Route handlers (placeholder)
  middlewares/   Auth & error middlewares (placeholder)
  models/        Mongoose models (placeholder)
  routes/        Express routes (placeholder)
  services/      Business logic (placeholder)
  utils/         Helpers (placeholder)
  server.js      Express server

frontend/
  assets/
    css/         base / components / layout / pages stylesheets
    js/
      modules/   theme, i18n, router, charts, sidebar, navbar, toast
      pages/     page-specific scripts (login, dashboard)
      config/    app configuration
    images/      company logo, favicon
    icons/       SVG icon sprite
  components/    Reusable UI components (sidebar, navbar, footer)
  data/
    i18n/        en.json, ar.json translation files
  pages/         HTML pages (login, dashboard, projects, ...)
```

---

## Getting Started

### 1. Install backend dependencies

```bash
cd backend
npm install
```

### 2. Run the development server

```bash
npm start
```

Then open `http://localhost:3000` in your browser.

The server serves the frontend statically and exposes a health check at
`GET /api/health`.

> Note: MongoDB is **not connected in Phase 1**. The connection file
> (`backend/config/db.js`) is a placeholder for a later phase.

---

## Project Structure Plan (Future Phases)

| Phase | Scope |
| ----- | ----- |
| 1 | Frontend structure, UI, theme, localization (this phase) |
| 2+ | Database models, authentication (JWT + bcrypt), CRUD operations |
| 3+ | Reports, backup system, notifications, global search |

---

## Development Login

Temporary administrator account for development (until authentication is
connected to MongoDB):

```
Username: admin
Password: Spark@2026#ERP
```

> For development only. Replace with real MongoDB-backed authentication.

---

## GitHub

Repository: `https://github.com/khaleddaidar012/spark_system`

---

## License

Private project — Spark Engineering Company.
