-- News: publicly readable, no longer writable from the browser
DROP POLICY IF EXISTS "public_insert" ON public."News";
DROP POLICY IF EXISTS "public_update" ON public."News";
DROP POLICY IF EXISTS "public_delete" ON public."News";
REVOKE INSERT, UPDATE, DELETE ON public."News" FROM anon, authenticated;
GRANT SELECT ON public."News" TO anon, authenticated;
GRANT ALL ON public."News" TO service_role;

-- Group_Info: publicly readable, no longer writable from the browser
DROP POLICY IF EXISTS "public_insert" ON public."Group_Info";
DROP POLICY IF EXISTS "public_update" ON public."Group_Info";
DROP POLICY IF EXISTS "public_delete" ON public."Group_Info";
REVOKE INSERT, UPDATE, DELETE ON public."Group_Info" FROM anon, authenticated;
GRANT SELECT ON public."Group_Info" TO anon, authenticated;
GRANT ALL ON public."Group_Info" TO service_role;

-- Profile_Edit_Requests: no direct browser access at all; server functions only
DROP POLICY IF EXISTS "per all" ON public."Profile_Edit_Requests";
REVOKE ALL ON public."Profile_Edit_Requests" FROM anon, authenticated;
GRANT ALL ON public."Profile_Edit_Requests" TO service_role;