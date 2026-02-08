from fastapi import APIRouter, HTTPException, Depends
from app.schemas import EventCreate, Event
from app.core.database import execute_query, execute_query_one
from app.auth.roles import RoleChecker

router = APIRouter()

@router.post("/", response_model=Event, status_code=201, dependencies=[Depends(RoleChecker(["admin", "event_organizer", "event_owner"]))])
async def create_event(event_data: EventCreate):
    try:
        query = """
            INSERT INTO campus_circle.events (school_id, title, description, start_time, end_time, location, is_published)
            VALUES (%(school_id)s, %(title)s, %(description)s, %(start_time)s, %(end_time)s, %(location)s, %(is_published)s)
            RETURNING *
        """
        result = execute_query_one(query, event_data.dict())
        if not result:
            raise HTTPException(status_code=500, detail="Could not create event")
        return dict(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=list[Event])
async def get_events():
    try:
        # Only show current (ongoing) and future events, exclude past events
        query = """
            SELECT 
                e.id, e.school_id, e.title, e.description, 
                TO_CHAR(e.start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS start_time,
                TO_CHAR(e.end_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS end_time,
                e.location, e.is_published,
                e.max_registrations,
                COALESCE(COUNT(er.id), 0) AS current_registrations
            FROM campus_circle.events e
            LEFT JOIN campus_circle.event_registrations er ON e.id = er.event_id
            WHERE e.is_published = TRUE 
                AND (e.end_time IS NULL OR e.end_time >= NOW())
            GROUP BY e.id, e.school_id, e.title, e.description, e.start_time, e.end_time, e.location, e.is_published, e.max_registrations
            ORDER BY e.start_time
        """
        results = execute_query(query)
        events = []
        for row in results:
            event_dict = dict(row)
            # Ensure current_registrations is an integer
            if 'current_registrations' in event_dict:
                event_dict['current_registrations'] = int(event_dict['current_registrations'])
            events.append(event_dict)
        return events
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{event_id}", response_model=Event)
async def get_event(event_id: str):
    try:
        # Validate that event_id is a valid UUID format
        import uuid
        try:
            uuid.UUID(event_id)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid event ID format: {event_id}. Expected UUID.")
        
        query = """
            SELECT 
                e.id, e.school_id, e.title, e.description, 
                TO_CHAR(e.start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS start_time,
                TO_CHAR(e.end_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS end_time,
                e.location, e.is_published,
                e.max_registrations,
                COALESCE(COUNT(er.id), 0) AS current_registrations
            FROM campus_circle.events e
            LEFT JOIN campus_circle.event_registrations er ON e.id = er.event_id
            WHERE e.id = %s
            GROUP BY e.id, e.school_id, e.title, e.description, e.start_time, e.end_time, e.location, e.is_published, e.max_registrations
        """
        result = execute_query_one(query, (event_id,))
        if not result:
            raise HTTPException(status_code=404, detail="Event not found")
        return dict(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching event: {str(e)[:100]}")

@router.get("/{event_id}/registrations")
async def get_event_registrations(
    event_id: str,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(RoleChecker(["admin", "event_organizer", "event_owner"]))
):
    """Get list of registered students for an event (admin/organizer only)"""
    try:
        # Verify event exists
        event = execute_query_one("SELECT id FROM campus_circle.events WHERE id = %s", (event_id,))
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        # Get registrations with student and parent details
        # Using STRING_AGG to handle multiple parents for a single student
        query = """
            SELECT
                er.registered_at,
                s.full_name as student_name,
                s.status as student_status,
                c.name as class_name,
                sch.name as school_name,
                STRING_AGG(p.full_name, ', ') as parent_name,
                STRING_AGG(p.email, ', ') as parent_email,
                STRING_AGG(p.phone, ', ') as parent_phone
            FROM campus_circle.event_registrations er
            JOIN campus_circle.students s ON er.student_id = s.id
            LEFT JOIN campus_circle.classes c ON s.class_id = c.id
            LEFT JOIN campus_circle.schools sch ON s.school_id = sch.id
            LEFT JOIN campus_circle.parent_students ps ON s.id = ps.student_id
            LEFT JOIN campus_circle.parents p ON ps.parent_id = p.id
            WHERE er.event_id = %s
            GROUP BY er.registered_at, s.id, s.full_name, s.status, c.name, sch.name
            ORDER BY er.registered_at DESC
            LIMIT %s OFFSET %s
        """
        registrations = execute_query(query, (event_id, limit, offset))

        # Get total count for pagination
        count_query = "SELECT COUNT(*) as total FROM campus_circle.event_registrations WHERE event_id = %s"
        total_count = execute_query_one(count_query, (event_id,))

        return {
            "registrations": [dict(reg) for reg in registrations] if registrations else [],
            "total": total_count['total'] if total_count else 0,
            "limit": limit,
            "offset": offset
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching registrations: {str(e)[:100]}")
