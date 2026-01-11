-- Drop the existing INSERT policy for knowledge_chunks
DROP POLICY IF EXISTS "Users can create workspace chunks" ON public.knowledge_chunks;

-- Create a new INSERT policy that handles both workspace-based and user-created folders
CREATE POLICY "Users can create workspace chunks" 
ON public.knowledge_chunks 
FOR INSERT 
WITH CHECK (
  -- Allow insert if folder belongs to a workspace the user has access to
  (folder_id IN (
    SELECT knowledge_folders.id
    FROM knowledge_folders
    WHERE knowledge_folders.workspace_id IN (
      SELECT workspaces.id FROM workspaces WHERE workspaces.created_by = auth.uid()
      UNION
      SELECT team_members.workspace_id FROM team_members 
      WHERE team_members.user_id = auth.uid() 
      AND team_members.role = ANY (ARRAY['owner', 'admin', 'editor'])
    )
  ))
  -- Allow insert if folder was created by the user (for folders without workspace_id)
  OR (folder_id IN (
    SELECT knowledge_folders.id
    FROM knowledge_folders
    WHERE knowledge_folders.workspace_id IS NULL 
    AND knowledge_folders.created_by = auth.uid()
  ))
  -- Allow insert if folder_id is NULL
  OR (folder_id IS NULL)
);