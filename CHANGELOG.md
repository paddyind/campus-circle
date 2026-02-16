# Changelog

All notable changes to the CampusCircle project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Database layout**: Schema/seed SQL moved from `database/migrations/` to `database/`; migrations are optional when no migration data. Backups and initial/demo data use `database/backup/`. Scripts and docs updated.
- **Docs**: Children-under-14 design merged into `docs/DATABASE.md`; standalone `CHILDREN_UNDER_14_DESIGN.md` removed.
- **Docker**: Single `Dockerfile.frontend` (multi-stage: dev + prod); migrations service uses `postgres:15-alpine` image. Removed `Dockerfile.frontend.dev` and `Dockerfile.migrations`.

### Added
- **Tenant productization (Phase 1):** Default tenant "Demo-Circle" with tenant registry (`public.tenants`); migration `003_tenant_registry.sql`. Documentation: [TENANTS_AND_DEPLOYMENT.md](docs/TENANTS_AND_DEPLOYMENT.md) (tenants + deployment). ARCHITECTURE and README updated. CI and test data unchanged.
- Admin: Contact Submissions management with status tracking
- Admin: View registered members for events with pagination (RegistrationsModal on event detail and Manage Events)
- API: Endpoint for paginated event registrations (`GET /api/events/{id}/registrations`)
- Pre-deployment sanity test script (`scripts/sanity-test.sh`); runs in CI before build
- Script to fix duplicate/seed data (`scripts/fix_db_data.py`) for one-off DB cleanup
- API: Endpoint for contact form submissions (`POST /api/users/contact`)
- Database: `contact_submissions` table for handling user feedback
- Isolated authentication schema (`campus_circle_auth`) for complete portability
- Database backup and restore scripts (`backup-db.sh`, `restore-db.sh`)
- Comprehensive database schema with `campus_circle` namespace
- Docker Compose orchestration for all services
- FastAPI backend with Supabase integration
- React frontend with Redux state management
- Tailwind CSS for responsive design
- JWT-based authentication via Supabase
- Event management system
- Parent and student dashboards
- User registration and login flows
- Admin dashboard with user and event management
- Contact form for feedback, complaints, and suggestions
- Help page with FAQ and test credentials (configurable)
- Parent-child management: Parents can add children under 14 without creating login accounts
- Child email management: Children use parent's email by default, can be updated later
- API endpoint to update child information (`PUT /api/users/me/children/{child_id}`)
- Long-term solution for children under 14: No auth accounts required, email defaults to parent's email
- Migration `009_update_students_for_children_under_14.sql` for new child data model
- Documentation: `CHILDREN_UNDER_14_DESIGN.md` for architectural decisions
- Consolidated migrations: schema and seed in `database/` (001_schema.sql, 002_seed.sql)
- Single database script `infra/scripts/db.py`: migrate, reset, backup, restore (uses .env; run Supabase updates without SQL editor)
- Project layout: frontend, backend, database, docs, infra (Docker + scripts); helm and multi-DB support can extend infra

### Changed
- Renamed seed events to have "Demo_" prefix for clarity
- Consolidated documentation into README, ARCHITECTURE, and DATABASE
- Database: all schema and seed in `database/` (001_schema.sql, 002_seed.sql)
- Scripts: under `infra/scripts/` (db.py, docker-manage, setup-test-users, sanity-test)
- Optimized Docker setup for development and production
- Improved database schema isolation for portability
- Enhanced error handling in migrations
- Students table: `id` is now independent (not FK to auth.users), added `email` and `auth_user_id` fields
- Children under 14: No longer require auth accounts, use parent's email by default
- Event registration: Parents can register their children for events
- Admin users: Cannot register for events, dedicated admin dashboard
- Navigation: Role-based navigation menus (admin, parent, student)

### Fixed
- Event registration visibility: admins and event owners can view paginated registrations per event
- Duplicate event/seed data cleanup via fix_db_data.py
- Migration constraint conflicts (idempotent migrations)
- Database schema references to use isolated auth schema
- Docker Compose service dependencies
- Email confirmation issues: Added `ENABLE_EMAIL_CONFIRMATION` flag for development
- Admin role assignment: Fixed admin user role persistence
- Parent role assignment: Fixed parent user role persistence
- Event registration: Added unique constraint to prevent duplicate registrations
- Profile loading: Auto-create profiles for admin and parent users if missing
- Dashboard routing: Correct routing for admin users to `/dashboard/admin`
- User management: Fixed email display in admin user management
- Child creation: Removed unnecessary auth account creation for children under 14
- UUID type handling: Fixed UUID to string conversion in child creation

## [1.0.0] - 2024-01-XX

### Added
- Initial release
- Core event management functionality
- User authentication and authorization
- Parent and student user types
- School and class management
- Event registration system
- Database migrations
- Docker containerization
- API documentation

---

## Version History

- **1.0.0**: Initial production release with core features
