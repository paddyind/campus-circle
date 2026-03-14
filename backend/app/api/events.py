import uuid as uuid_mod
from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File, Form
from fastapi.responses import FileResponse
from app.schemas import EventCreate, EventUpdate, Event, SchoolCreate, SchoolUpdate, School
from app.core.database import execute_query, execute_query_one
from app.auth.roles import RoleChecker
from app.auth.dependencies import get_current_user, get_current_user_optional
from app.core.tenant_resolution import get_tenant_feature
from app.core.storage import save_resource, get_resource_path, delete_resource as storage_delete

router = APIRouter()

# Max file size 50MB for prototype
MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024

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


# ----- Event Resources (tenant/event-scoped storage for all file types) -----

def _check_event_resources_feature(request: Request):
    tenant = getattr(request.state, "tenant", None) or {}
    if not get_tenant_feature(tenant, "event_storage"):
        raise HTTPException(status_code=403, detail="Event resources are disabled for this tenant")


def _user_can_upload(request: Request, user: dict) -> bool:
    role = user.get("role") or ""
    return role in ("admin", "event_organizer", "event_owner")


def _user_is_registered(user_id: str, event_id: str) -> bool:
    if not user_id:
        return False
    # Student: s.auth_user_id = user_id. Parent: p.id = user_id (parent id is auth user id)
    r = execute_query_one(
        """SELECT 1 FROM campus_circle.event_registrations er
           JOIN campus_circle.students s ON er.student_id = s.id
           WHERE er.event_id = %s
             AND (s.auth_user_id = %s
                  OR EXISTS (SELECT 1 FROM campus_circle.parent_students ps
                             WHERE ps.student_id = s.id AND ps.parent_id = %s))""",
        (event_id, user_id, user_id),
    )
    return bool(r)


def _can_access_resource(res: dict, request: Request, user: dict | None) -> bool:
    vis = res.get("visibility", "participants")
    if vis == "public":
        return True
    if not user:
        return False
    user_id = user.get("sub") or user.get("id")
    role = user.get("role") or ""
    if role in ("admin", "event_organizer", "event_owner"):
        return True
    if vis == "participants":
        return _user_is_registered(user_id, res["event_id"])
    return False  # private


