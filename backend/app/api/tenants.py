"""
Tenant list and current-tenant for switcher. Admin tenant settings in admin.py.
"""
from fastapi import APIRouter, Depends, Request
from app.auth.dependencies import get_current_user
from app.core.tenant_resolution import get_all_tenants, get_allowed_tenant_slugs

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
    """
    tenant = getattr(request.state, "tenant", None) or {}
    user = getattr(request.state, "user", None)
    user_id = (user.get("sub") or user.get("id")) if user else None
    allowed_slugs = get_allowed_tenant_slugs(user_id)
    return {
        "tenant": {
            "id": str(tenant.get("id")) if tenant.get("id") else None,
            "name": tenant.get("name", "Demo-Circle"),
            "slug": tenant.get("slug", "demo-circle"),
            "settings": tenant.get("settings") or {},
        },
        "allowed_slugs": allowed_slugs,
    }
