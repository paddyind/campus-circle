from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import date

class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class ParentCreate(UserBase):
    password: str
    phone: Optional[str] = None

class StudentCreate(UserBase):
    password: Optional[str] = None # Optional for students < 14
    dob: date
    school_id: Optional[str] = None # Using str for UUID from client
    class_id: Optional[str] = None
    parent_id: Optional[str] = None # For students < 14

    @validator('dob', pre=True, always=True)
    def check_age(cls, v, values):
        today = date.today()
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        if age < 14 and not values.get('parent_id'):
            raise ValueError("Students under 14 must be registered by a parent.")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: str
    end_time: Optional[str] = None
    location: Optional[str] = None
    school_id: Optional[str] = None
    max_registrations: Optional[int] = None

class Event(EventCreate):
    id: str
    current_registrations: Optional[int] = 0

    class Config:
        from_attributes = True

class UserProfile(UserBase):
    id: str
    role: str
    phone: Optional[str] = None
    dob: Optional[date] = None
    school_id: Optional[str] = None
    class_id: Optional[str] = None

    class Config:
        from_attributes = True

class EventRegistration(BaseModel):
    user_id: str
    event_id: str

    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    dob: Optional[date] = None

class ContactSubmission(BaseModel):
    submission_type: str  # feedback, complaint, suggestion, general
    subject: str
    message: str
    related_event_id: Optional[str] = None
    related_organizer_id: Optional[str] = None

class ContactSubmissionResponse(BaseModel):
    id: str
    submission_type: str
    subject: str
    message: str
    status: str
    created_at: str

    class Config:
        from_attributes = True

class ChildCreate(BaseModel):
    """Schema for adding a child under 14 (no login account needed)"""
    full_name: str
    dob: date
    email: Optional[str] = None  # Optional, defaults to parent's email
    school_id: Optional[str] = None
    class_id: Optional[str] = None

class ChildUpdate(BaseModel):
    """Schema for updating child information"""
    full_name: Optional[str] = None
    email: Optional[str] = None
    dob: Optional[date] = None
    school_id: Optional[str] = None
    class_id: Optional[str] = None

class EventRegistrationRequest(BaseModel):
    """Schema for event registration with optional student_id for parents"""
    student_id: Optional[str] = None  # Required for parents, not needed for students
    
    class Config:
        from_attributes = True
