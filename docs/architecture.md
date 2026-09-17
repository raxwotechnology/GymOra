# Architecture Overview

## High-Level Shape

FitnessHub is a two-part application:

- `client/`: React + Vite SPA
- `server/`: Express API with MongoDB

The client authenticates with JWT and calls the API under `/api/*`.

## Frontend Structure

Main frontend folders:

- `client/src/app/`
  - app shell and routing
- `client/src/components/`
  - reusable UI and layout pieces
- `client/src/features/`
  - feature/domain folders
- `client/src/lib/`
  - API client and shared helpers

Important frontend entry points:

- [client/src/main.jsx](</c:/Gym/Gym Web App/FitnessHub/client/src/main.jsx>)
- [client/src/app/routes/AppRoutes.jsx](</c:/Gym/Gym Web App/FitnessHub/client/src/app/routes/AppRoutes.jsx>)
- [client/src/features/auth/context/AuthContext.jsx](</c:/Gym/Gym Web App/FitnessHub/client/src/features/auth/context/AuthContext.jsx>)
- [client/src/features/dashboard/context/DashboardContext.jsx](</c:/Gym/Gym Web App/FitnessHub/client/src/features/dashboard/context/DashboardContext.jsx>)

### Dashboard Rendering

Role dashboards are routed through:

- [SuperAdminDashboard.jsx](</c:/Gym/Gym Web App/FitnessHub/client/src/features/dashboard/super-admin/pages/SuperAdminDashboard.jsx>)
- [OwnerDashboard.jsx](</c:/Gym/Gym Web App/FitnessHub/client/src/features/dashboard/owner/pages/OwnerDashboard.jsx>)
- [CoachDashboard.jsx](</c:/Gym/Gym Web App/FitnessHub/client/src/features/dashboard/coach/pages/CoachDashboard.jsx>)
- [MemberDashboard.jsx](</c:/Gym/Gym Web App/FitnessHub/client/src/features/dashboard/member/pages/MemberDashboard.jsx>)

Those page files are currently thin wrappers around the shared dashboard implementation in:

- [dashboardScreens.jsx](</c:/Gym/Gym Web App/FitnessHub/client/src/features/dashboard/shared/dashboardScreens.jsx>)

That file still contains a lot of role UI logic. It works, but it remains a major place to keep an eye on when making dashboard changes.

## Backend Structure

Main backend folders:

- `server/src/config/`
  - database config
- `server/src/controllers/`
  - request handlers and business orchestration
- `server/src/data/`
  - seed and bootstrap helpers
- `server/src/middleware/`
  - auth middleware
- `server/src/models/`
  - Mongoose models
- `server/src/routes/`
  - Express route registration
- `server/src/utils/`
  - token, password, subscription, email helpers

Important backend entry points:

- [server/src/index.js](</c:/Gym/Gym Web App/FitnessHub/server/src/index.js>)
- [server/src/routes/authRoutes.js](</c:/Gym/Gym Web App/FitnessHub/server/src/routes/authRoutes.js>)
- [server/src/routes/dashboardRoutes.js](</c:/Gym/Gym Web App/FitnessHub/server/src/routes/dashboardRoutes.js>)
- [server/src/routes/adminRoutes.js](</c:/Gym/Gym Web App/FitnessHub/server/src/routes/adminRoutes.js>)
- [server/src/routes/ownerRoutes.js](</c:/Gym/Gym Web App/FitnessHub/server/src/routes/ownerRoutes.js>)

### Current Backend Reality

The top-level structure is clean enough, but some controllers are still large:

- [dashboardController.js](</c:/Gym/Gym Web App/FitnessHub/server/src/controllers/dashboardController.js>)
- [ownerController.js](</c:/Gym/Gym Web App/FitnessHub/server/src/controllers/ownerController.js>)

These files currently handle a lot of the app’s behavior and are natural candidates for future modular splitting.

## Data Model Overview

Key models:

- `User`
- `Gym`
- `Coach`
- `Member`
- `MembershipPlan`
- `WorkoutPlan`
- `MealPlan`
- `Attendance`
- `Message`
- `Announcement`
- `Equipment`
- `Expense`
- `Supplement`
- `Sale`
- `SaleReturn`
- `AuditLog`

### Identity Model

Authentication is centered on `User`.

Then role-specific records link back to `User` where needed:

- `Coach.user`
- `Member.user`

The `super-admin` user is platform-level and does not belong to a single gym in the same way gym users do.

## Request Flow

Typical flow:

1. user logs in through `/api/auth/login`
2. client stores JWT in local storage
3. client calls `/api/dashboard`
4. backend builds a role-specific dashboard payload
5. dashboard actions call route-specific APIs
6. client refreshes dashboard state after mutations

## Key Cross-Cutting Utilities

- [password.js](</c:/Gym/Gym Web App/FitnessHub/server/src/utils/password.js>)
  - hashing, verification, temporary password generation
- [token.js](</c:/Gym/Gym Web App/FitnessHub/server/src/utils/token.js>)
  - JWT issuance and verification
- [subscription.js](</c:/Gym/Gym Web App/FitnessHub/server/src/utils/subscription.js>)
  - expiry and status logic
- [email.js](</c:/Gym/Gym Web App/FitnessHub/server/src/utils/email.js>)
  - SMTP bill email sending

## File Ownership Guidance

If a new developer is changing a specific area, these are the first places to inspect:

- login/session issues:
  - `client/src/features/auth/*`
  - `server/src/controllers/authController.js`
  - `server/src/middleware/auth.js`
- dashboard rendering issues:
  - `client/src/features/dashboard/shared/dashboardScreens.jsx`
  - `client/src/features/dashboard/context/DashboardContext.jsx`
  - `server/src/controllers/dashboardController.js`
- owner operations:
  - `server/src/controllers/ownerController.js`
  - `server/src/routes/ownerRoutes.js`
  - `client/src/features/owner/api/ownerApi.js`
- super-admin gym management:
  - `server/src/controllers/adminController.js`
  - `server/src/routes/adminRoutes.js`
  - `client/src/features/gyms/api/adminApi.js`