@router.post("/{event_id}/resources")
async def upload_resource(
    event_id: str,
    request: Request,
    file: UploadFile = File(...),
    category: str = Form("details"),
    visibility: str = Form("participants"),
    current_user: dict = Depends(get_current_user),
    _=Depends(RoleChecker(["admin", "event_organizer", "event_owner"])),
):
    """Upload a resource (document, media, agreement) for an event. Agreements category forces visibility=private."""
    _check_event_resources_feature(request)
    if not _user_can_upload(request, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to upload")
    try:
        uuid_mod.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid event ID")
    if category not in ("details", "media", "agreements"):
        raise HTTPException(status_code=400, detail="Category must be details, media, or agreements")
    if category == "agreements":
        visibility = "private"
    elif visibility not in ("public", "participants", "private"):
        visibility = "participants"
    event = execute_query_one("SELECT id FROM campus_circle.events WHERE id = %s", (event_id,))
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    content = await file.read()
    if len(content) > MAX_ATTACHMENT_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")
    tenant = getattr(request.state, "tenant", None) or {}
    tenant_slug = tenant.get("slug", "demo-circle")
    user_id = current_user.get("sub") or current_user.get("id")
    storage_path = save_resource(tenant_slug, event_id, category, file.filename or "file", content)
    execute_query(
        """INSERT INTO campus_circle.event_resources
           (event_id, category, visibility, storage_path, filename, mime_type, size_bytes, created_by)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
        (event_id, category, visibility, storage_path, file.filename or "file", file.content_type, len(content), user_id),
    )
    row = execute_query_one(
        """SELECT id, event_id, category, visibility, filename, mime_type, size_bytes, created_at
           FROM campus_circle.event_resources
           WHERE storage_path = %s ORDER BY created_at DESC LIMIT 1""",
        (storage_path,),
    )
    return dict(row) if row else {"storage_path": storage_path}


@router.get("/{event_id}/resources")
async def list_resources(
    event_id: str,
    request: Request,
    _user: dict | None = Depends(get_current_user_optional),
):
    """List resources for an event. Returns only those the user can access (by visibility)."""
    _check_event_resources_feature(request)
    try:
        uuid_mod.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid event ID")
    event = execute_query_one("SELECT id FROM campus_circle.events WHERE id = %s", (event_id,))
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    rows = execute_query(
        """SELECT id, event_id, category, visibility, filename, mime_type, size_bytes, created_at
           FROM campus_circle.event_resources WHERE event_id = %s ORDER BY category, filename""",
        (event_id,),
    )
    user = _user
    out = []
    for r in rows:
        d = dict(r)
        if _can_access_resource(d, request, user):
            d["id"] = str(d["id"])
            d["event_id"] = str(d["event_id"])
            if d.get("created_at") and hasattr(d["created_at"], "isoformat"):
                d["created_at"] = d["created_at"].isoformat()
            out.append(d)
    return out


@router.get("/{event_id}/resources/{resource_id}/download")
async def download_resource(
    event_id: str,
    resource_id: str,
    request: Request,
    _user: dict | None = Depends(get_current_user_optional),
):
    """Download a resource. Access controlled by visibility."""
    _check_event_resources_feature(request)
    try:
        uuid_mod.UUID(event_id)
        uuid_mod.UUID(resource_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID")
    row = execute_query_one(
        """SELECT id, event_id, category, visibility, storage_path, filename
           FROM campus_circle.event_resources WHERE id = %s AND event_id = %s""",
        (resource_id, event_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Resource not found")
    d = dict(row)
    user = _user
    if not _can_access_resource(d, request, user):
        raise HTTPException(status_code=403, detail="Access denied")
    path = get_resource_path(d["storage_path"])
    if not path or not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename=d["filename"] or "download")


@router.delete("/{event_id}/resources/{resource_id}")
async def delete_resource(
    event_id: str,
    resource_id: str,
    request: Request,
    _=Depends(RoleChecker(["admin", "event_organizer", "event_owner"])),
):
    """Delete a resource (admin/organizer/owner only)."""
    _check_event_resources_feature(request)
    try:
        uuid_mod.UUID(event_id)
        uuid_mod.UUID(resource_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID")
    row = execute_query_one(
        "SELECT id, storage_path FROM campus_circle.event_resources WHERE id = %s AND event_id = %s",
        (resource_id, event_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Resource not found")
    execute_query("DELETE FROM campus_circle.event_resources WHERE id = %s", (resource_id,))
    storage_delete(row["storage_path"])
    return {"deleted": True}


# ----- Calendar import (iCal/ICS, PDF, images) -----

def _upsert_events(events: list[dict], school_id: str | None) -> tuple[int, int]:
    """Insert or update events. Returns (created, updated)."""
    created = 0
    updated = 0
    for ev in events:
        title = ev.get("title") or ""
        start_iso = ev.get("start_time")
        if not title or not start_iso:
            continue
        end_iso = ev.get("end_time")
        description = ev.get("description")
        location = ev.get("location")
        existing = execute_query_one(
            """SELECT id FROM campus_circle.events
               WHERE title = %s AND start_time = %s::timestamptz LIMIT 1""",
            (title, start_iso),
        )
        if existing:
            execute_query(
                """UPDATE campus_circle.events SET description = COALESCE(%s, description),
                   end_time = COALESCE(%s::timestamptz, end_time), location = COALESCE(%s, location),
                   school_id = COALESCE(%s::uuid, school_id), updated_at = now()
                   WHERE id = %s""",
                (description, end_iso, location, school_id, str(existing["id"])),
            )
            updated += 1
        else:
            execute_query(
                """INSERT INTO campus_circle.events (school_id, title, description, start_time, end_time, location, is_published)
                   VALUES (%s, %s, %s, %s::timestamptz, %s::timestamptz, %s, TRUE)""",
                (school_id or None, title, description, start_iso, end_iso, location),
            )
            created += 1
    return created, updated


@router.post("/import-calendar")
async def import_calendar(
    request: Request,
    file: UploadFile = File(...),
    school_id: str | None = Form(None),
    dry_run: bool = Form(False),
    current_user: dict = Depends(get_current_user),
    _=Depends(RoleChecker(["admin", "event_organizer", "event_owner"])),
):
    """Import events from iCal (.ics), PDF, or image (PNG/JPEG). dry_run=True: extract only, no DB write; returns extracted + debug_log."""
    import logging
    logger = logging.getLogger(__name__)

    tenant = getattr(request.state, "tenant", None) or {}
    if not get_tenant_feature(tenant, "calendar_import"):
        raise HTTPException(status_code=403, detail="Calendar import is disabled for this tenant")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 5MB)")
    filename = (file.filename or "").lower()
    events: list[dict] = []
    debug_log: list[str] = []

    if filename.endswith((".ics", ".ical")):
        try:
            from icalendar import Calendar
        except ImportError:
            raise HTTPException(status_code=503, detail="Calendar import not available")
        try:
            cal = Calendar.from_ical(content)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid iCal file: {str(e)[:80]}")
        for comp in cal.walk():
            if comp.name != "VEVENT":
                continue
            title = comp.get("summary")
            if not title:
                title = str(comp.get("dtstart", ""))
            if not title:
                continue
            dtstart = comp.get("dtstart")
            dtend = comp.get("dtend")
            if not dtstart:
                continue
            start_dt = dtstart.dt if hasattr(dtstart, "dt") else dtstart
            end_dt = dtend.dt if dtend and hasattr(dtend, "dt") else None
            if hasattr(start_dt, "isoformat"):
                start_iso = start_dt.isoformat()
            else:
                start_iso = str(start_dt)
            if end_dt and hasattr(end_dt, "isoformat"):
                end_iso = end_dt.isoformat()
            else:
                end_iso = None
            loc = comp.get("location")
            location = str(loc) if loc else None
            desc = comp.get("description")
            description = str(desc) if desc else None
            events.append({"title": title, "start_time": start_iso, "end_time": end_iso, "description": description, "location": location})
        debug_log = [f"[iCal] Parsed {len(events)} events"]
    elif filename.endswith(".pdf"):
        from app.core.calendar_extract import (
            extract_from_pdf_grid,
            extract_from_pdf,
            extract_from_pdf_pymupdf,
            extract_from_pdf_ocr,
        )
        try:
            # Try strategies in order: grid table -> pdfplumber text -> PyMuPDF -> OCR (for scanned PDFs)
            grid_events, debug_log = extract_from_pdf_grid(content, yellow_only=False)
            if grid_events:
                events = [
                    {"title": e["title"], "start_time": e["start_time"], "end_time": e.get("end_time"), "description": None}
                    for e in grid_events
                ]
                debug_log.append("[Strategy] Used: grid table")
            else:
                text_events, debug_log = extract_from_pdf(content, debug_log)
                if text_events:
                    events = text_events
                    debug_log.append("[Strategy] Used: pdfplumber text")
                else:
                    pymupdf_events, debug_log = extract_from_pdf_pymupdf(content, debug_log)
                    if pymupdf_events:
                        events = pymupdf_events
                        debug_log.append("[Strategy] Used: PyMuPDF")
                    else:
                        ocr_events, debug_log = extract_from_pdf_ocr(content, debug_log)
                        if ocr_events:
                            events = ocr_events
                            debug_log.append("[Strategy] Used: OCR (scanned PDF)")
                        else:
                            debug_log.append("[Strategy] All methods returned 0 events")
        except Exception as e:
            debug_log.append(f"[Error] {str(e)}")
            raise HTTPException(status_code=400, detail=f"Could not extract events from PDF: {str(e)[:100]}")
    elif any(filename.endswith(ext) for ext in (".png", ".jpg", ".jpeg")):
        from app.core.calendar_extract import extract_from_image
        try:
            events = extract_from_image(content)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not extract events from image: {str(e)[:100]}")
        debug_log = [f"[Image OCR] Extracted {len(events)} events"]
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported format. Use .ics, .ical, .pdf, .png, or .jpg",
        )

    # Log to backend container (visible in docker logs / stdout)
    for line in debug_log:
        logger.info(line)

    if dry_run:
        return {
            "dry_run": True,
            "message": "Preview only – no events saved",
            "extracted_count": len(events),
            "extracted": events,
        }

    if not events:
        return {"created": 0, "updated": 0, "message": "No events found in file"}
    created, updated = _upsert_events(events, school_id)
    return {"created": created, "updated": updated}
