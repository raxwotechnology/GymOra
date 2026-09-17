# Roles And Workflows

## Role Summary

FitnessHub has four active roles:

- `super-admin`
- `owner`
- `coach`
- `member`

Each role has a dedicated dashboard route:

- `/super-admin`
- `/owner`
- `/coach`
- `/member`

## Super Admin

Super-admin is the platform operator role for the company running the system.

### Main Responsibilities

- create gyms
- edit gyms
- suspend and reactivate gyms
- reset owner passwords
- view gym details
- monitor platform health
- monitor cross-gym notifications
- manage trials and owner state
- review platform audit summaries

### What Super Admin Does Not Do

- does not act as coach
- does not run daily attendance for gyms
- does not assign workout or meal plans
- does not use support impersonation

Support access was intentionally removed.

## Owner

Owner is the operational manager of a single gym.

### Main Responsibilities

- create coach accounts
- create member accounts
- assign members to coaches
- manage memberships and subscription data
- manage supplements and POS
- manage returns
- manage equipment
- manage announcements
- manage attendance and attendance import
- view reports
- monitor coach activity audit logs

### Important Owner Flows

#### Create Coach

1. owner opens `Coaches`
2. clicks `Add Coach`
3. enters coach details
4. system creates a linked `User + Coach`
5. temporary password is shown once
6. coach must change password on first login

#### Create Member

1. owner opens `Members`
2. clicks `Add Member`
3. enters member details, plan, coach, payment values
4. system creates linked `User + Member`
5. temporary password is shown once
6. member must change password on first login

#### POS Sale

1. owner opens `POS`
2. chooses `Walk-in Customer` or `Member Sale`
3. completes product, quantity, payment data
4. clicks `Complete Sale`
5. system creates sale, decrements stock, generates bill modal
6. if it is a member sale and SMTP is configured, receipt email is sent to the member’s account email

## Coach

Coach works inside the gym’s member-programming workflow.

### Main Responsibilities

- manage workout plans
- manage meal plans
- assign workout plans to members
- assign meal plans to members
- remove assigned plans
- message members
- mark attendance
- update own profile

### Audit Coverage

Coach actions are tracked in the audit system for the owner view. The tracked actions include:

- create/update/delete workout plans
- create/update/delete meal plans
- assign/remove workout plans
- assign/remove meal plans
- attendance check-in/check-out actions
- member messages
- coach profile edits

## Member

Member is the end-user role for gym clients.

### Main Responsibilities

- log in with personal credentials
- change temporary password on first login
- view workout plan
- view meal plan
- view attendance and stats
- message coach
- update profile

### Member Subscription Behavior

- members are automatically marked inactive when subscription expiry is reached
- expired members cannot continue normal attendance behavior
- renewing or extending subscription reactivates them when valid again

## Notification Model

### Owner Notifications

Owner sees gym-level operational notifications such as:

- expiring memberships
- payment concerns
- stock issues
- activity and operational alerts

### Super Admin Notifications

Super-admin sees platform-level notifications such as:

- trial gyms ending soon
- suspended gyms
- gyms with high unpaid membership counts
- gyms with high expired membership counts
- inactivity/risk patterns across gyms

## Reporting

Owner PDF reporting covers:

- member-focused reports
- attendance reports
- finance reports
- inventory reports
- summary reports

Reports are generated client-side using `jsPDF` and `jspdf-autotable`.

## POS And Billing Notes

The POS flow now supports:

- walk-in sales
- member sales
- bill modal generation
- printable bill output
- optional receipt email for member sales

Email delivery requires SMTP config in `server/.env`.
