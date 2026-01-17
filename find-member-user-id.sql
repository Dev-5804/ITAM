-- See all users and their memberships (if any)
SELECT 
  p.id as user_id,
  p.email,
  p.full_name,
  m.role as role_in_org,
  CASE WHEN m.id IS NULL THEN 'NO MEMBERSHIP' ELSE 'HAS MEMBERSHIP' END as membership_status,
  p.created_at
FROM profiles p
LEFT JOIN memberships m ON m.user_id = p.id 
  AND m.organization_id = 'c9255e9b-f20b-43ef-a821-7e082e37f3c1'
  AND m.deleted_at IS NULL
ORDER BY p.created_at DESC
LIMIT 5;

-- Copy the user_id from the row where email matches your member account
-- Then paste it below and uncomment:

-- INSERT INTO memberships (organization_id, user_id, role)
-- VALUES (
--   'c9255e9b-f20b-43ef-a821-7e082e37f3c1',
--   'PASTE_USER_ID_HERE',
--   'MEMBER'
-- );
