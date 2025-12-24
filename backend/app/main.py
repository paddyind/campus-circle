from fastapi import FastAPI, Depends
from app.auth.middleware import AuthMiddleware
from app.auth.dependencies import get_current_user
from app.auth.roles import RoleChecker
from app.api import users, events

app = FastAPI()

app.add_middleware(AuthMiddleware)

app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(events.router, prefix="/events", tags=["events"])

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/protected")
def read_protected(user: dict = Depends(get_current_user)):
    return {"message": "This is a protected route", "user": user}

@app.get("/admin-only")
def read_admin_only(user: dict = Depends(RoleChecker(["admin"]))):
    return {"message": "This is an admin-only route", "user": user}
