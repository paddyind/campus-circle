"""
Tenant list and current-tenant for switcher. Admin tenant settings in admin.py.
"""
import logging
import psycopg2
from fastapi import APIRouter, Depends, Request, HTTPException
from app.auth.dependencies import get_current_user
from app.core.tenant_resolution import get_all_tenants, get_allowed_tenant_slugs, resolve_tenant_by_email

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=list[dict])
async def list_tenants(request: Request):
    """
    List tenants available to the caller. Unauthenticated: first tenant only.
    Authenticated: tenants where user has access; Demo-Circle admins see all.
    """
    user = getattr(request.state, "user", None)
    user_id = (user.get("sub") or user.get("id")) if user else None
    allowed_slugs = get_allowed_tenant_slugs(user_id)
    tenants = get_all_tenants()
    return [t for t in tenants if t["slug"] in allowed_slugs]


@router.get("/current", response_model=dict)
async def current_tenant(request: Request):
    """
    Current tenant (from X-Tenant or default) and list of allowed tenant slugs for switcher.
    For non-super-admin users with multiple tenants, prefer the tenant that matches their email (e.g. bhis_* -> demo-bhis).
    """
    tenant = getattr(request.state, "tenant", None) or {}
    user = getattr(request.state, "user", None)
    user_id = (user.get("sub") or user.get("id")) if user else None
    try:
        allowed_slugs = get_allowed_tenant_slugs(user_id)
    except psycopg2.OperationalError as e:
        logger.exception("Database unavailable in /tenants/current: %s", e)
        raise HTTPException(
            status_code=503,
            detail="Database temporarily unavailable. Check SUPABASE_DB_* config and network.",
        ) from e
    # Prefer tenant by email when user has multiple (e.g. BHIS parent should see demo-bhis, not demo-circle)
    user_email = (user or {}).get("email") or ""
    if user_email and len(allowed_slugs) > 1:
        preferred = resolve_tenant_by_email(user_email)
        if preferred and preferred.get("slug") in allowed_slugs:
            tenant = preferred
    return {
        "tenant": {
            "id": str(tenant.get("id")) if tenant.get("id") else None,
            "name": tenant.get("name", "Demo-Circle"),
            "slug": tenant.get("slug", "demo-circle"),
            "settings": tenant.get("settings") or {},
        },
        "allowed_slugs": allowed_slugs,
    }
