-- Auto-create a profiles row whenever a new auth.users row is inserted.
-- Runs as the function owner (postgres), so it bypasses the profiles RLS
-- policies entirely -- the client never needs to INSERT into profiles itself.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone_number, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone_number',
    'approved'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Since profiles is now populated server-side, the client no longer needs
-- an INSERT policy on profiles at all. Keeping it doesn't hurt (it just
-- becomes dead code), but you can optionally drop it:
-- DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Backfill: create profiles rows for any existing auth.users that don't
-- have one yet (your current test accounts).
INSERT INTO public.profiles (id, full_name, email, phone_number, status)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  u.email,
  u.raw_user_meta_data->>'phone_number',
  'approved'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
