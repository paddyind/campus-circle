"""
Resolve current tenant from X-Tenant header and user access.
Only super admins (public.super_admins) can access all tenants and switch.
Tenant admins (e.g. Demo-Circle or Demo-BHIS admin) can access only their single tenant.
"""
from typing import List, Optional
from app.core.database import (
    execute_query_public,
    execute_query_one_public,
    user_exists_in_schema,
)


def get_all_tenants() -> List[dict]:
    """Return all tenants from public.tenants (id, name, slug, schema_app, schema_auth, is_internal, settings)."""
    rows = execute_query_public(
        "SELECT id, name, slug, schema_app, schema_auth, is_internal, settings FROM public.tenants ORDER BY slug"
    )
    return [dict(r) for r in rows] if rows else []


def is_super_admin(user_id: str) -> bool:
    """True if user is in public.super_admins (can access all tenants, admin in every tenant)."""
    row = execute_query_one_public(
        "SELECT 1 FROM public.super_admins WHERE auth_user_id = %s",
        (user_id,),
    )
    return bool(row)


def is_demo_circle_admin(user_id: str) -> bool:
    """True if user is admin in the internal tenant (campus_circle)."""
    row = execute_query_one_public(
        "SELECT 1 FROM campus_circle.users WHERE id = %s AND role = %s",
        (user_id, "admin"),
    )
    if not row:
        return False
    # Confirm Demo-Circle is the internal tenant
    internal = execute_query_one_public(
        "SELECT 1 FROM public.tenants WHERE schema_app = %s AND is_internal = TRUE",
        ("campus_circle",),
    )
    return bool(internal)


def get_allowed_tenant_slugs(user_id: Optional[str]) -> List[str]:
    """
    Tenants the user can access. Only super admins get all tenants.
    Tenant admins (including Demo-Circle) get only the tenant(s) where they have a user record.
    """
    tenants = get_all_tenants()
    if not tenants:
        return ["demo-circle"]
    if not user_id:
        return [t["slug"] for t in tenants]
    if is_super_admin(user_id):
        return [t["slug"] for t in tenants]
    allowed = []
    for t in tenants:
        if user_exists_in_schema(t["schema_app"], user_id):
            allowed.append(t["slug"])
    return allowed if allowed else [tenants[0]["slug"]]


def resolve_tenant(x_tenant_slug: Optional[str], user_id: Optional[str]) -> Optional[dict]:
    """
    Resolve tenant for request. Returns { id, name, slug, schema_app, schema_auth, is_internal, settings }
    or None to use default (campus_circle).
    """
    tenants = get_all_tenants()
    if not tenants:
        return None
    allowed = get_allowed_tenant_slugs(user_id)
    # If header provided, use it if allowed
    if x_tenant_slug:
        slug = x_tenant_slug.strip().lower()
        if slug not in allowed:
            return None  # Will use default below
        for t in tenants:
            if t["slug"] == slug:
                return t
    # Default: first allowed tenant
    for t in tenants:
        if t["slug"] in allowed:
            return t
    return None
