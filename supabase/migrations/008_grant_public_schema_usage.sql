-- Grant USAGE on public schema to anon and authenticated roles
-- This is necessary for client-side functions that interact with the database

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
