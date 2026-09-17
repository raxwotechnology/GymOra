# FitnessHub

FitnessHub is a multi-role gym management system built with:

- `client/`: React + Vite
- `server/`: Express + MongoDB + Mongoose

The system supports four main roles:

- `super-admin`
- `owner`
- `coach`
- `member`

It covers gym onboarding, member management, coach workflows, attendance, POS supplement sales, sales returns, audit tracking, PDF reporting, and role-based dashboards.

## Documentation

Project handoff docs live in [`docs/`](</c:/Gym/Gym Web App/FitnessHub/docs>):

- [Architecture Overview](</c:/Gym/Gym Web App/FitnessHub/docs/architecture.md>)
- [Roles And Workflows](</c:/Gym/Gym Web App/FitnessHub/docs/roles-and-workflows.md>)
- [Auth And Account System](</c:/Gym/Gym Web App/FitnessHub/docs/auth-and-accounts.md>)
- [Developer Handoff](</c:/Gym/Gym Web App/FitnessHub/docs/developer-handoff.md>)

If someone new joins the project, start with `docs/developer-handoff.md`.

## Main Features

### Super Admin

- create gyms
- edit gyms
- suspend and reactivate gyms
- reset owner passwords
- view platform health, audit, trials, and owner management data
- manage the network of gyms as a SaaS operator

### Owner

- create coaches and members
- issue temporary passwords for created users
- manage membership plans
- manage member subscriptions
- manage equipment
- manage supplements with image upload
- run POS sales and returns
- send announcements
- import attendance
- view reports
- monitor coach audit activity

### Coach

- manage workout plans
- manage meal plans
- assign workout and meal plans to members
- message members
- check members in and out
- update coach profile

### Member

- log in with a real account
- change temporary password on first login
- view assigned workout and meal plans
- view stats and attendance
- message the coach
- update profile

## Current Auth Model

The app now uses a real role-based login flow.

- `super-admin` is bootstrapped from server config
- `owner` is created when a gym is created
- `coach` and `member` accounts are created by the owner
- newly created accounts receive a temporary password
- first login forces a password change
- optional `Maintain session for 30 days` is supported at login

More detail: [Auth And Account System](</c:/Gym/Gym Web App/FitnessHub/docs/auth-and-accounts.md>)

## Local Development

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Create the backend env file

```bash
copy server\.env.example server\.env
```

### 3. Configure `server/.env`

Example values:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/fitnesshub
JWT_SECRET=change-me
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=yourcompany@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=yourcompany@gmail.com
GEMINI_API_KEY=your_gemini_api_key_here
SMSLENZ_USER_ID=your_smslenz_user_id
SMSLENZ_API_KEY=your_smslenz_api_key
SMSLENZ_SENDER_ID=Raxwo
PAYHERE_MERCHANT_ID=your_payhere_merchant_id
PAYHERE_MERCHANT_SECRET=your_payhere_merchant_secret
PAYHERE_NOTIFY_URL=https://your-domain.com/api/payhere/notify
SUPERADMIN_EMAIL=admin@fitnesshub.local
SUPERADMIN_PASSWORD=change-me
```

SMTP is optional for local development, but it is used for password-reset OTP emails, billing emails, and emailing POS receipts to members after member sales. For Gmail, use an App Password instead of your normal Gmail password.

SMSLenz vars enable real SMS sending (welcome messages, renewal/expiry reminders, billing SMS) via `server/src/utils/sms.js`. Without them, SMS sends are skipped and logged as failed in the SMS Logs page — nothing breaks, it just won't reach a phone.

PayHere vars are required for paid gym registration and subscription renewal checkout. `PAYHERE_NOTIFY_URL` must be a publicly reachable HTTPS URL (use `ngrok` for local sandbox testing) — PayHere cannot deliver payment confirmations to `localhost`, so paid signups will silently fail to create accounts until this is a real reachable URL.

`SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD` are only used the first time the server starts against a database with no `super-admin` user yet — they don't affect an existing super-admin account. If unset, a default email and a random password are generated and written to `server/super-admin-init.txt` on first boot.

### 4. Start the app

```bash
npm run dev
```

## URLs

- Client: `http://localhost:5173`
- API: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

## Scripts

### Root

```bash
npm run dev
npm run dev:server
npm run dev:client
npm run install:all
```

### Client

```bash
npm run build --prefix client
```

### Server

```bash
npm run dev --prefix server
npm run start --prefix server
```

## Seed Data And Bootstrap Behavior

On startup, the server currently does two convenience behaviors:

- seeds demo data when the database is empty
- bootstraps a `super-admin` if one does not exist

This is useful in development, but it is something to review carefully before production.

More detail: [Developer Handoff](</c:/Gym/Gym Web App/FitnessHub/docs/developer-handoff.md>)

## Current Tech Notes

- Client production builds pass.
- The frontend bundle is still large and Vite shows a chunk-size warning.
- There are no automated tests yet.
- The frontend is cleaner than before, but some dashboard implementation still lives in shared screen files and would benefit from more splitting over time.

## Recommended Reading Order For A New Developer

1. [Developer Handoff](</c:/Gym/Gym Web App/FitnessHub/docs/developer-handoff.md>)
2. [Architecture Overview](</c:/Gym/Gym Web App/FitnessHub/docs/architecture.md>)
3. [Auth And Account System](</c:/Gym/Gym Web App/FitnessHub/docs/auth-and-accounts.md>)
4. [Roles And Workflows](</c:/Gym/Gym Web App/FitnessHub/docs/roles-and-workflows.md>)
