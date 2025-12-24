from fastapi import APIRouter, HTTPException, Depends
from app.schemas import EventCreate, Event
from app.core.supabase import supabase
from app.auth.roles import RoleChecker

router = APIRouter()

@router.post("/", response_model=Event, status_code=201, dependencies=[Depends(RoleChecker(["admin", "event_organizer", "event_owner"]))])
async def create_event(event_data: EventCreate):
    try:
        response = supabase.table("events").insert(event_data.dict()).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Could not create event")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=list[Event])
async def get_events():
    try:
        response = supabase.table("events").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{event_id}", response_model=Event)
async def get_event(event_id: str):
    try:
        response = supabase.table("events").select("*").eq("id", event_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Event not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
