from fastapi import APIRouter, HTTPException, Depends
from app.schemas import ParentCreate, StudentCreate, UserLogin
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
