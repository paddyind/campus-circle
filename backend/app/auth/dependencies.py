from fastapi import Request, HTTPException
from typing import Optional

def get_current_user(request: Request):
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def get_current_user_optional(request: Request) -> Optional[dict]:
    """Return user if authenticated, else None. For endpoints that support both."""
    return getattr(request.state, "user", None)
