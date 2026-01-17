-- Test MEMBER role restrictions
-- Run this in your Supabase SQL Editor

-- 1. Check your current role
SELECT m.role, o.name as org_name, p.email
FROM memberships m
JOIN organizations o ON o.id = m.organization_id
JOIN profiles p ON p.id = m.user_id
WHERE m.deleted_at IS NULL;

-- 2. Temporarily change your role to MEMBER (replace with your user_id)
-- UPDATE memberships 
-- SET role = 'MEMBER' 
-- WHERE user_id = 'YOUR_USER_ID' 
-- AND organization_id = 'c9255e9b-f20b-43ef-a821-7e082e37f3c1';

-- 3. After testing, restore to OWNER
-- UPDATE memberships 
-- SET role = 'OWNER' 
-- WHERE user_id = 'YOUR_USER_ID' 
-- AND organization_id = 'c9255e9b-f20b-43ef-a821-7e082e37f3c1';
