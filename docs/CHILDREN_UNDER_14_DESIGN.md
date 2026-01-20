# Children Under 14 - Long-term Design Solution

## Overview

This document describes the long-term architectural solution for handling children under 14 in CampusCircle. This design eliminates the need for unique email generation and auth account creation for children, providing a cleaner and more maintainable solution.

## Problem Statement

Previously, the system attempted to create auth accounts for children under 14, which led to:
- Complex email generation logic (parent.child.timestamp.random@campuscircle.local)
- Email conflicts when adding multiple children
- Unnecessary auth account creation for children who don't need login access
- Confusion about email validation when no email field was visible to users

## Solution

### Design Principles

1. **No Auth Accounts for Children Under 14**: Children under 14 don't need login accounts, so we don't create them.
2. **Parent Email by Default**: Children use their parent's email by default, which can be updated later.
3. **Future Account Creation**: When children turn 14+, they can create their own account using their email.
4. **No Email Conflicts**: No need to generate unique emails - use parent's email or allow parent to set a custom email.

### Database Schema Changes

#### Migration: `009_update_students_for_children_under_14.sql`

**Key Changes**:
1. **`campus_circle.students.id`**: Made independent (no longer FK to `auth.users`)
   - Allows children to exist without auth accounts
   - Primary key is now a simple UUID

2. **`campus_circle.students.email`**: Added email field
   - Optional field (can be NULL)
   - Defaults to parent's email when creating child
   - Can be updated by parent later

3. **`campus_circle.students.auth_user_id`**: Added nullable FK to `auth.users`
   - NULL for children under 14 (no auth account)
   - Set when child creates account at 14+

**Schema Structure**:
```sql
CREATE TABLE campus_circle.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- Independent, not FK
  auth_user_id UUID REFERENCES campus_circle_auth.users(id) ON DELETE SET NULL,  -- Nullable
  email TEXT,  -- Optional, defaults to parent email
  school_id UUID REFERENCES campus_circle.schools(id),
  class_id UUID REFERENCES campus_circle.classes(id),
  full_name TEXT NOT NULL,
  dob DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### API Changes

#### `POST /api/users/me/children`

**Before**: Created auth account with generated email
**After**: Creates student record directly without auth account

**Request Body**:
```json
{
  "full_name": "John Doe",
  "dob": "2015-01-15",
  "email": "optional@example.com"  // Optional, defaults to parent's email
}
```

**Response**:
```json
{
  "id": "uuid",
  "full_name": "John Doe",
  "dob": "2015-01-15",
  "email": "parent@example.com",
  "auth_user_id": null,
  "status": "active"
}
```

#### `PUT /api/users/me/children/{child_id}`

**New Endpoint**: Allows parents to update child information, including email

**Request Body**:
```json
{
  "full_name": "John Doe Updated",
  "email": "john@example.com",  // Can update email
  "dob": "2015-01-15"
}
```

#### `GET /api/users/me/children`

**Updated**: Returns children with email and auth_user_id information

**Response**:
```json
[
  {
    "id": "uuid",
    "full_name": "John Doe",
    "email": "parent@example.com",
    "auth_user_id": null,
    "dob": "2015-01-15",
    "status": "active"
  }
]
```

### Frontend Changes

#### `AddChildModal.js`

**Changes**:
- Added optional email field
- Defaults to parent's email
- Shows helpful text: "Defaults to: parent@example.com"
- Parent can override with custom email

#### `ChildSelectionModal.js`

**Changes**:
- Added optional email field when adding new child
- Same behavior as AddChildModal

### Workflow

#### Adding a Child (Under 14)

1. Parent clicks "Add Child" button
2. Modal opens with form fields:
   - Full Name (required)
   - Email (optional, pre-filled with parent's email)
   - Date of Birth (required, must be under 14)
3. Parent can:
   - Keep default email (parent's email)
   - Change to custom email
4. On submit:
   - Student record created in `campus_circle.students`
   - No auth account created
   - `auth_user_id` is NULL
   - Email is set to provided value or parent's email

#### Updating Child Email

1. Parent can update child's email via `PUT /api/users/me/children/{child_id}`
2. This allows parent to set a unique email for the child
3. When child turns 14+, they can use this email to create their own account

#### Child Turns 14+ (Future Feature)

1. Child attempts to register with their email
2. System checks if email exists in `campus_circle.students` with `auth_user_id = NULL`
3. If found, create auth account and link via `auth_user_id`
4. Child can now log in with their email

## Benefits

1. **Simplified Onboarding**: No complex email generation logic
2. **No Email Conflicts**: Uses parent's email or custom email set by parent
3. **Better UX**: Clear email field in UI, defaults to parent's email
4. **Future-Proof**: Easy transition to auth account when child turns 14+
5. **Cleaner Code**: No retry logic for email conflicts
6. **Better Data Model**: Clear separation between students with/without auth accounts

## Migration Path

1. Run migration `009_update_students_for_children_under_14.sql`
2. Existing students with auth accounts will have:
   - `auth_user_id` set to their current `id`
   - `email` populated from auth.users or parent email
3. New children under 14 will be created without auth accounts

## Testing

### Test Cases

1. **Add Child with Default Email**:
   - Add child without specifying email
   - Verify email defaults to parent's email
   - Verify no auth account created

2. **Add Child with Custom Email**:
   - Add child with custom email
   - Verify email is set correctly
   - Verify no auth account created

3. **Update Child Email**:
   - Update child's email via API
   - Verify email is updated
   - Verify no auth account created

4. **List Children**:
   - Verify all children are returned with email and auth_user_id

5. **Event Registration**:
   - Register child for event
   - Verify registration works with child without auth account

## Future Enhancements

1. **Age-Based Account Creation**: Automatically prompt child to create account when they turn 14
2. **Email Validation**: Validate email format when parent updates child's email
3. **Email Uniqueness**: Check if email is already in use when updating
4. **Account Linking**: When child creates account, automatically link to existing student record

## Related Files

- **Migration**: `migrations/009_update_students_for_children_under_14.sql`
- **API**: `backend/app/api/users.py` (add_child, update_child, get_my_children)
- **Schemas**: `backend/app/schemas.py` (ChildCreate, ChildUpdate)
- **Frontend**: 
  - `frontend/src/features/profile/components/AddChildModal.js`
  - `frontend/src/features/events/components/ChildSelectionModal.js`
- **Documentation**: `docs/DATABASE.md`
