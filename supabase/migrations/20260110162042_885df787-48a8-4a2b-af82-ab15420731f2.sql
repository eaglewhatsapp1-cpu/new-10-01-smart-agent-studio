-- Fix INFO_LEAKAGE: Add user_id to query_complexity_cache and restrict access
-- This prevents cross-user information leakage of query patterns

-- Add user_id column to track who created each cache entry
ALTER TABLE query_complexity_cache ADD COLUMN IF NOT EXISTS user_id UUID;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated can read complexity cache" ON query_complexity_cache;
DROP POLICY IF EXISTS "Authenticated can insert cache" ON query_complexity_cache;

-- Create user-scoped policies
CREATE POLICY "Users can read their own cache entries" ON query_complexity_cache
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own cache entries" ON query_complexity_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Note: Existing entries without user_id will not be accessible
-- This is acceptable as cache entries are temporary optimization data