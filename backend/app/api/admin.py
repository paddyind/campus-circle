from fastapi import APIRouter, HTTPException, Depends, Body, Request
from app.schemas import UserProfile
from app.core.database import (
    execute_query,
    execute_query_one,
    execute_query_public,
    execute_query_one_public,
    execute_query_in_schema,
    execute_query_one_in_schema,
)
from app.auth.dependencies import get_current_user
from app.auth.roles import RoleChecker
from app.core.tenant_resolution import get_all_tenants, get_allowed_tenant_slugs, is_super_admin, resolve_tenant
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


def _require_tenant_access(request: Request, user_id: str) -> dict:
    """Ensure user can access current tenant. Super Admin: all tenants. Tenant Admin: only their tenant."""
    tenant = getattr(request.state, "tenant", None)
    if not tenant:
        raise HTTPException(status_code=400, detail="Tenant not resolved")
    if is_super_admin(user_id):
        return tenant
    allowed = get_allowed_tenant_slugs(user_id)
    if tenant["slug"] not in allowed:
        raise HTTPException(status_code=403, detail="Access denied to this tenant")
    return tenant


@router.get("/users", response_model=list[dict])
async def list_users(
    request: Request,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(RoleChecker(["admin"])),
):
    """List users for the current tenant only. Super Admin sees selected tenant; Tenant Admin sees only their tenant."""
    user_id = current_user.get("sub") or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")

    # Use X-Tenant header directly as source of truth (middleware runs before auth, may not have user context)
    x_tenant = request.headers.get("X-Tenant") or request.headers.get("x-tenant")
    tenant = resolve_tenant(x_tenant, user_id)
    if not tenant:
        tenant = getattr(request.state, "tenant", None)
    if not tenant:
        raise HTTPException(status_code=400, detail="Tenant not resolved. Send X-Tenant header (e.g. demo-circle, demo-bhis).")

    allowed = get_allowed_tenant_slugs(user_id)
    if tenant["slug"] not in allowed:
        raise HTTPException(status_code=403, detail="Access denied to this tenant")

    schema_app = tenant.get("schema_app", "campus_circle")
    schema_auth = tenant.get("schema_auth", "campus_circle_auth")
    logger.info("list_users: X-Tenant=%s slug=%s schema_app=%s", x_tenant, tenant.get("slug"), schema_app)

    try:
        users = execute_query_in_schema(
            schema_app,
            schema_auth,
            """
            SELECT 
                u.id,
                u.role,
                u.created_at,
                COALESCE(au.email, p.email) as email,
                COALESCE(p.full_name, s.full_name) as full_name,
                p.phone,
                s.dob,
                s.status as student_status
            FROM campus_circle.users u
            LEFT JOIN campus_circle_auth.users au ON u.id = au.id
            LEFT JOIN campus_circle.parents p ON u.id = p.id
            LEFT JOIN campus_circle.students s ON u.id = s.id
            ORDER BY u.created_at DESC
            """,
        )
        return [dict(user) for user in users] if users else []
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing users: {str(e)[:100]}")

