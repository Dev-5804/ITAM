-- Check current invitations
SELECT 
  i.id,
  i.token,
  i.email,
  i.role,
  i.accepted_at,
  i.expires_at,
  CASE 
    WHEN i.accepted_at IS NOT NULL THEN 'Already Accepted'
    WHEN i.expires_at < NOW() THEN 'Expired'
    ELSE 'Valid'
  END as status
FROM invitations i
WHERE i.organization_id = 'c9255e9b-f20b-43ef-a821-7e082e37f3c1'
ORDER BY i.created_at DESC;

-- Delete the old invitation and create a fresh one
-- First, get your user ID (run this separately)
SELECT id, email FROM profiles ORDER BY created_at DESC LIMIT 5;

-- Then create a new invitation manually (replace YOUR_USER_ID with the owner's ID)
-- DELETE FROM invitations WHERE organization_id = 'c9255e9b-f20b-43ef-a821-7e082e37f3c1';
-- 
-- INSERT INTO invitations (organization_id, email, role, invited_by, token, expires_at)
-- VALUES (
--   'c9255e9b-f20b-43ef-a821-7e082e37f3c1',
--   'member@test.com',  -- Change this to your member email
--   'MEMBER',
--   'YOUR_USER_ID',  -- Your owner user ID
--   encode(gen_random_bytes(32), 'hex'),
--   NOW() + INTERVAL '7 days'
-- )
-- RETURNING token;
