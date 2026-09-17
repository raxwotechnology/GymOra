# Auth And Account System

## Overview

FitnessHub now uses a real account-based login model instead of relying only on shared demo passwords.

The login system is based on:

- `User` records
- hashed passwords
- JWT sessions
- role-based dashboard routing
- first-login password change for created accounts

## Roles

Supported auth roles:

- `super-admin`
- `owner`
- `coach`
- `member`

## Account Creation Model

### Super Admin

Super-admin is bootstrapped by the server at startup if it does not already exist.

Relevant files:

- [server/src/data/bootstrapSuperAdmin.js](</c:/Gym/Gym Web App/FitnessHub/server/src/data/bootstrapSuperAdmin.js>)
- [server/src/index.js](</c:/Gym/Gym Web App/FitnessHub/server/src/index.js>)

### Owner

Owners are created when a super-admin creates a gym.

Flow:

1. super-admin creates gym
2. backend creates `Gym`
3. backend creates linked owner `User`
4. temporary password is generated
5. super-admin sees the temporary password once

### Coach And Member

Coaches and members are created by the owner.

Flow:

1. owner submits create form
2. backend creates linked `User`
3. backend creates linked `Coach` or `Member`
4. temporary password is generated
5. owner sees it once

## First Login Password Change

Newly created users are marked with `mustChangePassword = true`.

Flow:

1. user logs in with temporary password
2. app redirects to `/change-password`
3. user sets a new real password
4. backend clears `mustChangePassword`
5. user enters normal dashboard flow

## Remember Me / Session Duration

The login form includes a `Maintain session for 30 days` option.

Behavior:

- unchecked: default session duration
- checked: 30-day token

This value is preserved through the forced password change flow.

## Frontend Auth Files

Main files:

- [LoginPage.jsx](</c:/Gym/Gym Web App/FitnessHub/client/src/features/auth/pages/LoginPage.jsx>)
- [ChangePasswordPage.jsx](</c:/Gym/Gym Web App/FitnessHub/client/src/features/auth/pages/ChangePasswordPage.jsx>)
- [AuthContext.jsx](</c:/Gym/Gym Web App/FitnessHub/client/src/features/auth/context/AuthContext.jsx>)
- [roleToPath.js](</c:/Gym/Gym Web App/FitnessHub/client/src/features/auth/utils/roleToPath.js>)
- [ProtectedRoute.jsx](</c:/Gym/Gym Web App/FitnessHub/client/src/app/routes/ProtectedRoute.jsx>)

## Backend Auth Files

Main files:

- [authController.js](</c:/Gym/Gym Web App/FitnessHub/server/src/controllers/authController.js>)
- [authRoutes.js](</c:/Gym/Gym Web App/FitnessHub/server/src/routes/authRoutes.js>)
- [auth.js](</c:/Gym/Gym Web App/FitnessHub/server/src/middleware/auth.js>)
- [password.js](</c:/Gym/Gym Web App/FitnessHub/server/src/utils/password.js>)
- [token.js](</c:/Gym/Gym Web App/FitnessHub/server/src/utils/token.js>)

## Important Rules

- email must be unique across all users
- a user must only see their own role dashboard
- missing or invalid linked data should fail safely, not fall back to someone else’s record
- inactive accounts are blocked by backend auth middleware

## Current Known Auth Caveats

These should be understood by a future developer:

- the server still seeds demo data on empty databases
- seed data still includes known demo credentials for development
- super-admin bootstrap currently logs the temporary password at creation time
- there is no forgot-password email flow yet
- owner/admin reset flows exist, but there is no self-service reset flow yet

## Registration Note

There is still backend support for `register-member`, but the current main product direction is owner-created accounts rather than public self-registration. A future developer should confirm whether self-registration is still part of the desired business model before extending it.
