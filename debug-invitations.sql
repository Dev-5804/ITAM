-- Debug: Check all pending invitations
SELECT 
  id,
  email,
  role,
  token,
  organization_id,
  invited_by,
  accepted_at,
  expires_at,
  created_at,
  CASE 
    WHEN expires_at > NOW() THEN 'Valid'
    ELSE 'Expired'
  END as status
FROM invitations
WHERE accepted_at IS NULL
ORDER BY created_at DESC;

-- Debug: Check what email the current user is logged in with
-- (Run this after checking auth.users or profiles table)
