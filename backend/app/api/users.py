from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from app.schemas import ParentCreate, StudentCreate, UserLogin, UserProfile, Event, EventRegistration, ProfileUpdate, ContactSubmission, ContactSubmissionResponse, ChildCreate, ChildUpdate, EventRegistrationRequest
from app.core.supabase import supabase
from app.core.database import execute_query_one, execute_query
from app.auth.dependencies import get_current_user

router = APIRouter()


def _validate_email_domain(email: str) -> None:
    """Raise HTTPException if ALLOWED_EMAIL_DOMAINS is set and email domain is not allowed."""
    from app.core.config import ALLOWED_EMAIL_DOMAINS
    if not ALLOWED_EMAIL_DOMAINS:
        return
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email format.")
    domain = email.split("@", 1)[1].strip().lower()
    if domain not in ALLOWED_EMAIL_DOMAINS:
        raise HTTPException(
            status_code=400,
            detail=f"Registration is only allowed for emails from: {', '.join(ALLOWED_EMAIL_DOMAINS)}",
        )


def _sync_auth_user_to_campus_circle_auth(auth_user_id: str, email: str) -> None:
    """Ensure auth user exists in campus_circle_auth.users (required for FK from campus_circle.users)."""
    execute_query(
        """INSERT INTO campus_circle_auth.users (id, email, email_confirmed_at)
           VALUES (%s, %s, NOW())
           ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, email_confirmed_at = EXCLUDED.email_confirmed_at""",
        (auth_user_id, email),
    )

@router.post("/register/parent", status_code=201)
async def register_parent(user_data: ParentCreate):
    try:
        _validate_email_domain(user_data.email)

        from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
        import requests

        admin_url = f"{SUPABASE_URL}/auth/v1/admin/users"
        headers = {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
            'Content-Type': 'application/json'
        }

        # Check if user already exists in Auth (list users and find by email)
        check_response = requests.get(admin_url, headers=headers, timeout=10)
        if check_response.status_code == 200:
            existing_users = check_response.json().get('users', [])
            email_lower = user_data.email.lower()
            match = next((u for u in existing_users if (u.get('email') or '').lower() == email_lower), None)
            if match:
                auth_user_id = match['id']
                existing_user = execute_query_one(
                    "SELECT id FROM campus_circle.users WHERE id = %s",
                    (auth_user_id,)
                )
                if existing_user:
                    raise HTTPException(status_code=400, detail="User already registered in Campus Circle")

                _sync_auth_user_to_campus_circle_auth(auth_user_id, user_data.email)
                execute_query(
                    "INSERT INTO campus_circle.users (id, role) VALUES (%s, %s) ON CONFLICT (id) DO UPDATE SET role = %s",
                    (auth_user_id, 'parent', 'parent')
                )
                execute_query(
                    "INSERT INTO campus_circle.parents (id, email, full_name, phone) VALUES (%s, %s, %s, %s) ON CONFLICT (id) DO UPDATE SET email = %s, full_name = %s, phone = %s",
                    (auth_user_id, user_data.email, user_data.full_name, user_data.phone or 'N/A', user_data.email, user_data.full_name, user_data.phone or 'N/A')
                )
                return {"message": "Account linked to Campus Circle successfully. You can now use Campus Circle with your existing account."}

        # Create new user via Admin API
        user_data_payload = {
            'email': user_data.email,
            'password': user_data.password,
            'email_confirm': True,
            'auto_confirm': True,
            'user_metadata': {
                'full_name': user_data.full_name,
                'role': 'parent'
            }
        }
        create_response = requests.post(admin_url, headers=headers, json=user_data_payload, timeout=10)
        if create_response.status_code not in [200, 201]:
            error_text = create_response.text[:200]
            raise HTTPException(status_code=400, detail=f"Failed to create user: {error_text}")

        auth_user = create_response.json()
        auth_user_id = auth_user['id']

        _sync_auth_user_to_campus_circle_auth(auth_user_id, user_data.email)
        execute_query(
            "INSERT INTO campus_circle.users (id, role) VALUES (%s, %s) ON CONFLICT (id) DO UPDATE SET role = %s",
            (auth_user_id, 'parent', 'parent')
        )
        execute_query(
            "INSERT INTO campus_circle.parents (id, email, full_name, phone) VALUES (%s, %s, %s, %s) ON CONFLICT (id) DO UPDATE SET email = %s, full_name = %s, phone = %s",
            (auth_user_id, user_data.email, user_data.full_name, user_data.phone or 'N/A', user_data.email, user_data.full_name, user_data.phone or 'N/A')
        )

        return {"message": "Parent registered successfully."}

    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error registering parent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)[:200]}")

