    -- Verify membership was created successfully
    -- Run this in Supabase SQL Editor

    SELECT 
    m.id,
    m.role,
    o.name as organization_name,
    p.email as user_email,
    m.created_at
    FROM memberships m
    JOIN organizations o ON o.id = m.organization_id
    JOIN profiles p ON p.id = m.user_id
    WHERE m.deleted_at IS NULL
    AND o.id = 'c9255e9b-f20b-43ef-a821-7e082e37f3c1'
    ORDER BY m.created_at DESC;
