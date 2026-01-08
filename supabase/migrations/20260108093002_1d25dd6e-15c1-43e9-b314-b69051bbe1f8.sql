
-- =====================================================
-- FIX ALL REMAINING RLS SECURITY ISSUES
-- =====================================================

-- =====================================================
-- 1. FIX: agent_reasoning_logs
-- =====================================================
DROP POLICY IF EXISTS "System can insert reasoning logs" ON public.agent_reasoning_logs;

CREATE POLICY "Authenticated users can insert reasoning logs" 
ON public.agent_reasoning_logs 
FOR INSERT 
TO authenticated
WITH CHECK (
  conversation_id IS NULL OR
  conversation_id IN (
    SELECT id FROM chat_conversations 
    WHERE is_workspace_member(workspace_id)
  )
);

-- =====================================================
-- 2. FIX: knowledge_summaries
-- =====================================================
DROP POLICY IF EXISTS "System can manage summaries" ON public.knowledge_summaries;

CREATE POLICY "Authenticated users can manage summaries" 
ON public.knowledge_summaries 
FOR ALL 
TO authenticated
USING (
  workspace_id IS NULL OR is_workspace_member(workspace_id)
)
WITH CHECK (
  workspace_id IS NULL OR is_workspace_member(workspace_id)
);

-- =====================================================
-- 3. FIX: query_complexity_cache
-- =====================================================
DROP POLICY IF EXISTS "Anyone can read complexity cache" ON public.query_complexity_cache;
DROP POLICY IF EXISTS "System can manage complexity cache" ON public.query_complexity_cache;

CREATE POLICY "Authenticated can read complexity cache" 
ON public.query_complexity_cache 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert complexity cache" 
ON public.query_complexity_cache 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 4. FIX: rag_chunk_corrections
-- =====================================================
DROP POLICY IF EXISTS "Users can create corrections" ON public.rag_chunk_corrections;
DROP POLICY IF EXISTS "Users can view corrections" ON public.rag_chunk_corrections;
DROP POLICY IF EXISTS "Users can update corrections" ON public.rag_chunk_corrections;

CREATE POLICY "View corrections for accessible chunks" 
ON public.rag_chunk_corrections 
FOR SELECT 
TO authenticated
USING (
  corrected_by = auth.uid() OR
  chunk_id IN (
    SELECT kc.id FROM knowledge_chunks kc
    LEFT JOIN knowledge_folders kf ON kc.folder_id = kf.id
    WHERE kf.workspace_id IS NULL OR is_workspace_member(kf.workspace_id)
  )
);

CREATE POLICY "Create corrections for accessible chunks" 
ON public.rag_chunk_corrections 
FOR INSERT 
TO authenticated
WITH CHECK (
  corrected_by = auth.uid()
);

CREATE POLICY "Update own corrections" 
ON public.rag_chunk_corrections 
FOR UPDATE 
TO authenticated
USING (corrected_by = auth.uid());

-- =====================================================
-- 5. FIX: rag_citations
-- =====================================================
DROP POLICY IF EXISTS "Users can create citations" ON public.rag_citations;
DROP POLICY IF EXISTS "Users can view citations" ON public.rag_citations;

CREATE POLICY "View citations in accessible conversations" 
ON public.rag_citations 
FOR SELECT 
TO authenticated
USING (
  conversation_id IS NULL OR
  conversation_id IN (
    SELECT id FROM chat_conversations 
    WHERE workspace_id IS NULL OR is_workspace_member(workspace_id)
  )
);

CREATE POLICY "Create citations in accessible conversations" 
ON public.rag_citations 
FOR INSERT 
TO authenticated
WITH CHECK (
  conversation_id IS NULL OR
  conversation_id IN (
    SELECT id FROM chat_conversations 
    WHERE workspace_id IS NULL OR is_workspace_member(workspace_id)
  )
);

-- =====================================================
-- 6. FIX: rag_feedback
-- =====================================================
DROP POLICY IF EXISTS "Users can create feedback" ON public.rag_feedback;
DROP POLICY IF EXISTS "Users can view feedback" ON public.rag_feedback;
DROP POLICY IF EXISTS "Users can update their feedback" ON public.rag_feedback;

CREATE POLICY "View own feedback or workspace feedback" 
ON public.rag_feedback 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() OR
  conversation_id IN (
    SELECT id FROM chat_conversations 
    WHERE workspace_id IS NULL OR is_workspace_member(workspace_id)
  )
);

CREATE POLICY "Create own feedback" 
ON public.rag_feedback 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Update own feedback" 
ON public.rag_feedback 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

-- =====================================================
-- 7. FIX: rag_knowledge_graph
-- =====================================================
DROP POLICY IF EXISTS "Users can create knowledge graph entries" ON public.rag_knowledge_graph;
DROP POLICY IF EXISTS "Users can view knowledge graph" ON public.rag_knowledge_graph;
DROP POLICY IF EXISTS "Users can update knowledge graph" ON public.rag_knowledge_graph;
DROP POLICY IF EXISTS "Users can delete knowledge graph" ON public.rag_knowledge_graph;

CREATE POLICY "View knowledge graph for accessible chunks" 
ON public.rag_knowledge_graph 
FOR SELECT 
TO authenticated
USING (
  chunk_id IS NULL OR
  chunk_id IN (
    SELECT kc.id FROM knowledge_chunks kc
    LEFT JOIN knowledge_folders kf ON kc.folder_id = kf.id
    WHERE kf.workspace_id IS NULL OR is_workspace_member(kf.workspace_id)
  )
);