@router.post("/login")
async def login(credentials: UserLogin):
    try:
        # Sign in with Supabase Auth - use anon key for user authentication
        from app.core.config import SUPABASE_URL, SUPABASE_ANON_KEY
        from supabase import create_client
        
        if not SUPABASE_ANON_KEY:
            raise HTTPException(status_code=500, detail="Supabase configuration error: ANON_KEY not set")
        
        # Create a client with anon key for user login (service role key doesn't work for sign_in)
        auth_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        auth_response = None
        login_error = None
        try:
            auth_response = auth_client.auth.sign_in_with_password({
                "email": credentials.email,
                "password": credentials.password
            })
        except Exception as e:
            login_error = str(e)
            # Log the actual error for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Supabase login error: {login_error}")
            
            # Check if it's an email confirmation issue
            error_msg = login_error.lower()
            if "email not confirmed" in error_msg or "not confirmed" in error_msg:
                from app.core.config import ENABLE_EMAIL_CONFIRMATION
                
                if not ENABLE_EMAIL_CONFIRMATION:
                    # Email confirmation is disabled in config, but Supabase still requires it
                    # Use Admin API to confirm email automatically
                    try:
                        import requests
                        from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
                        
                        admin_url = f"{SUPABASE_URL}/auth/v1/admin/users"
                        headers = {
                            'apikey': SUPABASE_SERVICE_ROLE_KEY,
                            'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
                            'Content-Type': 'application/json'
                        }
                        
                        # Get user via Admin API
                        response = requests.get(f"{admin_url}?email={credentials.email}", headers=headers)
                        if response.status_code == 200:
                            users = response.json().get('users', [])
                            if users:
                                user_id = users[0]['id']
                                
                                # Confirm email via Admin API
                                update_response = requests.put(
                                    f"{admin_url}/{user_id}",
                                    headers=headers,
                                    json={'email_confirm': True}
                                )
                                
                                if update_response.status_code == 200:
                                    # Retry login after confirming email
                                    import time
                                    time.sleep(1)
                                    try:
                                        auth_response = auth_client.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })
                                    except Exception as retry_error:
                                        raise HTTPException(status_code=401, detail="Invalid email or password")
                                else:
                                    raise HTTPException(status_code=401, detail="Could not confirm email. Please disable email confirmation in Supabase Dashboard.")
                            else:
                                raise HTTPException(status_code=401, detail="User not found")
                        else:
                            raise HTTPException(status_code=401, detail="Invalid login credentials")
                    except HTTPException:
                        raise
                    except Exception as confirm_error:
                        logger.error(f"Email confirmation error: {str(confirm_error)}")
                        raise HTTPException(
                            status_code=401,
                            detail="Email confirmation required. Please run './infra/scripts/setup-test-users.sh --disable-email-confirmation' for instructions, or check your email to confirm your account."
                        )
                else:
                    # Email confirmation is enabled - user must confirm email
                    raise HTTPException(
                        status_code=401,
                        detail="Email confirmation required. Please check your email to confirm your account."
                    )
            else:
                # Return more specific error message
                if "invalid" in error_msg or "wrong" in error_msg or "incorrect" in error_msg:
                    raise HTTPException(status_code=401, detail="Invalid email or password")
                elif "not found" in error_msg or "does not exist" in error_msg:
                    raise HTTPException(status_code=401, detail="User not found")
                else:
                    raise HTTPException(status_code=401, detail=f"Login failed: {login_error[:100]}")

        if not auth_response or not auth_response.session:
            raise HTTPException(status_code=401, detail="Invalid login credentials")

        # Check if user exists in campus_circle schema using direct PostgreSQL query
        user_check = execute_query_one(
            "SELECT * FROM campus_circle.users WHERE id = %s",
            (auth_response.user.id,)
        )
        
        if not user_check:
            # User authenticated but not registered in Campus Circle - auto-link for development
            # In production, you might want to require explicit registration
            try:
                # The foreign key in campus_circle.users points to auth.users (local database)
                # First, ensure user exists in local auth.users (for FK constraint)
                try:
                    execute_query(
                        "INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at) VALUES (%s, %s, NOW(), NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET email_confirmed_at = NOW()",
                        (auth_response.user.id, credentials.email)
                    )
                except Exception:
                    # If auth.users doesn't exist, try campus_circle_auth.users
                    try:
                        execute_query(
                            "INSERT INTO campus_circle_auth.users (id, email, email_confirmed_at) VALUES (%s, %s, NOW()) ON CONFLICT (id) DO UPDATE SET email_confirmed_at = NOW()",
                            (auth_response.user.id, credentials.email)
                        )
                    except Exception:
                        pass  # May not exist, continue anyway
                
                # Try to auto-link by checking if user has a role in metadata or create a default
                user_metadata = getattr(auth_response.user, 'user_metadata', {}) or {}
                # Check if user already has a role in database first
                existing_role_row = execute_query_one(
                    "SELECT role FROM campus_circle.users WHERE id = %s",
                    (auth_response.user.id,)
                )
                if existing_role_row:
                    role = existing_role_row['role']  # Preserve existing role
                else:
                    role = user_metadata.get('role', 'student')  # Default to student if no metadata
                
                # Insert into campus_circle.users (FK points to auth.users)
                # Use ON CONFLICT DO UPDATE to update role if user already exists
                # Check if user already has a role - if so, preserve it unless metadata says otherwise
                existing_role_row = execute_query_one(
                    "SELECT role FROM campus_circle.users WHERE id = %s",
                    (auth_response.user.id,)
                )
                if existing_role_row and existing_role_row.get('role'):
                    # User already has a role in database - preserve it
                    role = existing_role_row['role']
                    execute_query(
                        "INSERT INTO campus_circle.users (id, role) VALUES (%s, %s) ON CONFLICT (id) DO UPDATE SET role = campus_circle.users.role",
                        (auth_response.user.id, role)
                    )
                else:
                    # New user or no role - use metadata or default
                    execute_query(
                        "INSERT INTO campus_circle.users (id, role) VALUES (%s, %s) ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role",
                        (auth_response.user.id, role)
                    )
                
                # If role is parent, try to add to parents table
                if role == 'parent':
                    execute_query(
                        """INSERT INTO campus_circle.parents (id, email, full_name, phone) 
                           VALUES (%s, %s, %s, %s) ON CONFLICT (id) DO NOTHING""",
                        (auth_response.user.id, credentials.email, user_metadata.get('full_name', 'User'), '')
                    )
                elif role == 'student':
                    execute_query(
                        """INSERT INTO campus_circle.students (id, full_name, status) 
                           VALUES (%s, %s, 'active') ON CONFLICT (id) DO NOTHING""",
                        (auth_response.user.id, user_metadata.get('full_name', 'User'))
                    )
                
                # Re-check
                user_check = execute_query_one(
                    "SELECT * FROM campus_circle.users WHERE id = %s",
                    (auth_response.user.id,)
                )
                print(f"Auto-linked user {credentials.email} to campus_circle schema with role {role}.")
            except Exception as link_error:
                # Log the error for debugging
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Auto-linking error: {str(link_error)}")
                print(f"Auto-linking failed: {str(link_error)}")
                # Continue to error below
        
        if not user_check:
            # User authenticated but not registered in Campus Circle
            raise HTTPException(
                status_code=403, 
                detail="Please register for Campus Circle first. Your account exists but is not linked to this application."
            )

        return {
            "access_token": auth_response.session.access_token,
            "token_type": "bearer"
        }
    except HTTPException:
        raise
    except Exception as e:
        # Provide more specific error messages
        error_msg = str(e)
        # Log the actual error for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Login error: {error_msg}")
        
        if "email not confirmed" in error_msg.lower() or "not confirmed" in error_msg.lower():
            from app.core.config import ENABLE_EMAIL_CONFIRMATION
            if not ENABLE_EMAIL_CONFIRMATION:
                raise HTTPException(
                    status_code=401,
                    detail="Email confirmation required. Run ./infra/scripts/setup-test-users.sh --disable-email-confirmation for instructions."
                )
            else:
                raise HTTPException(status_code=401, detail="Email not confirmed. Please check your email or contact support.")
        elif "Invalid login credentials" in error_msg or "Invalid" in error_msg or "invalid" in error_msg.lower():
            raise HTTPException(status_code=401, detail="Invalid login credentials")
        raise HTTPException(status_code=500, detail=f"Login error: {error_msg[:200]}")

