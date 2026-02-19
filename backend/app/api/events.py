from fastapi import APIRouter, HTTPException, Depends
from app.schemas import EventCreate, EventUpdate, Event, SchoolCreate, SchoolUpdate, School
from app.core.database import execute_query, execute_query_one
from app.auth.roles import RoleChecker

router = APIRouter()

def _event_to_response(row):
    """Build event dict with ISO start_time/end_time for API response."""
    d = dict(row)
    if d.get("start_time") and not isinstance(d["start_time"], str):
        d["start_time"] = d["start_time"].strftime("%Y-%m-%dT%H:%M:%SZ") if hasattr(d["start_time"], "strftime") else str(d["start_time"])
    if d.get("end_time") and not isinstance(d["end_time"], str):
        d["end_time"] = d["end_time"].strftime("%Y-%m-%dT%H:%M:%SZ") if hasattr(d["end_time"], "strftime") else str(d["end_time"])
    if "current_registrations" in d:
        d["current_registrations"] = int(d["current_registrations"])
    return d

@router.post("/", response_model=Event, status_code=201, dependencies=[Depends(RoleChecker(["admin", "event_organizer", "event_owner"]))])
async def create_event(event_data: EventCreate):
    try:
        data = event_data.dict()
        data.setdefault("is_published", True)
        if "registration_cancellation_cutoff" not in data or data["registration_cancellation_cutoff"] is None:
            data["registration_cancellation_cutoff"] = None
        query = """
            INSERT INTO campus_circle.events (school_id, title, description, start_time, end_time, location, is_published, max_registrations, registration_cancellation_cutoff)
            VALUES (%(school_id)s, %(title)s, %(description)s, %(start_time)s, %(end_time)s, %(location)s, %(is_published)s, %(max_registrations)s, %(registration_cancellation_cutoff)s)
            RETURNING id, school_id, title, description, start_time, end_time, location, is_published, max_registrations, registration_cancellation_cutoff
        """
        result = execute_query_one(query, data)
        if not result:
            raise HTTPException(status_code=500, detail="Could not create event")
        return _event_to_response({**dict(result), "current_registrations": 0})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{event_id}", response_model=Event, dependencies=[Depends(RoleChecker(["admin", "event_organizer", "event_owner"]))])
