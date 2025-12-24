from fastapi import Depends, HTTPException
from app.auth.dependencies import get_current_user

def RoleChecker(allowed_roles: list[str]):
    async def get_current_user_role(user: dict = Depends(get_current_user)):
        user_role = user.get("user_role") # Custom claim from JWT

        if not user_role:
            raise HTTPException(status_code=403, detail="Role claim missing from token")

        if user_role not in allowed_roles:
            raise HTTPException(status_code=403, detail=f"User with role '{user_role}' is not authorized")

        return user

    return get_current_user_role
