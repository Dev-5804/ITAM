-- Get the user IDs first
SELECT id, email, full_name FROM profiles ORDER BY created_at DESC LIMIT 5;

-- After you identify which ID is the member account, run this:
-- Replace MEMBER_USER_ID with the actual UUID of your member account

-- INSERT INTO memberships (organization_id, user_id, role)
-- VALUES (
--   'c9255e9b-f20b-43ef-a821-7e082e37f3c1',
--   'MEMBER_USER_ID',  -- Replace with the member's user ID
--   'MEMBER'
-- );

-- Verify the membership was created
SELECT 
  m.id,
  m.role,
  p.email,
  o.name as org_name
FROM memberships m
JOIN profiles p ON p.id = m.user_id
JOIN organizations o ON o.id = m.organization_id
WHERE m.organization_id = 'c9255e9b-f20b-43ef-a821-7e082e37f3c1'
  AND m.deleted_at IS NULL;
