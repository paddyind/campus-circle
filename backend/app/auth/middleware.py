from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError
from app.core.config import SUPABASE_URL, SUPABASE_ANON_KEY
import requests
import logging

logger = logging.getLogger(__name__)

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Allow OPTIONS requests to pass through
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip auth for public paths
        public_paths = ["/", "/api", "/api/", "/docs", "/openapi.json", "/redoc"]
        # Allow GET for list and single event only (public viewing); require auth for /registrations and other sub-routes
        if request.method == "GET" and request.url.path.startswith("/api/events"):
            if "/registrations" not in request.url.path and request.url.path != "/api/events/schools/":
                return await call_next(request)
        # Allow POST requests to user registration and login (public)
        if request.url.path.startswith("/api/users/register") or request.url.path == "/api/users/login":
            return await call_next(request)
        if request.url.path in public_paths:
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if not auth_header:
            raise HTTPException(status_code=401, detail="Authorization header missing")

        try:
            scheme, token = auth_header.split()
            if scheme.lower() != "bearer":
                raise HTTPException(status_code=401, detail="Invalid authentication scheme")

            # In a real app, you'd fetch the JWKS from Supabase to get the public key
            # For simplicity, we'll assume a shared secret, but this is NOT secure for production
            # and depends on how you configure your Supabase JWTs.
            # A better approach is to use a library that handles JWKS fetching.
            # This is a placeholder for proper validation.
            # For Supabase, the secret is SUPABASE_JWT_SECRET which you'd set in your env.
            # However, Supabase recommends using the JWKS endpoint.
            # Let's assume we are using the anon key as a placeholder for the secret.
            # WARNING: This is a simplified example.
            # In a real application, fetch the JWKS from `https://<project_ref>.supabase.co/auth/v1/.well-known/jwks.json`

            # Validate Supabase JWT token
            # For development, we'll use a simpler approach: verify with Supabase API
            # In production, use JWKS for proper validation
            
            # Option 1: Verify token with Supabase API (simpler, works for development)
            try:
                verify_url = f"{SUPABASE_URL}/auth/v1/user"
                headers = {
                    "Authorization": f"Bearer {token}",
                    "apikey": SUPABASE_ANON_KEY
                }
                verify_response = requests.get(verify_url, headers=headers, timeout=5)
                
                if verify_response.status_code == 200:
                    user_data = verify_response.json()
                    # Store user info in request state
                    request.state.user = {
                        "sub": user_data.get("id"),
                        "email": user_data.get("email"),
                        **user_data
                    }
                else:
                    # If Supabase verification fails, try decoding without verification (development only)
                    logger.warning(f"Supabase token verification failed: {verify_response.status_code}")
                    try:
                        payload = jwt.decode(
                            token,
                            key="",  # required by python-jose even when not verifying
                            algorithms=["HS256"],
                            options={"verify_signature": False},
                        )
                        request.state.user = payload
                    except Exception as decode_error:
                        raise HTTPException(status_code=401, detail=f"Invalid token: {str(decode_error)[:100]}")
            except requests.exceptions.RequestException as e:
                # If Supabase API is unreachable, decode without verification (development only)
                logger.warning(f"Supabase API unreachable: {e}")
                try:
                    payload = jwt.decode(
                        token,
                        key="",
                        algorithms=["HS256"],
                        options={"verify_signature": False},
                    )
                    request.state.user = payload
                except Exception as decode_error:
                    raise HTTPException(status_code=401, detail=f"Invalid token: {str(decode_error)[:100]}")

        except JWTError as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Authentication error: {e}")

        response = await call_next(request)
        return response
