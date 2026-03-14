import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.auth.middleware import AuthMiddleware
from app.auth.tenant_middleware import TenantMiddleware
from app.auth.dependencies import get_current_user
from app.auth.roles import RoleChecker
from app.api import users, events, admin, tenants

app = FastAPI(redirect_slashes=False)

# CORS: web (localhost) and mobile (Capacitor, LAN IPs for Android/iOS device testing)
_app_env = os.environ.get("APP_ENV", "development")
if _app_env == "development":
    # Allow localhost, 127.0.0.1, 192.168.x.x, and Capacitor
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^(https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?|capacitor://localhost)$",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Tenant", "Accept"],
        max_age=86400,
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:80", "http://localhost", "capacitor://localhost"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Tenant", "Accept"],
        max_age=86400,
    )

# TenantMiddleware needs request.state.user (set by AuthMiddleware) for user-aware tenant resolution.
# Add TenantMiddleware first so AuthMiddleware runs first (outermost) on each request.
app.add_middleware(TenantMiddleware)
app.add_middleware(AuthMiddleware)

app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(tenants.router, prefix="/api/tenants", tags=["tenants"])

@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/api")
@app.get("/api/")
def api_root():
    """Health/info for API root (e.g. GET /api from mobile or browser)."""
    return {"status": "ok", "api": "campus-circle", "docs": "/docs"}

@app.get("/protected")
def read_protected(user: dict = Depends(get_current_user)):
    return {"message": "This is a protected route", "user": user}

@app.get("/admin-only")
def read_admin_only(user: dict = Depends(RoleChecker(["admin"]))):
    return {"message": "This is an admin-only route", "user": user}
