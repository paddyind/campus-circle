from fastapi import APIRouter, HTTPException, Depends
from app.schemas import ParentCreate, StudentCreate, UserLogin, UserProfile, Event, EventRegistration
from app.core.supabase import supabase
from app.auth.dependencies import get_current_user

router = APIRouter()

@router.post("/register/parent", status_code=201)
async def register_parent(user_data: ParentCreate):
    try:
        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password
        })

        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Could not create user in Supabase Auth")

        auth_user = auth_response.user

        # Insert into our public `users` and `parents` table
        # Note: This should ideally be a transaction
        supabase.table("users").insert({"id": auth_user.id, "role": "parent"}).execute()
        supabase.table("parents").insert({
            "id": auth_user.id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "phone": user_data.phone
        }).execute()

        return {"message": "Parent registered successfully. Please check your email to verify."}

    except Exception as e:
        # This is a generic error handler. In a real app, you would have more specific error handling.
        # For instance, check if the email is already in use.
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
async def login(credentials: UserLogin):
    try:
        # Sign in with Supabase Auth
        auth_response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })

        if not auth_response.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return {
            "access_token": auth_response.session.access_token,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Placeholder for student registration - more complex due to age check and parent linking
@router.post("/register/student", status_code=201)
async def register_student(user_data: StudentCreate):
    # This endpoint will require more logic for age verification and parent linking.
    # For now, it's a placeholder.
    return {"message": "Student registration endpoint is a work in progress."}

@router.get("/me", response_model=UserProfile)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    user_id = current_user['id']
    try:
        # First, get the user's role from the 'users' table
        user_role_response = supabase.table("users").select("role").eq("id", user_id).execute()
        if not user_role_response.data:
            raise HTTPException(status_code=404, detail="User not found")

        role = user_role_response.data[0]['role']

        # Now, fetch the profile from the appropriate table
        if role == 'parent':
            profile_response = supabase.table("parents").select("*").eq("id", user_id).execute()
        elif role == 'student':
            profile_response = supabase.table("students").select("*").eq("id", user_id).execute()
        else:
            raise HTTPException(status_code=400, detail="Invalid user role")

        if not profile_response.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        return profile_response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/me/events", response_model=list[Event])
async def get_my_events(current_user: dict = Depends(get_current_user)):
    user_id = current_user['id']
    try:
        # Fetch event registrations for the user
        registrations_response = supabase.table("event_registrations").select("event_id").eq("user_id", user_id).execute()
        if not registrations_response.data:
            return []

        event_ids = [reg['event_id'] for reg in registrations_response.data]

        # Fetch the details of the registered events
        events_response = supabase.table("events").select("*").in_("id", event_ids).execute()
        if not events_response.data:
            return []

        return events_response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/events/{event_id}/register", status_code=201, response_model=EventRegistration)
async def register_for_event(event_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user['id']
    try:
        # Check if the event exists
        event_response = supabase.table("events").select("id").eq("id", event_id).execute()
        if not event_response.data:
            raise HTTPException(status_code=404, detail="Event not found")

        # Check if the user is already registered
        registration_response = supabase.table("event_registrations").select("*").eq("user_id", user_id).eq("event_id", event_id).execute()
        if registration_response.data:
            raise HTTPException(status_code=400, detail="Already registered for this event")

        # Register the user for the event
        insert_response = supabase.table("event_registrations").insert({"user_id": user_id, "event_id": event_id}).execute()
        if not insert_response.data:
            raise HTTPException(status_code=500, detail="Could not register for event")

        return insert_response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