async def update_event(event_id: str, event_data: EventUpdate):
    try:
        import uuid
        try:
            uuid.UUID(event_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid event ID")
        existing = execute_query_one("SELECT id FROM campus_circle.events WHERE id = %s", (event_id,))
        if not existing:
            raise HTTPException(status_code=404, detail="Event not found")
        data = event_data.dict(exclude_unset=True)
        if not data:
            return await get_event(event_id)
        set_parts = []
        params = {"event_id": event_id}
        for k, v in data.items():
            set_parts.append(f"{k} = %({k})s")
            params[k] = v
        params["event_id"] = event_id
        query = f"UPDATE campus_circle.events SET {', '.join(set_parts)} WHERE id = %(event_id)s"
        execute_query(query, params)
        return await get_event(event_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{event_id}", status_code=204, dependencies=[Depends(RoleChecker(["admin", "event_organizer", "event_owner"]))])
async def delete_event(event_id: str):
    try:
        import uuid
        try:
            uuid.UUID(event_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid event ID")
        existing = execute_query_one("SELECT id FROM campus_circle.events WHERE id = %s", (event_id,))
        if not existing:
            raise HTTPException(status_code=404, detail="Event not found")
        execute_query("DELETE FROM campus_circle.event_registrations WHERE event_id = %s", (event_id,))
        execute_query("DELETE FROM campus_circle.events WHERE id = %s", (event_id,))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/schools/")
async def list_schools():
    """List schools for event create/edit (e.g. dropdown)."""
    try:
        rows = execute_query(
            "SELECT id, name FROM campus_circle.schools ORDER BY name"
        )
        return [{"id": str(r["id"]), "name": r["name"]} for r in (rows or [])]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/schools/{school_id}", response_model=School)
async def get_school(school_id: str, _=Depends(RoleChecker(["admin"]))):
    """Get one school (admin)."""
    try:
        import uuid
        uuid.UUID(school_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid school ID")
    row = execute_query_one(
        "SELECT id, name, address, phone, email, website FROM campus_circle.schools WHERE id = %s",
        (school_id,),
    )
    if not row:
        raise HTTPException(status_code=404, detail="School not found")
    return {**dict(row), "id": str(row["id"])}

@router.post("/schools/", response_model=School, status_code=201)
async def create_school(data: SchoolCreate, _=Depends(RoleChecker(["admin"]))):
    """Create a school (admin)."""
    try:
        result = execute_query_one(
            """INSERT INTO campus_circle.schools (name, address, phone, email, website)
               VALUES (%(name)s, %(address)s, %(phone)s, %(email)s, %(website)s)
               RETURNING id, name, address, phone, email, website""",
            data.dict(),
        )
        return {**dict(result), "id": str(result["id"])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/schools/{school_id}", response_model=School)
async def update_school(school_id: str, data: SchoolUpdate, _=Depends(RoleChecker(["admin"]))):
    """Update a school (admin)."""
    try:
        import uuid
        uuid.UUID(school_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid school ID")
    existing = execute_query_one("SELECT id FROM campus_circle.schools WHERE id = %s", (school_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="School not found")
    d = data.dict(exclude_unset=True)
    if not d:
        row = execute_query_one(
            "SELECT id, name, address, phone, email, website FROM campus_circle.schools WHERE id = %s",
            (school_id,),
        )
        return {**dict(row), "id": str(row["id"])}
    set_parts = [f"{k} = %({k})s" for k in d]
    d["school_id"] = school_id
    execute_query(
        f"UPDATE campus_circle.schools SET {', '.join(set_parts)} WHERE id = %(school_id)s",
        d,
    )
    row = execute_query_one(
        "SELECT id, name, address, phone, email, website FROM campus_circle.schools WHERE id = %s",
        (school_id,),
    )
    return {**dict(row), "id": str(row["id"])}

@router.delete("/schools/{school_id}", status_code=204)
async def delete_school(school_id: str, _=Depends(RoleChecker(["admin"]))):
    """Delete a school (admin). Fails if events or students reference it."""
    try:
        import uuid
        uuid.UUID(school_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid school ID")
    existing = execute_query_one("SELECT id FROM campus_circle.schools WHERE id = %s", (school_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="School not found")
    try:
        execute_query("DELETE FROM campus_circle.schools WHERE id = %s", (school_id,))
    except Exception as e:
        raise HTTPException(status_code=400, detail="Cannot delete: school may be in use (events or students)")

@router.get("/", response_model=list[Event])
async def get_events():
    try:
        # Only show current (ongoing) and future events, exclude past events. LIMIT for safety at scale.
        query = """
            SELECT 
                e.id, e.school_id, e.title, e.description, 
                TO_CHAR(e.start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS start_time,
                TO_CHAR(e.end_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS end_time,
                e.location, e.is_published,
                e.max_registrations,
                TO_CHAR(e.registration_cancellation_cutoff AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS registration_cancellation_cutoff,
                COALESCE(COUNT(er.id), 0) AS current_registrations
            FROM campus_circle.events e
            LEFT JOIN campus_circle.event_registrations er ON e.id = er.event_id
            WHERE e.is_published = TRUE 
                AND (e.end_time IS NULL OR e.end_time >= NOW())
            GROUP BY e.id, e.school_id, e.title, e.description, e.start_time, e.end_time, e.location, e.is_published, e.max_registrations, e.registration_cancellation_cutoff
            ORDER BY e.start_time
            LIMIT 500
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
                TO_CHAR(e.registration_cancellation_cutoff AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS registration_cancellation_cutoff,
                COALESCE(COUNT(er.id), 0) AS current_registrations
            FROM campus_circle.events e
            LEFT JOIN campus_circle.event_registrations er ON e.id = er.event_id
            WHERE e.id = %s
            GROUP BY e.id, e.school_id, e.title, e.description, e.start_time, e.end_time, e.location, e.is_published, e.max_registrations, e.registration_cancellation_cutoff
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
