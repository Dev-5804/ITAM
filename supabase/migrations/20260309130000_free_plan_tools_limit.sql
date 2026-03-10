-- Change free plan tool limit from 10 to 3
UPDATE tenants SET max_tools = 10 WHERE plan = 'free' AND max_tools = 3;

-- Also update the column default for new tenants
ALTER TABLE tenants ALTER COLUMN max_tools SET DEFAULT 3;
