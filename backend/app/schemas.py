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

class Event(EventCreate):
    id: str

    class Config:
        orm_mode = True

class UserProfile(UserBase):
    id: str
    role: str
    phone: Optional[str] = None
    dob: Optional[date] = None
    school_id: Optional[str] = None
    class_id: Optional[str] = None

    class Config:
        orm_mode = True

class EventRegistration(BaseModel):
    user_id: str
    event_id: str

    class Config:
        orm_mode = True
