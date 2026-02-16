"""
Tenant resolution: X-Tenant header or default for the user.
Demo-Circle admins can access all tenants; others only tenants where they have a user record.
"""
from contextvars import ContextVar
from typing import Optional

# Set by middleware; read by database layer to substitute schema in queries.
current_tenant_ctx: ContextVar[Optional[dict]] = ContextVar("current_tenant", default=None)


def get_current_tenant() -> Optional[dict]:
    """Return { slug, schema_app, schema_auth } or None (use default schema)."""
    return current_tenant_ctx.get()


def set_current_tenant(tenant: Optional[dict]) -> None:
    """Set tenant for this request (called by middleware)."""
    current_tenant_ctx.set(tenant)
