from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError
from app.core.config import SUPABASE_URL, SUPABASE_ANON_KEY
import requests

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Allow OPTIONS requests to pass through
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip auth for public paths
        public_paths = ["/", "/docs", "/openapi.json"]
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

            # This is a simplified validation. A robust implementation would fetch and cache the JWKS.
            jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
            jwks = requests.get(jwks_url).json()

            # Find the key with the kid from the token header
            unverified_header = jwt.get_unverified_header(token)
            rsa_key = {}
            for key in jwks['keys']:
                if key['kid'] == unverified_header['kid']:
                    rsa_key = {
                        'kty': key['kty'],
                        'kid': key['kid'],
                        'use': key['use'],
                        'n': key['n'],
                        'e': key['e']
                    }
            if rsa_key:
                payload = jwt.decode(
                    token,
                    rsa_key,
                    algorithms=["RS256"],
                    audience="authenticated"
                )
                request.state.user = payload
            else:
                raise HTTPException(status_code=401, detail="Invalid token")

        except JWTError as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Authentication error: {e}")

        response = await call_next(request)
        return response
