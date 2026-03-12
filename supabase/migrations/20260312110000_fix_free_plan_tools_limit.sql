-- Fix free plan max_tools: the default was incorrectly set to 3.
-- Restore it to 10 and correct any tenant rows that are currently at 3.
UPDATE public.tenants
  SET max_tools = 10
  WHERE plan = 'free' AND max_tools = 3;

ALTER TABLE public.tenants ALTER COLUMN max_tools SET DEFAULT 10;