@router.post("/register/student", status_code=201)
async def register_student(user_data: StudentCreate):
    try:
        if not user_data.password:
            raise HTTPException(status_code=400, detail="Password is required for students 14 and older")
        _validate_email_domain(user_data.email)

        from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
        import requests

        admin_url = f"{SUPABASE_URL}/auth/v1/admin/users"
        headers = {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
            'Content-Type': 'application/json'
        }

        check_response = requests.get(admin_url, headers=headers, timeout=10)
        if check_response.status_code == 200:
            existing_users = check_response.json().get('users', [])
            email_lower = user_data.email.lower()
            match = next((u for u in existing_users if (u.get('email') or '').lower() == email_lower), None)
            if match:
                auth_user_id = match['id']
                existing_user = execute_query_one(
                    "SELECT id FROM campus_circle.users WHERE id = %s",
                    (auth_user_id,)
                )
                if existing_user:
                    raise HTTPException(status_code=400, detail="User already registered in Campus Circle")

                _sync_auth_user_to_campus_circle_auth(auth_user_id, user_data.email)
                execute_query(
                    "INSERT INTO campus_circle.users (id, role) VALUES (%s, %s) ON CONFLICT (id) DO UPDATE SET role = %s",
                    (auth_user_id, 'student', 'student')
                )
                execute_query(
                    "INSERT INTO campus_circle.students (id, auth_user_id, full_name, dob, status) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (id) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id, full_name = EXCLUDED.full_name, dob = EXCLUDED.dob, status = EXCLUDED.status",
                    (auth_user_id, auth_user_id, user_data.full_name, user_data.dob.isoformat() if user_data.dob else None, 'active')
                )
                if user_data.parent_id:
                    execute_query(
                        "INSERT INTO campus_circle.parent_students (parent_id, student_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                        (user_data.parent_id, auth_user_id)
                    )
                return {"message": "Account linked to Campus Circle successfully. You can now use Campus Circle with your existing account."}

        user_data_payload = {
            'email': user_data.email,
            'password': user_data.password,
            'email_confirm': True,
            'auto_confirm': True,
            'user_metadata': {
                'full_name': user_data.full_name,
                'role': 'student'
            }
        }
        create_response = requests.post(admin_url, headers=headers, json=user_data_payload, timeout=10)
        if create_response.status_code not in [200, 201]:
            error_text = create_response.text[:200]
            raise HTTPException(status_code=400, detail=f"Failed to create user: {error_text}")

        auth_user = create_response.json()
        auth_user_id = auth_user['id']

        _sync_auth_user_to_campus_circle_auth(auth_user_id, user_data.email)
        execute_query(
            "INSERT INTO campus_circle.users (id, role) VALUES (%s, %s) ON CONFLICT (id) DO UPDATE SET role = %s",
            (auth_user_id, 'student', 'student')
        )
        execute_query(
            "INSERT INTO campus_circle.students (id, auth_user_id, full_name, dob, status) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (id) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id, full_name = EXCLUDED.full_name, dob = EXCLUDED.dob, status = EXCLUDED.status",
            (auth_user_id, auth_user_id, user_data.full_name, user_data.dob.isoformat() if user_data.dob else None, 'active')
        )
        if user_data.parent_id:
            execute_query(
                "INSERT INTO campus_circle.parent_students (parent_id, student_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (user_data.parent_id, auth_user_id)
            )

        return {"message": "Student registered successfully."}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/me", response_model=UserProfile)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    # Get user ID from JWT token (sub is the standard claim for user ID)
    user_id = current_user.get("sub") or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    
    try:
        # First, get the user's role from the campus_circle.users table using direct PostgreSQL query
        user_row = execute_query_one(
            "SELECT role FROM campus_circle.users WHERE id = %s",
            (user_id,)
        )
        if not user_row:
            raise HTTPException(status_code=404, detail="User not found in campus_circle schema")

        role = user_row['role']

        # Now, fetch the profile from the appropriate table using direct PostgreSQL query
        if role == 'parent':
            profile_row = execute_query_one(
                "SELECT * FROM campus_circle.parents WHERE id = %s",
                (user_id,)
            )
            # If not found in parents, create a basic profile entry
            if not profile_row:
                # Get email from auth or current_user
                parent_email = current_user.get('email') or ''
                execute_query(
                    "INSERT INTO campus_circle.parents (id, email, full_name, phone) VALUES (%s, %s, %s, 'N/A') ON CONFLICT (id) DO NOTHING",
                    (user_id, parent_email, 'Parent User')
                )
                # Fetch again
                profile_row = execute_query_one(
                    "SELECT * FROM campus_circle.parents WHERE id = %s",
                    (user_id,)
                )
        elif role == 'student':
            profile_row = execute_query_one(
                "SELECT * FROM campus_circle.students WHERE id = %s",
                (user_id,)
            )
        elif role == 'admin':
            # Admin users are stored in parents table for profile purposes
            profile_row = execute_query_one(
                "SELECT * FROM campus_circle.parents WHERE id = %s",
                (user_id,)
            )
            # If not found in parents, create a basic profile entry
            if not profile_row:
                # Get email from auth or current_user
                admin_email = current_user.get('email') or ''
                execute_query(
                    "INSERT INTO campus_circle.parents (id, email, full_name, phone) VALUES (%s, %s, %s, 'N/A') ON CONFLICT (id) DO NOTHING",
                    (user_id, admin_email, 'Admin User')
                )
                # Fetch again
                profile_row = execute_query_one(
                    "SELECT * FROM campus_circle.parents WHERE id = %s",
                    (user_id,)
                )
        else:
            raise HTTPException(status_code=400, detail="Invalid user role")

        if not profile_row:
            raise HTTPException(status_code=404, detail="Profile not found")

        # Add email and role to the response
        profile_dict = dict(profile_row)
        profile_dict['role'] = role
        # Get email from JWT token (current_user) or from profile table
        profile_dict['email'] = current_user.get('email') or profile_dict.get('email') or ''
        
        return profile_dict
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching profile: {str(e)[:100]}")

