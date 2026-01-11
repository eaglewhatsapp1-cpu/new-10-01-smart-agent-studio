-- Update knowledge_folders that have workspace_id = NULL to use the user's default workspace
-- First, find the workspace for each user and update their folders
UPDATE public.knowledge_folders kf
SET workspace_id = (
  SELECT w.id FROM public.workspaces w 
  WHERE w.created_by = kf.created_by 
  ORDER BY w.created_at ASC 
  LIMIT 1
)
WHERE kf.workspace_id IS NULL 
AND kf.created_by IS NOT NULL;