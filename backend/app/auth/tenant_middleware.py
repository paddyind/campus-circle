"""
Set request tenant from X-Tenant header or user's default. Demo-Circle admins can access any tenant.
"""
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.tenant import set_current_tenant
from app.core.tenant_resolution import resolve_tenant

logger = logging.getLogger(__name__)

# Fallback when no tenants in DB (e.g. before migrations)
DEFAULT_TENANT = {
    "slug": "demo-circle",
    "schema_app": "campus_circle",
    "schema_auth": "campus_circle_auth",
    "name": "Demo-Circle",
    "id": None,
    "is_internal": True,
    "settings": {},
}


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        user = getattr(request.state, "user", None)
        user_id = (user.get("sub") or user.get("id")) if user else None
        x_tenant = request.headers.get("X-Tenant") or request.headers.get("x-tenant")
        try:
            tenant = resolve_tenant(x_tenant, user_id)
        except Exception as e:
            logger.exception("Tenant resolution failed (DB or config): %s", e)
            tenant = None
        if not tenant:
            tenant = DEFAULT_TENANT
        request.state.tenant = tenant
        set_current_tenant(tenant)
        try:
            return await call_next(request)
        finally:
            set_current_tenant(None)
