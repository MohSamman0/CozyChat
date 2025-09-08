-- Function to set session context for RLS policies
CREATE OR REPLACE FUNCTION set_session_context(session_id TEXT)
RETURNS VOID AS $$
BEGIN
  -- Set the session context that RLS policies can use
  PERFORM set_config('app.current_user_session_id', session_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_session_context(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_session_context(TEXT) TO anon;
