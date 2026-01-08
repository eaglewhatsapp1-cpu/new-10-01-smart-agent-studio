-- Phase 1: Advanced AI Features Tables

-- Agent Tools Registry for Agentic RAG
CREATE TABLE public.agent_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  tool_type TEXT NOT NULL CHECK (tool_type IN ('search', 'web', 'calculate', 'summarize', 'compare', 'analyze')),
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent Reasoning Logs for ReAct Pattern transparency
CREATE TABLE public.agent_reasoning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('thought', 'action', 'observation', 'answer')),
  content TEXT NOT NULL,
  tool_name TEXT,
  tool_input JSONB,
  tool_output JSONB,
  confidence REAL,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent Memory for Long-term Learning
CREATE TABLE public.agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.ai_profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('preference', 'fact', 'correction_pattern', 'topic_interest', 'communication_style')),
  memory_key TEXT NOT NULL,
  memory_value JSONB NOT NULL,
  confidence REAL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  importance REAL DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
  last_accessed TIMESTAMPTZ DEFAULT now(),
  access_count INTEGER DEFAULT 1,
  source_conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, agent_id, memory_key)
);

-- Knowledge Summaries for RAPTOR-style Hierarchical Retrieval
CREATE TABLE public.knowledge_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES public.knowledge_folders(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 0 AND level <= 3),
  parent_summary_id UUID REFERENCES public.knowledge_summaries(id) ON DELETE SET NULL,
  title TEXT,
  content TEXT NOT NULL,
  source_chunks UUID[] DEFAULT '{}',
  child_summaries UUID[] DEFAULT '{}',
  key_concepts TEXT[] DEFAULT '{}',
  entity_mentions JSONB DEFAULT '[]',
  embedding TEXT,
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RAG Strategy Metrics for Adaptive Retrieval
CREATE TABLE public.rag_strategy_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  strategy_name TEXT NOT NULL,
  query_complexity TEXT CHECK (query_complexity IN ('simple', 'moderate', 'complex', 'conversational')),
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  total_queries INTEGER DEFAULT 0,
  positive_feedback INTEGER DEFAULT 0,
  negative_feedback INTEGER DEFAULT 0,
  avg_latency_ms REAL,
  avg_confidence REAL,
  last_used TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, strategy_name, query_complexity)
);

-- Query Complexity Analysis Cache
CREATE TABLE public.query_complexity_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL UNIQUE,
  original_query TEXT NOT NULL,
  complexity TEXT NOT NULL CHECK (complexity IN ('simple', 'moderate', 'complex', 'conversational')),
  recommended_strategy TEXT NOT NULL,
  analysis_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_reasoning_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_strategy_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_complexity_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_tools
CREATE POLICY "Users can view tools in their workspace"
ON public.agent_tools FOR SELECT
USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id));

CREATE POLICY "Admins can manage tools in their workspace"
ON public.agent_tools FOR ALL
USING (workspace_id IS NOT NULL AND public.is_workspace_admin(workspace_id));

-- RLS Policies for agent_reasoning_logs
CREATE POLICY "Users can view reasoning logs for their conversations"
ON public.agent_reasoning_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = conversation_id
    AND public.is_workspace_member(c.workspace_id)
  )
);

CREATE POLICY "System can insert reasoning logs"
ON public.agent_reasoning_logs FOR INSERT
WITH CHECK (true);

-- RLS Policies for agent_memory
CREATE POLICY "Users can view their own memory"
ON public.agent_memory FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own memory"
ON public.agent_memory FOR ALL
USING (user_id = auth.uid());

-- RLS Policies for knowledge_summaries
CREATE POLICY "Users can view summaries in their workspace"
ON public.knowledge_summaries FOR SELECT
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "System can manage summaries"
ON public.knowledge_summaries FOR ALL
USING (true);

-- RLS Policies for rag_strategy_metrics
CREATE POLICY "Users can view metrics in their workspace"
ON public.rag_strategy_metrics FOR SELECT
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "System can manage metrics"
ON public.rag_strategy_metrics FOR ALL
USING (true);

-- RLS Policies for query_complexity_cache
CREATE POLICY "Anyone can read complexity cache"
ON public.query_complexity_cache FOR SELECT
USING (true);

CREATE POLICY "System can manage complexity cache"
ON public.query_complexity_cache FOR INSERT
WITH CHECK (true);

-- Insert default global tools
INSERT INTO public.agent_tools (name, display_name, description, tool_type, config) VALUES
('knowledge_search', 'Knowledge Search', 'Search the knowledge base for relevant information using semantic similarity', 'search', '{"max_results": 10, "min_similarity": 0.7}'),
('web_search', 'Web Search', 'Search the web for current information not in the knowledge base', 'web', '{"max_results": 5}'),
('calculator', 'Calculator', 'Perform mathematical calculations and unit conversions', 'calculate', '{}'),
('summarizer', 'Summarizer', 'Generate concise summaries of long documents or multiple sources', 'summarize', '{"max_length": 500}'),
('comparator', 'Document Comparator', 'Compare and contrast information from multiple documents', 'compare', '{"max_documents": 5}'),
('analyzer', 'Deep Analyzer', 'Perform in-depth analysis of complex topics with multi-step reasoning', 'analyze', '{"max_steps": 5}');

-- Create indices for performance
CREATE INDEX idx_agent_reasoning_conversation ON public.agent_reasoning_logs(conversation_id);
CREATE INDEX idx_agent_reasoning_message ON public.agent_reasoning_logs(message_id);
CREATE INDEX idx_agent_memory_user ON public.agent_memory(user_id);
CREATE INDEX idx_agent_memory_agent ON public.agent_memory(agent_id);
CREATE INDEX idx_agent_memory_type ON public.agent_memory(memory_type);
CREATE INDEX idx_knowledge_summaries_folder ON public.knowledge_summaries(folder_id);
CREATE INDEX idx_knowledge_summaries_level ON public.knowledge_summaries(level);
CREATE INDEX idx_rag_strategy_metrics_strategy ON public.rag_strategy_metrics(strategy_name);
CREATE INDEX idx_query_complexity_hash ON public.query_complexity_cache(query_hash);

-- Trigger for updating timestamps
CREATE TRIGGER update_agent_tools_updated_at
BEFORE UPDATE ON public.agent_tools
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_memory_updated_at
BEFORE UPDATE ON public.agent_memory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_summaries_updated_at
BEFORE UPDATE ON public.knowledge_summaries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rag_strategy_metrics_updated_at
BEFORE UPDATE ON public.rag_strategy_metrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();