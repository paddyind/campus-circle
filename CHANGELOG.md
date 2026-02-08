# Changelog

All notable changes to the CampusCircle project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Admin: Contact Submissions management with status tracking
- Admin: View registered members for events with pagination
- API: Endpoint for paginated event registrations (`GET /api/events/{id}/registrations`)
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

### Changed
- Renamed seed events to have "Demo_" prefix for clarity
- Consolidated documentation into README, ARCHITECTURE, and DATABASE
- Optimized Docker setup for development and production
- Improved database schema isolation for portability
- Enhanced error handling in migrations
- Students table: `id` is now independent (not FK to auth.users), added `email` and `auth_user_id` fields
- Children under 14: No longer require auth accounts, use parent's email by default
- Event registration: Parents can register their children for events
- Admin users: Cannot register for events, dedicated admin dashboard
- Navigation: Role-based navigation menus (admin, parent, student)

### Fixed
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