@router.put("/users/{user_id}/role")
async def update_user_role(
    request: Request,
    user_id: str,
    new_role: str,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(RoleChecker(["admin"])),
):
    """Update a user's role (admin only). Scoped to current tenant."""
    admin_id = current_user.get("sub") or current_user.get("id")
    if not admin_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")

    tenant = _require_tenant_access(request, admin_id)
    schema_app = tenant.get("schema_app", "campus_circle")

    try:
        valid_roles = ["admin", "event_organizer", "event_owner", "parent", "student"]
        if new_role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")

        user = execute_query_one_in_schema(
            schema_app,
            tenant.get("schema_auth", "campus_circle_auth"),
            "SELECT * FROM campus_circle.users WHERE id = %s",
            (user_id,),
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        execute_query_in_schema(
            schema_app,
            tenant.get("schema_auth", "campus_circle_auth"),
            "UPDATE campus_circle.users SET role = %s, updated_at = NOW() WHERE id = %s",
            (new_role, user_id),
        )
        return {"message": f"User role updated to {new_role}", "user_id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user role: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating user role: {str(e)[:100]}")

@router.delete("/users/{user_id}")
async def delete_user(
    request: Request,
    user_id: str,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(RoleChecker(["admin"])),
):
    """Delete a user (admin only). Scoped to current tenant."""
    admin_id = current_user.get("sub") or current_user.get("id")
    if not admin_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")

    tenant = _require_tenant_access(request, admin_id)
    schema_app = tenant.get("schema_app", "campus_circle")
    schema_auth = tenant.get("schema_auth", "campus_circle_auth")

    try:
        user = execute_query_one_in_schema(
            schema_app,
            schema_auth,
            "SELECT * FROM campus_circle.users WHERE id = %s",
            (user_id,),
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        execute_query_in_schema(
            schema_app,
            schema_auth,
            "DELETE FROM campus_circle.users WHERE id = %s",
            (user_id,),
        )
        return {"message": "User deleted successfully", "user_id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting user: {str(e)[:100]}")

@router.get("/contact-submissions", response_model=dict)
async def list_contact_submissions(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(RoleChecker(["admin", "event_organizer"]))
):
    """List contact submissions with pagination (admin/organizer only)"""
    try:
        submissions = execute_query("""
            SELECT 
                cs.id,
                cs.submission_type,
                cs.subject,
                cs.message,
                cs.status,
                cs.created_at,
                cs.updated_at,
                cs.resolved_at,
                cs.admin_notes,
                COALESCE(au.email, 'Unknown') as user_email,
                e.title as event_title
            FROM campus_circle.contact_submissions cs
            LEFT JOIN campus_circle_auth.users au ON cs.user_id = au.id
            LEFT JOIN campus_circle.events e ON cs.related_event_id = e.id
            ORDER BY cs.created_at DESC
            LIMIT %s OFFSET %s
        """, (limit, offset))

        # Get total count
        count_result = execute_query_one("SELECT COUNT(*) as total FROM campus_circle.contact_submissions")
        total = count_result['total'] if count_result else 0
        
        return {
            "submissions": [dict(sub) for sub in submissions] if submissions else [],
            "total": total,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        logger.error(f"Error listing contact submissions: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing submissions: {str(e)[:100]}")

@router.put("/contact-submissions/{submission_id}/status")
async def update_submission_status(
    submission_id: str,
    status: str,
    admin_notes: str = None,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(RoleChecker(["admin", "event_organizer"]))
):
    """Update contact submission status (admin/organizer only)"""
    try:
        valid_statuses = ['new', 'in_progress', 'resolved', 'closed']
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        update_fields = ["status = %s", "updated_at = NOW()"]
        update_values = [status]
        
        if admin_notes:
            update_fields.append("admin_notes = %s")
            update_values.append(admin_notes)
        
        if status == 'resolved':
            update_fields.append("resolved_at = NOW()")
        
        update_values.append(submission_id)
        
        execute_query(
            f"UPDATE campus_circle.contact_submissions SET {', '.join(update_fields)} WHERE id = %s",
            tuple(update_values)
        )
        
        return {"message": f"Submission status updated to {status}", "submission_id": submission_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating submission status: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating status: {str(e)[:100]}")

# ----- Tenant administration (Demo-Circle parent admin can navigate and update any tenant) -----

@router.get("/tenants", response_model=list[dict])
async def admin_list_tenants(
    current_user: dict = Depends(get_current_user),
    _: None = Depends(RoleChecker(["admin"])),
):
    """List all tenants (parent admin only). For switcher and tenant settings navigation."""
    user_id = current_user.get("sub") or current_user.get("id")
    allowed = get_allowed_tenant_slugs(user_id)
    tenants = get_all_tenants()
    return [dict(t) for t in tenants if t["slug"] in allowed]


@router.get("/tenants/{slug}/settings", response_model=dict)
async def get_tenant_settings(
    slug: str,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(RoleChecker(["admin"])),
):
    """Get settings for a tenant (parent admin). Slug e.g. demo-circle, demo-bhis."""
    user_id = current_user.get("sub") or current_user.get("id")
    allowed = get_allowed_tenant_slugs(user_id)
    if slug not in allowed:
        raise HTTPException(status_code=403, detail="Access denied to this tenant")
    row = execute_query_one_public(
        "SELECT id, name, slug, settings, updated_at FROM public.tenants WHERE slug = %s",
        (slug.strip().lower(),),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return dict(row)


@router.put("/tenants/{slug}/settings", response_model=dict)
async def update_tenant_settings(
    slug: str,
    settings: dict = Body(...),
    current_user: dict = Depends(get_current_user),
    _: None = Depends(RoleChecker(["admin"])),
):
    """Update settings for a tenant (parent admin). Pass JSON body: { \"key\": value }."""
    user_id = current_user.get("sub") or current_user.get("id")
    allowed = get_allowed_tenant_slugs(user_id)
    if slug not in allowed:
        raise HTTPException(status_code=403, detail="Access denied to this tenant")
    slug_lower = slug.strip().lower()
    execute_query_public(
        "UPDATE public.tenants SET settings = settings || %s::jsonb, updated_at = now() WHERE slug = %s",
        (settings, slug_lower),
    )
    row = execute_query_one_public(
        "SELECT id, name, slug, settings, updated_at FROM public.tenants WHERE slug = %s",
        (slug_lower,),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return dict(row)