CREATE POLICY "Create knowledge graph for accessible chunks" 
ON public.rag_knowledge_graph 
FOR INSERT 
TO authenticated
WITH CHECK (
  chunk_id IS NULL OR
  chunk_id IN (
    SELECT kc.id FROM knowledge_chunks kc
    LEFT JOIN knowledge_folders kf ON kc.folder_id = kf.id
    WHERE kf.workspace_id IS NULL OR is_workspace_member(kf.workspace_id)
  )
);

CREATE POLICY "Update knowledge graph for admin chunks" 
ON public.rag_knowledge_graph 
FOR UPDATE 
TO authenticated
USING (
  chunk_id IS NULL OR
  chunk_id IN (
    SELECT kc.id FROM knowledge_chunks kc
    LEFT JOIN knowledge_folders kf ON kc.folder_id = kf.id
    WHERE kf.workspace_id IS NULL OR is_workspace_admin(kf.workspace_id)
  )
);

CREATE POLICY "Delete knowledge graph for admin chunks" 
ON public.rag_knowledge_graph 
FOR DELETE 
TO authenticated
USING (
  chunk_id IS NULL OR
  chunk_id IN (
    SELECT kc.id FROM knowledge_chunks kc
    LEFT JOIN knowledge_folders kf ON kc.folder_id = kf.id
    WHERE kf.workspace_id IS NULL OR is_workspace_admin(kf.workspace_id)
  )
);

-- =====================================================
-- 8. FIX: rag_pipeline_configs
-- =====================================================
DROP POLICY IF EXISTS "Users can create pipeline configs" ON public.rag_pipeline_configs;
DROP POLICY IF EXISTS "Users can view pipeline configs" ON public.rag_pipeline_configs;
DROP POLICY IF EXISTS "Users can update pipeline configs" ON public.rag_pipeline_configs;
DROP POLICY IF EXISTS "Users can delete pipeline configs" ON public.rag_pipeline_configs;

CREATE POLICY "View pipeline configs for accessible agents" 
ON public.rag_pipeline_configs 
FOR SELECT 
TO authenticated
USING (
  agent_id IS NULL OR
  agent_id IN (
    SELECT id FROM ai_profiles 
    WHERE workspace_id IS NULL OR is_workspace_member(workspace_id)
  )
);

CREATE POLICY "Create pipeline configs for accessible agents" 
ON public.rag_pipeline_configs 
FOR INSERT 
TO authenticated
WITH CHECK (
  agent_id IS NULL OR
  agent_id IN (
    SELECT id FROM ai_profiles 
    WHERE workspace_id IS NULL OR is_workspace_member(workspace_id)
  )
);

CREATE POLICY "Update pipeline configs for accessible agents" 
ON public.rag_pipeline_configs 
FOR UPDATE 
TO authenticated
USING (
  agent_id IS NULL OR
  agent_id IN (
    SELECT id FROM ai_profiles 
    WHERE workspace_id IS NULL OR is_workspace_member(workspace_id)
  )
);

CREATE POLICY "Delete pipeline configs for admin agents" 
ON public.rag_pipeline_configs 
FOR DELETE 
TO authenticated
USING (
  agent_id IS NULL OR
  agent_id IN (
    SELECT id FROM ai_profiles 
    WHERE workspace_id IS NULL OR is_workspace_admin(workspace_id)
  )
);

-- =====================================================
-- 9. FIX: rag_query_expansions
-- =====================================================
DROP POLICY IF EXISTS "Users can create query expansions" ON public.rag_query_expansions;
DROP POLICY IF EXISTS "Users can view query expansions" ON public.rag_query_expansions;

CREATE POLICY "View query expansions" 
ON public.rag_query_expansions 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Create query expansions" 
ON public.rag_query_expansions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 10. FIX: rag_self_evaluation
-- =====================================================
DROP POLICY IF EXISTS "Users can create self evaluations" ON public.rag_self_evaluation;
DROP POLICY IF EXISTS "Users can view self evaluations" ON public.rag_self_evaluation;

CREATE POLICY "View self evaluations for accessible conversations" 
ON public.rag_self_evaluation 
FOR SELECT 
TO authenticated
USING (
  conversation_id IS NULL OR
  conversation_id IN (
    SELECT id FROM chat_conversations 
    WHERE workspace_id IS NULL OR is_workspace_member(workspace_id)
  )
);

CREATE POLICY "Create self evaluations for accessible conversations" 
ON public.rag_self_evaluation 
FOR INSERT 
TO authenticated
WITH CHECK (
  conversation_id IS NULL OR
  conversation_id IN (
    SELECT id FROM chat_conversations 
    WHERE workspace_id IS NULL OR is_workspace_member(workspace_id)
  )
);

-- =====================================================
-- 11. FIX: rag_strategy_metrics
-- =====================================================
DROP POLICY IF EXISTS "System can manage metrics" ON public.rag_strategy_metrics;
DROP POLICY IF EXISTS "Users can view metrics in their workspace" ON public.rag_strategy_metrics;

CREATE POLICY "Manage metrics in accessible workspace" 
ON public.rag_strategy_metrics 
FOR ALL 
TO authenticated
USING (
  workspace_id IS NULL OR is_workspace_member(workspace_id)
)
WITH CHECK (
  workspace_id IS NULL OR is_workspace_member(workspace_id)
);

-- =====================================================
-- 12. Update SECURITY DEFINER functions with NULL checks
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN false
    WHEN _workspace_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = _workspace_id AND created_by = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE workspace_id = _workspace_id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN false
    WHEN _workspace_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = _workspace_id AND created_by = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM team_members 
      WHERE workspace_id = _workspace_id AND user_id = auth.uid()
    )
  END
$$;
