# Authentication and Registration

This document describes how user authentication and registration work in Campus Circle, how the auth schema is kept in sync, and how to restrict sign-ups to your application or tenant domain.

## Overview

- **Supabase (production / hosted)**: Users sign in via Supabase Auth. Accounts live in Supabase’s **`auth.users`** table. The application **does not** use a database trigger to sync; it syncs in **application code** when users register and when demo users are created.
- **Application schema**: `campus_circle.users`, `campus_circle.parents`, and `campus_circle.students` reference **`campus_circle_auth.users`** (by `id`). So every authenticated user must have a row in `campus_circle_auth.users` for foreign keys to be valid.

## Flow: Where do users go?

1. **Real user registers (Parent or Student)**  
   - Frontend calls `POST /api/users/register/parent` or `POST /api/users/register/student`.  
   - Backend creates the user in **Supabase Auth** (`auth.users`) via the Admin API.  
   - Backend then **syncs** that user into **`campus_circle_auth.users`** (same `id`, `email`, `email_confirmed_at`).  
   - Backend inserts into **`campus_circle.users`** and **`campus_circle.parents`** or **`campus_circle.students`**.  
   So: **auth.users (Supabase) → app syncs → campus_circle_auth.users → campus_circle.users + profile tables.**

2. **Demo users (setup script)**  
   - `./infra/scripts/setup-test-users.sh` runs `setup_test_users.py`.  
   - The script creates users in **Supabase Auth** and then **syncs** them into **`campus_circle_auth.users`**, then into `campus_circle.users` and profile tables.  
   Same idea: **auth.users → script syncs → campus_circle_auth.users → campus_circle.**

3. **Login (existing user)**  
   - User signs in with Supabase Auth (email/password).  
   - If the user exists in Auth but not yet in `campus_circle.users`, the backend can auto-create a row in **`campus_circle_auth.users`** and **`campus_circle.users`** so the app can proceed (see backend login handler).

There is **no database trigger** that copies `auth.users` → `campus_circle_auth.users`. All sync is done in:
- Backend: `register_parent`, `register_student`, and the login auto-link path.
- Script: `infra/scripts/setup_test_users.py`.

## Avoiding duplicates and keeping users app-specific

Supabase **`auth.users`** is per project: any user created in that project is global to it. To keep Campus Circle users specific to your application (or tenant) and avoid confusion with other apps using the same Supabase project, you can restrict **registration** by email domain.

- **Option: Allowed email domains**  
  Set **`ALLOWED_EMAIL_DOMAINS`** in `.env` to a comma-separated list of domains. Only addresses whose domain is in that list can register (parent or student).  
  - Example: `ALLOWED_EMAIL_DOMAINS=campuscircle.com`  
  - Example: `ALLOWED_EMAIL_DOMAINS=school.edu,campuscircle.com`  
  - If unset or empty, **any** domain can register.

This applies only to **registration** (sign-up). It does not change who can sign in; it only prevents new accounts from being created for disallowed domains. Existing users in `auth.users` are unaffected.

## Scripts and configuration

| Script / config | Purpose |
|----------------|--------|
| `./infra/scripts/setup-test-users.sh` | Creates demo users in Supabase Auth and syncs them to `campus_circle_auth.users` and app tables. Run after migrations. |
| `infra/scripts/setup_test_users.py` | Called by the shell script; uses Admin API and DB to create/sync demo users. |
| `ALLOWED_EMAIL_DOMAINS` (optional) | Restrict registration to specific email domains (e.g. your school or tenant). |

## Summary

- **Actual users** who register in the app are created in **Supabase `auth.users`**; the **backend** syncs them into **`campus_circle_auth.users`** and then into `campus_circle.users` and parents/students.  
- **No migrate script** syncs Auth → `campus_circle_auth`; sync is in **application code** and in **setup-test-users**.  
- To keep users **application/tenant-specific** and reduce duplicate or unrelated accounts in `auth.users`, set **`ALLOWED_EMAIL_DOMAINS`** and rely on the registration validation described above.