@router.put("/me", response_model=UserProfile)
async def update_my_profile(profile_update: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Update the current user's profile"""
    user_id = current_user.get("sub") or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")

    try:
        # Get user's role
        user_row = execute_query_one(
            "SELECT role FROM campus_circle.users WHERE id = %s",
            (user_id,)
        )
        if not user_row:
            raise HTTPException(status_code=404, detail="User not found in campus_circle schema")

        role = user_row['role']
        
        # Build update fields based on role
        update_fields = {}
        if profile_update.full_name:
            update_fields['full_name'] = profile_update.full_name
        if role == 'parent' and profile_update.phone:
            update_fields['phone'] = profile_update.phone
        if role == 'student' and profile_update.dob:
            update_fields['dob'] = profile_update.dob.isoformat() if hasattr(profile_update.dob, 'isoformat') else profile_update.dob

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields provided for update")

        # Update the appropriate table
        set_clauses = [f"{key} = %s" for key in update_fields.keys()]
        set_values = list(update_fields.values())
        set_values.append(user_id)  # Add user_id for WHERE clause

        if role == 'parent' or role == 'admin':
            execute_query(
                f"UPDATE campus_circle.parents SET {', '.join(set_clauses)}, updated_at = NOW() WHERE id = %s",
                tuple(set_values)
            )
        elif role == 'student':
            execute_query(
                f"UPDATE campus_circle.students SET {', '.join(set_clauses)}, updated_at = NOW() WHERE id = %s",
                tuple(set_values)
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid user role for profile update")

        # Return updated profile
        return await get_my_profile(current_user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating profile: {str(e)[:100]}")

@router.get("/me/events", response_model=list[Event])
async def get_my_events(current_user: dict = Depends(get_current_user)):
    # Get user ID from JWT token
    user_id = current_user.get("sub") or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    
    try:
        # Get user's role using direct PostgreSQL query
        user_row = execute_query_one(
            "SELECT role FROM campus_circle.users WHERE id = %s",
            (user_id,)
        )
        if not user_row:
            return []

        role = user_row['role']
        
        # For students, use student_id; for parents, we need to get their children's student_ids
        if role == 'student':
            registrations = execute_query(
                "SELECT event_id FROM campus_circle.event_registrations WHERE student_id = %s",
                (user_id,)
            )
        else:
            # For parents, get their children's student_ids first
            children = execute_query(
                "SELECT student_id FROM campus_circle.parent_students WHERE parent_id = %s",
                (user_id,)
            )
            if not children:
                return []
            student_ids = [child['student_id'] for child in children]
            # Fetch registrations for all children
            placeholders = ','.join(['%s'] * len(student_ids))
            registrations = execute_query(
                f"SELECT event_id FROM campus_circle.event_registrations WHERE student_id IN ({placeholders})",
                tuple(student_ids)
            )
        
        if not registrations:
            return []

        event_ids = [reg['event_id'] for reg in registrations]
        
        # Fetch the actual events using direct PostgreSQL query
        placeholders = ','.join(['%s'] * len(event_ids))
        events = execute_query(
            f"""SELECT id, school_id, title, description, 
                TO_CHAR(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS start_time,
                TO_CHAR(end_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS end_time,
                location, is_published
                FROM campus_circle.events 
                WHERE id IN ({placeholders}) AND is_published = TRUE
                ORDER BY start_time""",
            tuple(event_ids)
        )
        
        return [dict(event) for event in events] if events else []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching events: {str(e)[:100]}")

@router.post("/events/{event_id}/register", status_code=201, response_model=EventRegistration)
async def register_for_event(
    event_id: str, 
    registration_data: Optional[EventRegistrationRequest] = None,
    current_user: dict = Depends(get_current_user)
):
    # Get user ID from JWT token
    user_id = current_user.get("sub") or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    
    try:
        # Check if the event exists using direct PostgreSQL query
        event_row = execute_query_one(
            "SELECT id FROM campus_circle.events WHERE id = %s AND is_published = TRUE",
            (event_id,)
        )
        if not event_row:
            raise HTTPException(status_code=404, detail="Event not found")

        # Get user role using direct PostgreSQL query
        user_row = execute_query_one(
            "SELECT role FROM campus_circle.users WHERE id = %s",
            (user_id,)
        )
        if not user_row:
            raise HTTPException(status_code=404, detail="User not found")
        
        role = user_row['role']
        
        # Prevent admin from registering for events
        if role == 'admin':
            raise HTTPException(status_code=403, detail="Admins cannot register for events. Use the admin dashboard to manage events.")
        
        # Determine which student to register
        student_id_to_register = None
        
        if role == 'student':
            # Students register themselves
            student_id_to_register = user_id
        elif role == 'parent':
            # Parents must provide a student_id
            if not registration_data:
                raise HTTPException(
                    status_code=400, 
                    detail="Please select a child to register for this event"
                )
            if not registration_data.student_id:
                raise HTTPException(
                    status_code=400, 
                    detail="Please select a child to register for this event"
                )
            student_id_to_register = registration_data.student_id
            
            # Verify the student belongs to this parent
            parent_student = execute_query_one(
                "SELECT * FROM campus_circle.parent_students WHERE parent_id = %s AND student_id = %s",
                (user_id, student_id_to_register)
            )
            if not parent_student:
                raise HTTPException(
                    status_code=403, 
                    detail="You can only register your own children for events"
                )
        else:
            raise HTTPException(status_code=403, detail="Invalid user role for event registration")
        
        # Verify the student exists
        student = execute_query_one(
            "SELECT id FROM campus_circle.students WHERE id = %s",
            (student_id_to_register,)
        )
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Check if already registered
        existing_registration = execute_query_one(
            "SELECT * FROM campus_circle.event_registrations WHERE student_id = %s AND event_id = %s",
            (student_id_to_register, event_id)
        )
        if existing_registration:
            raise HTTPException(status_code=400, detail="This child is already registered for this event")
        
        # Register the student for the event
        execute_query(
            "INSERT INTO campus_circle.event_registrations (student_id, event_id) VALUES (%s, %s) ON CONFLICT (student_id, event_id) DO NOTHING",
            (student_id_to_register, event_id)
        )
        
        # Return the registration
        return {
            "user_id": str(student_id_to_register),
            "event_id": event_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error registering for event: {str(e)[:100]}")

@router.post("/me/children", status_code=201)
async def add_child(child_data: ChildCreate, current_user: dict = Depends(get_current_user)):
    """Add a child under 14 (no login account needed) for the current parent."""
    user_id = current_user.get("sub") or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    
    try:
        # Check if user is a parent
        user_row = execute_query_one(
            "SELECT role FROM campus_circle.users WHERE id = %s",
            (user_id,)
        )
        if not user_row or user_row['role'] != 'parent':
            raise HTTPException(status_code=403, detail="Only parents can add children")
        
        # Calculate age
        from datetime import date
        today = date.today()
        age = today.year - child_data.dob.year - ((today.month, today.day) < (child_data.dob.month, child_data.dob.day))
        
        if age >= 14:
            raise HTTPException(
                status_code=400, 
                detail="Children 14 and older must create their own student account"
            )
        
        # Get parent's email to use as default for child
        parent_email_row = execute_query_one(
            """
            SELECT COALESCE(au.email, p.email) as email
            FROM campus_circle.parents p
            LEFT JOIN campus_circle_auth.users au ON p.id = au.id
            WHERE p.id = %s
            """,
            (user_id,)
        )
        if not parent_email_row:
            raise HTTPException(status_code=404, detail="Parent email not found")
        
        parent_email_str = parent_email_row.get('email')
        if not parent_email_str:
            raise HTTPException(status_code=400, detail="Parent email is required")
        
        # Use provided email or default to parent's email
        child_email = child_data.email if child_data.email else parent_email_str
        
        # Generate a unique student ID (not tied to auth account)
        import uuid
        student_id = str(uuid.uuid4())
        
        # Insert student record WITHOUT auth account (children under 14 don't need auth)
        execute_query(
            """
            INSERT INTO campus_circle.students (id, email, full_name, dob, status, school_id, class_id, auth_user_id) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, NULL) 
            ON CONFLICT (id) DO UPDATE SET 
                full_name = EXCLUDED.full_name, 
                dob = EXCLUDED.dob, 
                status = EXCLUDED.status,
                school_id = EXCLUDED.school_id,
                class_id = EXCLUDED.class_id
            """,
            (
                student_id,
                child_email,
                child_data.full_name, 
                child_data.dob.isoformat() if child_data.dob else None, 
                'active',
                child_data.school_id if child_data.school_id else None,
                child_data.class_id if child_data.class_id else None
            )
        )
        
        # Link child to parent
        execute_query(
            "INSERT INTO campus_circle.parent_students (parent_id, student_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (user_id, student_id)
        )
        
        # Return the created child
        child = execute_query_one(
            """
            SELECT s.id, s.full_name, s.dob, s.status, s.school_id, s.class_id, s.email, s.auth_user_id
            FROM campus_circle.students s
            WHERE s.id = %s
            """,
            (student_id,)
        )
        
        return dict(child) if child else {"id": str(student_id), "full_name": child_data.full_name, "email": child_email}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding child: {str(e)[:100]}")

@router.get("/me/children")
async def get_my_children(current_user: dict = Depends(get_current_user)):
    """Get all children linked to the current parent user."""
    user_id = current_user.get("sub") or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    
    try:
        # Check if user is a parent
        user_row = execute_query_one(
            "SELECT role FROM campus_circle.users WHERE id = %s",
            (user_id,)
        )
        if not user_row or user_row['role'] != 'parent':
            raise HTTPException(status_code=403, detail="Only parents can view their children")
        
        # Get all children linked to this parent
        children = execute_query(
            """
            SELECT s.id, s.full_name, s.dob, s.status, s.school_id, s.class_id,
                   u.email
            FROM campus_circle.parent_students ps
            JOIN campus_circle.students s ON ps.student_id = s.id
            LEFT JOIN campus_circle_auth.users u ON s.id = u.id
            WHERE ps.parent_id = %s
            ORDER BY s.full_name
            """,
            (user_id,)
        )
        
        return [dict(child) for child in children] if children else []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching children: {str(e)[:100]}")

@router.put("/me/children/{child_id}")
async def update_child(child_id: str, child_data: ChildUpdate, current_user: dict = Depends(get_current_user)):
    """Update a child's information (email, name, etc.) - parent only."""
    user_id = current_user.get("sub") or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    
    try:
        # Check if user is a parent
        user_row = execute_query_one(
            "SELECT role FROM campus_circle.users WHERE id = %s",
            (user_id,)
        )
        if not user_row or user_row['role'] != 'parent':
            raise HTTPException(status_code=403, detail="Only parents can update children")
        
        # Verify the child belongs to this parent
        parent_student = execute_query_one(
            "SELECT * FROM campus_circle.parent_students WHERE parent_id = %s AND student_id = %s",
            (user_id, child_id)
        )
        if not parent_student:
            raise HTTPException(
                status_code=403, 
                detail="You can only update your own children"
            )
        
        # Build update query dynamically based on provided fields
        update_fields = []
        update_values = []
        
        if child_data.full_name is not None:
            update_fields.append("full_name = %s")
            update_values.append(child_data.full_name)
        
        if child_data.email is not None:
            update_fields.append("email = %s")
            update_values.append(child_data.email)
        
        if child_data.dob is not None:
            update_fields.append("dob = %s")
            update_values.append(child_data.dob.isoformat())
        
        if child_data.school_id is not None:
            update_fields.append("school_id = %s")
            update_values.append(child_data.school_id if child_data.school_id else None)
        
        if child_data.class_id is not None:
            update_fields.append("class_id = %s")
            update_values.append(child_data.class_id if child_data.class_id else None)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        update_fields.append("updated_at = NOW()")
        update_values.append(child_id)
        
        query = f"""
            UPDATE campus_circle.students 
            SET {', '.join(update_fields)}
            WHERE id = %s
        """
        
        execute_query(query, tuple(update_values))
        
        # Return updated child
        child = execute_query_one(
            """
            SELECT s.id, s.full_name, s.dob, s.status, s.school_id, s.class_id, s.email, s.auth_user_id
            FROM campus_circle.students s
            WHERE s.id = %s
            """,
            (child_id,)
        )
        
        if not child:
            raise HTTPException(status_code=404, detail="Child not found")
        
        return dict(child)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating child: {str(e)[:100]}")

@router.get("/me/parent")
async def get_my_parent(current_user: dict = Depends(get_current_user)):
    """Get the parent linked to the current student user."""
    user_id = current_user.get("sub") or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    
    try:
        # Check if user is a student
        user_row = execute_query_one(
            "SELECT role FROM campus_circle.users WHERE id = %s",
            (user_id,)
        )
        if not user_row or user_row['role'] != 'student':
            raise HTTPException(status_code=403, detail="Only students can view their parent")
        
        # Get parent linked to this student
        parent = execute_query_one(
            """
            SELECT p.id, p.full_name, p.phone, u.email
            FROM campus_circle.parent_students ps
            JOIN campus_circle.parents p ON ps.parent_id = p.id
            LEFT JOIN campus_circle_auth.users u ON p.id = u.id
            WHERE ps.student_id = %s
            LIMIT 1
            """,
            (user_id,)
        )
        
        if not parent:
            return None
        
        return dict(parent)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching parent: {str(e)[:100]}")


@router.post("/contact", status_code=201)
async def submit_contact_form(
    submission: ContactSubmission,
    current_user: dict = Depends(get_current_user)
):
    """Submit a contact form (feedback, complaint, suggestion, etc.)"""
    user_id = current_user.get("sub") or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")

    try:
        # Insert submission
        result = execute_query_one(
            """
            INSERT INTO campus_circle.contact_submissions
            (user_id, submission_type, subject, message, related_event_id, related_organizer_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                user_id,
                submission.submission_type,
                submission.subject,
                submission.message,
                submission.related_event_id,
                submission.related_organizer_id
            )
        )

        if not result:
            raise HTTPException(status_code=500, detail="Failed to submit contact form")

        return {"message": "Submission received successfully", "id": str(result['id'])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error submitting form: {str(e)[:100]}")
