-- Get invitation token from database
-- Run this in Supabase SQL Editor

SELECT 
  i.token,
  i.email,
  i.role,
  i.expires_at,
  o.name as organization_name,
  p.email as invited_by_email
FROM invitations i
JOIN organizations o ON o.id = i.organization_id
JOIN profiles p ON p.id = i.invited_by
WHERE i.accepted_at IS NULL
  AND i.organization_id = 'c9255e9b-f20b-43ef-a821-7e082e37f3c1'
ORDER BY i.created_at DESC;
