from fastapi import Depends, HTTPException
from app.auth.dependencies import get_current_user
from app.core.database import execute_query_one

def RoleChecker(allowed_roles: list[str]):
    async def get_current_user_role(user: dict = Depends(get_current_user)):
        import logging
        logger = logging.getLogger(__name__)
        
        # Get user ID from JWT token
        user_id = user.get("sub") or user.get("id")
        if not user_id:
            logger.error(f"RoleChecker: User ID not found in token. User dict: {user}")
            raise HTTPException(status_code=401, detail="User ID not found in token")
        
        logger.info(f"RoleChecker: Checking role for user_id: {user_id}")
        
        try:
            # Fetch role from database
            user_row = execute_query_one(
                "SELECT role FROM campus_circle.users WHERE id = %s",
                (user_id,)
            )
            
            if not user_row:
                logger.error(f"RoleChecker: User {user_id} not found in database")
                raise HTTPException(status_code=403, detail="User not found in database")
            
            user_role = user_row.get('role')
            if not user_role:
                logger.error(f"RoleChecker: User {user_id} has no role in database")
                raise HTTPException(status_code=403, detail="User role not found in database")

            logger.info(f"RoleChecker: User {user_id} has role: {user_role}, checking against: {allowed_roles}")
            
            if user_role not in allowed_roles:
                raise HTTPException(status_code=403, detail=f"User with role '{user_role}' is not authorized. Required roles: {', '.join(allowed_roles)}")

            return user
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"RoleChecker: Error checking role: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error checking user role: {str(e)[:100]}")

    return get_current_user_role
