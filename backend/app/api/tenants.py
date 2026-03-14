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
    For non-super-admin users, resolve tenant by email or use their only allowed tenant.
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

    # Resolve correct tenant for the user:
    # 1. If current tenant (from X-Tenant) is not in allowed_slugs, override
    # 2. Prefer tenant by email (e.g. bhis_* -> demo-bhis)
    # 3. Otherwise use first allowed tenant
    user_email = (user or {}).get("email") or ""
    current_slug = tenant.get("slug", "")
    
    if current_slug not in allowed_slugs:
        # X-Tenant header doesn't match user's access - resolve correctly
        preferred = resolve_tenant_by_email(user_email) if user_email else None
        if preferred and preferred.get("slug") in allowed_slugs:
            tenant = preferred
        elif allowed_slugs:
            # Use first allowed tenant
            all_tenants = get_all_tenants()
            for t in all_tenants:
                if t["slug"] in allowed_slugs:
                    tenant = t
                    break
    elif user_email and len(allowed_slugs) > 1:
        # User has multiple tenants - prefer the one matching their email
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
