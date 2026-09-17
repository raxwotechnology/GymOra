# Developer Handoff

This document is meant for the next developer who has to work on FitnessHub without original project context.

## What This Project Is

FitnessHub is a multi-tenant gym management app with:

- platform-level `super-admin`
- gym-level `owner`
- operational `coach`
- end-user `member`

It is positioned like a SaaS gym operations platform rather than a single-gym internal tool.

## Start Here

Read these in order:

1. [README.md](</c:/Gym/Gym Web App/FitnessHub/README.md>)
2. [architecture.md](</c:/Gym/Gym Web App/FitnessHub/docs/architecture.md>)
3. [auth-and-accounts.md](</c:/Gym/Gym Web App/FitnessHub/docs/auth-and-accounts.md>)
4. [roles-and-workflows.md](</c:/Gym/Gym Web App/FitnessHub/docs/roles-and-workflows.md>)

## Current Important Behaviors

### Login And Accounts

- temporary passwords are used for newly created owner/coach/member accounts
- first login forces password change
- 30-day session option exists
- owner and super-admin reset flows issue new temporary passwords

### Memberships

- member subscriptions are date-driven
- expired memberships auto-mark members inactive
- attendance rejects expired members

### Audit

- coach activity is tracked and visible to owners
- this includes plan create/edit/delete and assignment flows

### POS

- POS generates a bill modal on sale completion
- member sales can email a receipt when SMTP is configured
- walk-in sales still generate a printable bill, just without member email routing

## Most Important Files By Area

### Frontend

- routes:
  - [client/src/app/routes/AppRoutes.jsx](</c:/Gym/Gym Web App/FitnessHub/client/src/app/routes/AppRoutes.jsx>)
- auth state:
  - [client/src/features/auth/context/AuthContext.jsx](</c:/Gym/Gym Web App/FitnessHub/client/src/features/auth/context/AuthContext.jsx>)
- dashboard state:
  - [client/src/features/dashboard/context/DashboardContext.jsx](</c:/Gym/Gym Web App/FitnessHub/client/src/features/dashboard/context/DashboardContext.jsx>)
- dashboard UI:
  - [client/src/features/dashboard/shared/dashboardScreens.jsx](</c:/Gym/Gym Web App/FitnessHub/client/src/features/dashboard/shared/dashboardScreens.jsx>)
- role entry pages:
  - `client/src/features/dashboard/*/pages/*`

### Backend

- startup:
  - [server/src/index.js](</c:/Gym/Gym Web App/FitnessHub/server/src/index.js>)
- auth:
  - [server/src/controllers/authController.js](</c:/Gym/Gym Web App/FitnessHub/server/src/controllers/authController.js>)
  - [server/src/middleware/auth.js](</c:/Gym/Gym Web App/FitnessHub/server/src/middleware/auth.js>)
- dashboards:
  - [server/src/controllers/dashboardController.js](</c:/Gym/Gym Web App/FitnessHub/server/src/controllers/dashboardController.js>)
- owner operations:
  - [server/src/controllers/ownerController.js](</c:/Gym/Gym Web App/FitnessHub/server/src/controllers/ownerController.js>)
- super-admin operations:
  - [server/src/controllers/adminController.js](</c:/Gym/Gym Web App/FitnessHub/server/src/controllers/adminController.js>)

## Current Weak Spots / Sharp Edges

These are the first things a new developer should know:

### 1. Startup is still dev-friendly, not fully production-safe

Current backend startup still:

- seeds demo data on empty DB
- bootstraps super-admin automatically
- prints the temporary super-admin password when created

This is convenient in development but should be revisited before production rollout.

### 2. Large Controller Files

These files carry a lot of responsibility:

- `server/src/controllers/ownerController.js`
- `server/src/controllers/dashboardController.js`

They work, but they are natural refactor candidates.

### 3. Large Shared Dashboard File

- `client/src/features/dashboard/shared/dashboardScreens.jsx`

This file is still the main UI hotspot. If a dashboard issue appears, it is very likely here.

### 4. No Automated Test Suite

There are currently no automated tests configured in root, client, or server package scripts.

That means changes should be verified with:

- client build
- server module load checks
- manual role-by-role smoke testing

## Recommended Workflow For Future Changes

When adding or changing features:

1. trace the frontend action in `dashboardScreens.jsx`
2. trace the dashboard action wrapper in `DashboardContext.jsx`
3. trace the API call file in `client/src/features/*/api`
4. trace the backend route
5. trace the controller
6. inspect the underlying model and any helper utilities

This path is usually faster than starting from the model upward.

## Suggested Next Refactors

These are worthwhile improvements for maintainability:

1. split `dashboardScreens.jsx` into role-specific sections/components
2. split `ownerController.js` by domain
3. split `dashboardController.js` by role or service
4. add production hardening:
   - no automatic seed in production
   - stricter env validation
   - secure bootstrap handling
   - rate limiting and security middleware
5. add automated tests for auth and owner flows

## Suggested Smoke Test Checklist

Before deploying any meaningful change, verify:

1. super-admin login
2. create gym and owner
3. owner first login and forced password change
4. owner create coach and member
5. coach login and plan assignment
6. member login and dashboard render
7. attendance check-in/check-out
8. POS sale and bill generation
9. member sale receipt email behavior
10. owner audit log visibility

## Documentation Maintenance Rule

If a future developer changes any of these areas, update docs at the same time:

- role responsibilities
- auth/account flow
- environment variables
- startup/seed behavior
- core workflows like POS, subscriptions, audit, or attendance
