-- migrations/004_add_jwt_claim_function.sql
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
  role TEXT;
BEGIN
  SELECT "role" INTO role
  FROM "campus_circle"."users"
  WHERE "id" = auth.uid();
  RETURN role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
