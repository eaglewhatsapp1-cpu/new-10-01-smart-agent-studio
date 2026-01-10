-- Fix: Restrict marketplace_ratings to authenticated users only
-- This addresses the PUBLIC_DATA_EXPOSURE security issue

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Ratings are viewable by everyone" ON marketplace_ratings;

-- Create a new policy that requires authentication
CREATE POLICY "Authenticated users can view ratings" ON marketplace_ratings
  FOR SELECT
  TO authenticated
  USING (true);