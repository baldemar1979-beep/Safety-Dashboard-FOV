# FOV Safety Dashboard

A full-stack web application for managing Field of View (FOV) driver safety alerts. Supports week-over-week Excel uploads, a master admin dashboard, and individual employee dashboards.

## Features

- 🔐 **Role-based authentication** — Admin and Employee roles
- 📤 **Excel upload** — Import weekly FOV alert data (.xlsx, .xls, .csv)
- 📊 **Master Dashboard** — Admin overview of all drivers, alerts, and trends
- 🎯 **Employee Dashboard** — Each driver sees their own personalized stats
- 📋 **Events Table** — Filterable, searchable, paginated event list
- 📥 **Export to Excel** — Download filtered events
- 👥 **User Management** — Create/edit/delete employee accounts
- 📈 **Week-over-Week Analytics** — Track trends across multiple upload cycles

## Data Columns Supported

```
event_id, vehicle_id, vehicle, driver, detection_time, utc_offset,
event_type, detected_event_type, duration_seconds, speed_kph,
travel_metres, latitude, longitude, audio_alert, vibration_alert,
visual_alert, trip_distance_metres, trip_time_seconds, confirmation,
confirmation_time, classification, fleet, timezone, account,
service_provider, shift, crew, guardian_unit, software_version, tags
```

## Quick Start

### Prerequisites
- Node.js 20+ (or Node.js 22+)
- npm 9+

### 1. Install Dependencies

```bash
# Install backend dependencies
npm install --prefix backend

# Install frontend dependencies
npm install --prefix frontend
```

### 2. Start the Backend

```bash
npm run dev:backend
# API will be available at http://localhost:3001
```

### 3. Start the Frontend (development)

```bash
npm run dev:frontend
# App will be available at http://localhost:5173
```

### 4. Default Login Credentials

| Username | Password | Role  |
|----------|----------|-------|
| `admin`  | `admin123` | Admin |

> ⚠️ **Important:** Change the admin password immediately after first login.

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express server entry point
│   │   ├── database.ts       # SQLite setup & schema
│   │   ├── middleware/
│   │   │   └── auth.ts       # JWT authentication
│   │   └── routes/
│   │       ├── auth.ts       # Login endpoints
│   │       ├── events.ts     # FOV events CRUD + upload
│   │       ├── users.ts      # User management
│   │       └── dashboard.ts  # Analytics & stats
│   └── data/
│       └── safety_dashboard.db  # SQLite database (auto-created)
│
└── frontend/
    └── src/
        ├── App.tsx
        ├── api.ts             # Axios API client
        ├── types.ts           # TypeScript types
        ├── contexts/
        │   └── AuthContext.tsx
        ├── components/
        │   ├── Layout.tsx
        │   └── StatCard.tsx
        └── pages/
            ├── LoginPage.tsx
            ├── MasterDashboard.tsx
            ├── EmployeeDashboard.tsx
            ├── EventsPage.tsx
            ├── UploadPage.tsx
            └── UsersPage.tsx
```

## Usage Workflow

1. **Admin**: Log in and upload the weekly Excel file via "Upload Data"
2. **Admin**: Go to "Manage Users" to create employee accounts and assign each to a driver name
3. **Employees**: Log in and view their personalized dashboard filtered to their driver
4. **Admin**: View the "Master Dashboard" to see all drivers' performance

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/events/upload` | Upload Excel file |
| GET | `/api/events` | List events (paginated) |
| GET | `/api/events/export/excel` | Export to Excel |
| GET | `/api/dashboard/master` | Master dashboard stats |
| GET | `/api/dashboard/driver/:name` | Per-driver stats |
| GET | `/api/users` | List users (admin) |
| POST | `/api/users` | Create user (admin) |
| PUT | `/api/users/:id` | Update user (admin) |
| DELETE | `/api/users/:id` | Delete user (admin) |
