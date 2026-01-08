CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: core_model; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.core_model AS ENUM (
    'core_analyst',
    'core_reviewer',
    'core_synthesizer'
);


--
-- Name: creativity_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.creativity_level AS ENUM (
    'none',
    'very_low',
    'low',
    'medium',
    'high'
);


--
-- Name: get_folder_descendants(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_folder_descendants(folder_ids uuid[]) RETURNS uuid[]
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  result UUID[];
  current_level UUID[];
  next_level UUID[];
BEGIN
  result := folder_ids;
  current_level := folder_ids;
  
  LOOP
    SELECT ARRAY_AGG(id) INTO next_level
    FROM knowledge_folders
    WHERE parent_id = ANY(current_level);
    
    EXIT WHEN next_level IS NULL OR ARRAY_LENGTH(next_level, 1) IS NULL;
    
    result := result || next_level;
    current_level := next_level;
  END LOOP;
  
  RETURN result;
END;
$$;


--
-- Name: increment_download_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_download_count() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.marketplace_items
  SET download_count = download_count + 1
  WHERE id = NEW.marketplace_item_id;
  RETURN NEW;
END;
$$;


--
-- Name: is_workspace_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_workspace_admin(_workspace_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspaces WHERE id = _workspace_id AND created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM team_members 
    WHERE workspace_id = _workspace_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
$$;


--
-- Name: is_workspace_member(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_workspace_member(_workspace_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspaces WHERE id = _workspace_id AND created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM team_members WHERE workspace_id = _workspace_id AND user_id = auth.uid()
  )
$$;


--
-- Name: update_marketplace_rating(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_marketplace_rating() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.marketplace_items
  SET 
    rating = (SELECT AVG(rating)::NUMERIC(2,1) FROM public.marketplace_ratings WHERE marketplace_item_id = COALESCE(NEW.marketplace_item_id, OLD.marketplace_item_id)),
    rating_count = (SELECT COUNT(*) FROM public.marketplace_ratings WHERE marketplace_item_id = COALESCE(NEW.marketplace_item_id, OLD.marketplace_item_id))
  WHERE id = COALESCE(NEW.marketplace_item_id, OLD.marketplace_item_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: activity_feed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_feed (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid,
    user_id uuid,
    action_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    entity_name text,
    description text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_workflows (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    canvas_data jsonb DEFAULT '{}'::jsonb,
    handoff_rules jsonb DEFAULT '[]'::jsonb,
    execution_mode text DEFAULT 'sequential'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    workspace_id uuid,
    CONSTRAINT agent_workflows_execution_mode_check CHECK ((execution_mode = ANY (ARRAY['sequential'::text, 'parallel'::text])))
);


--
-- Name: ai_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_profiles (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    display_name text NOT NULL,
    user_defined_name text DEFAULT 'New Agent'::text,
    core_model public.core_model DEFAULT 'core_analyst'::public.core_model NOT NULL,
    persona text,
    role_description text,
    intro_sentence text,
    rag_policy jsonb DEFAULT '{"creativity_level": "very_low", "knowledge_base_ratio": 0.9, "web_verification_ratio": 0.1, "hallucination_tolerance": "very_low"}'::jsonb,
    allowed_folders uuid[] DEFAULT '{}'::uuid[],
    chunk_priority text[] DEFAULT '{high}'::text[],
    response_rules jsonb DEFAULT '{"step_by_step": true, "cite_if_possible": true, "refuse_if_uncertain": true}'::jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    active_from time without time zone,
    active_until time without time zone,
    active_days integer[] DEFAULT ARRAY[0, 1, 2, 3, 4, 5, 6],
    workspace_id uuid,
    api_key_id uuid
);


--
-- Name: chat_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid,
    agent_id uuid,
    title text DEFAULT 'New Chat'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid,
    role text NOT NULL,
    content text NOT NULL,
    tokens_used integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


--
-- Name: exported_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exported_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    multi_agent_config_id uuid NOT NULL,
    config_data jsonb NOT NULL,
    version integer DEFAULT 1,
    exported_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: knowledge_chunks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_chunks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    folder_id uuid,
    source_file text NOT NULL,
    content text NOT NULL,
    embedding public.vector(1536),
    created_at timestamp with time zone DEFAULT now(),
    chunk_index integer DEFAULT 0,
    total_chunks integer DEFAULT 1,
    document_summary text,
    document_context text,
    chunk_type text DEFAULT 'content'::text,
    semantic_tags text[] DEFAULT '{}'::text[],
    entities jsonb DEFAULT '[]'::jsonb,
    key_concepts text[] DEFAULT '{}'::text[],
    quality_score numeric DEFAULT 0.0,
    token_count integer DEFAULT 0,
    parent_chunk_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: knowledge_folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_folders (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    parent_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    workspace_id uuid,
    folder_type text DEFAULT 'general'::text
);


--
-- Name: marketplace_imports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_imports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    marketplace_item_id uuid NOT NULL,
    imported_by uuid NOT NULL,
    workspace_id uuid NOT NULL,
    imported_config_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marketplace_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    item_type text NOT NULL,
    config_data jsonb NOT NULL,
    canvas_data jsonb,
    agent_count integer DEFAULT 1,
    tags text[],
    category text,
    publisher_id uuid NOT NULL,
    publisher_workspace_id uuid NOT NULL,
    source_config_id uuid,
    is_public boolean DEFAULT true,
    download_count integer DEFAULT 0,
    rating numeric(2,1) DEFAULT 0,
    rating_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT marketplace_items_item_type_check CHECK ((item_type = ANY (ARRAY['single_agent'::text, 'multi_agent'::text])))
);


--
-- Name: marketplace_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    marketplace_item_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    review text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT marketplace_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: multi_agent_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.multi_agent_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    workspace_id uuid NOT NULL,
    canvas_data jsonb DEFAULT '{}'::jsonb,
    agent_nodes jsonb DEFAULT '[]'::jsonb,
    connections jsonb DEFAULT '[]'::jsonb,
    input_folder_id uuid,
    output_folder_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rag_chunk_corrections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rag_chunk_corrections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chunk_id uuid,
    original_content text NOT NULL,
    corrected_content text NOT NULL,
    correction_type text,
    correction_reason text,
    corrected_by uuid,
    approved boolean DEFAULT false,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rag_chunk_corrections_correction_type_check CHECK ((correction_type = ANY (ARRAY['factual'::text, 'clarity'::text, 'completeness'::text, 'outdated'::text, 'merge'::text, 'split'::text])))
);


--
-- Name: rag_citations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rag_citations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid,
    message_id uuid,
    chunk_id uuid,
    citation_text text NOT NULL,
    source_file text,
    source_location text,
    confidence_score numeric DEFAULT 0.0,
    verified boolean DEFAULT false,
    verification_method text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rag_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rag_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid,
    message_id uuid,
    chunk_id uuid,
    feedback_type text NOT NULL,
    rating integer,
    is_relevant boolean,
    user_correction text,
    correct_answer text,
    missing_sources text[],
    feedback_text text,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rag_feedback_feedback_type_check CHECK ((feedback_type = ANY (ARRAY['relevance'::text, 'accuracy'::text, 'helpfulness'::text, 'correction'::text, 'missing_info'::text]))),
    CONSTRAINT rag_feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: rag_knowledge_graph; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rag_knowledge_graph (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_entity text NOT NULL,
    source_type text,
    relationship text NOT NULL,
    target_entity text NOT NULL,
    target_type text,
    chunk_id uuid,
    confidence numeric DEFAULT 1.0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rag_pipeline_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rag_pipeline_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid,
    config_name text NOT NULL,
    retrieval_strategy text DEFAULT 'hybrid'::text,
    chunk_size integer DEFAULT 1000,
    chunk_overlap integer DEFAULT 200,
    top_k integer DEFAULT 5,
    rerank_top_n integer DEFAULT 3,
    use_query_expansion boolean DEFAULT true,
    use_hyde boolean DEFAULT true,
    use_reranking boolean DEFAULT true,
    use_multi_hop boolean DEFAULT false,
    max_hop_depth integer DEFAULT 2,
    confidence_threshold numeric DEFAULT 0.7,
    hallucination_check boolean DEFAULT true,
    cite_sources boolean DEFAULT true,
    self_rag_enabled boolean DEFAULT true,
    corrective_rag_enabled boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rag_query_expansions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rag_query_expansions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_query text NOT NULL,
    expanded_queries text[] DEFAULT '{}'::text[],
    hypothetical_answers text[] DEFAULT '{}'::text[],
    decomposed_subqueries jsonb DEFAULT '[]'::jsonb,
    query_intent text,
    detected_entities jsonb DEFAULT '[]'::jsonb,
    expansion_method text DEFAULT 'llm'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rag_retrieval_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rag_retrieval_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid,
    query text NOT NULL,
    expanded_query text,
    query_embedding text,
    retrieval_strategy text DEFAULT 'hybrid'::text,
    chunks_retrieved jsonb DEFAULT '[]'::jsonb,
    reranked_chunks jsonb DEFAULT '[]'::jsonb,
    relevance_scores jsonb DEFAULT '{}'::jsonb,
    search_latency_ms integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rag_self_evaluation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rag_self_evaluation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid,
    query text NOT NULL,
    initial_response text,
    retrieval_decision text,
    relevance_check jsonb DEFAULT '{}'::jsonb,
    support_check jsonb DEFAULT '{}'::jsonb,
    utility_check jsonb DEFAULT '{}'::jsonb,
    hallucination_detected boolean DEFAULT false,
    hallucination_details jsonb DEFAULT '{}'::jsonb,
    final_response text,
    refinement_iterations integer DEFAULT 0,
    confidence_score numeric DEFAULT 0.0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rag_self_evaluation_retrieval_decision_check CHECK ((retrieval_decision = ANY (ARRAY['retrieve'::text, 'no_retrieve'::text, 'retrieve_more'::text])))
);


--
-- Name: scheduled_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid,
    workspace_id uuid,
    name text NOT NULL,
    cron_expression text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid,
    user_id uuid,
    email text NOT NULL,
    role text DEFAULT 'viewer'::text NOT NULL,
    invited_by uuid,
    invited_at timestamp with time zone DEFAULT now() NOT NULL,
    accepted_at timestamp with time zone,
    CONSTRAINT team_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text, 'viewer'::text])))
);


--
-- Name: usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    agent_id uuid,
    user_id uuid,
    query text,
    response_time_ms integer,
    tokens_used integer,
    folders_accessed uuid[],
    created_at timestamp with time zone DEFAULT now(),
    workspace_id uuid
);


--
-- Name: workflow_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid,
    workspace_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    trigger_type text DEFAULT 'manual'::text NOT NULL,
    input_data jsonb,
    output_data jsonb,
    error_message text,
    execution_logs jsonb DEFAULT '[]'::jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workflow_runs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]))),
    CONSTRAINT workflow_runs_trigger_type_check CHECK ((trigger_type = ANY (ARRAY['manual'::text, 'scheduled'::text, 'webhook'::text])))
);


--
-- Name: workspace_api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    provider text NOT NULL,
    api_key_encrypted text NOT NULL,
    display_name text,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workspaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_feed activity_feed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_feed
    ADD CONSTRAINT activity_feed_pkey PRIMARY KEY (id);


--
-- Name: agent_workflows agent_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_workflows
    ADD CONSTRAINT agent_workflows_pkey PRIMARY KEY (id);


--
-- Name: ai_profiles ai_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_profiles
    ADD CONSTRAINT ai_profiles_pkey PRIMARY KEY (id);


--
-- Name: chat_conversations chat_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: exported_configs exported_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exported_configs
    ADD CONSTRAINT exported_configs_pkey PRIMARY KEY (id);


--
-- Name: knowledge_chunks knowledge_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_chunks
    ADD CONSTRAINT knowledge_chunks_pkey PRIMARY KEY (id);


--
-- Name: knowledge_folders knowledge_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_folders
    ADD CONSTRAINT knowledge_folders_pkey PRIMARY KEY (id);


--
-- Name: marketplace_imports marketplace_imports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_imports
    ADD CONSTRAINT marketplace_imports_pkey PRIMARY KEY (id);


--
-- Name: marketplace_items marketplace_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_items
    ADD CONSTRAINT marketplace_items_pkey PRIMARY KEY (id);


--
-- Name: marketplace_ratings marketplace_ratings_marketplace_item_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_ratings
    ADD CONSTRAINT marketplace_ratings_marketplace_item_id_user_id_key UNIQUE (marketplace_item_id, user_id);


--
-- Name: marketplace_ratings marketplace_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_ratings
    ADD CONSTRAINT marketplace_ratings_pkey PRIMARY KEY (id);


--
-- Name: multi_agent_configs multi_agent_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multi_agent_configs
    ADD CONSTRAINT multi_agent_configs_pkey PRIMARY KEY (id);


--
-- Name: rag_chunk_corrections rag_chunk_corrections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_chunk_corrections
    ADD CONSTRAINT rag_chunk_corrections_pkey PRIMARY KEY (id);


--
-- Name: rag_citations rag_citations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_citations
    ADD CONSTRAINT rag_citations_pkey PRIMARY KEY (id);


--
-- Name: rag_feedback rag_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_feedback
    ADD CONSTRAINT rag_feedback_pkey PRIMARY KEY (id);


--
-- Name: rag_knowledge_graph rag_knowledge_graph_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_knowledge_graph
    ADD CONSTRAINT rag_knowledge_graph_pkey PRIMARY KEY (id);


--
-- Name: rag_pipeline_configs rag_pipeline_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_pipeline_configs
    ADD CONSTRAINT rag_pipeline_configs_pkey PRIMARY KEY (id);


--
-- Name: rag_query_expansions rag_query_expansions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_query_expansions
    ADD CONSTRAINT rag_query_expansions_pkey PRIMARY KEY (id);


--
-- Name: rag_retrieval_logs rag_retrieval_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_retrieval_logs
    ADD CONSTRAINT rag_retrieval_logs_pkey PRIMARY KEY (id);


--
-- Name: rag_self_evaluation rag_self_evaluation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_self_evaluation
    ADD CONSTRAINT rag_self_evaluation_pkey PRIMARY KEY (id);


--
-- Name: scheduled_jobs scheduled_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_jobs
    ADD CONSTRAINT scheduled_jobs_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_workspace_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_workspace_id_email_key UNIQUE (workspace_id, email);


--
-- Name: usage_logs usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT usage_logs_pkey PRIMARY KEY (id);


--
-- Name: workflow_runs workflow_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_runs
    ADD CONSTRAINT workflow_runs_pkey PRIMARY KEY (id);


--
-- Name: workspace_api_keys workspace_api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_api_keys
    ADD CONSTRAINT workspace_api_keys_pkey PRIMARY KEY (id);


--
-- Name: workspace_api_keys workspace_api_keys_workspace_id_provider_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_api_keys
    ADD CONSTRAINT workspace_api_keys_workspace_id_provider_key UNIQUE (workspace_id, provider);


--
-- Name: workspaces workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_feed_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_feed_created_at ON public.activity_feed USING btree (created_at DESC);


--
-- Name: idx_activity_feed_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_feed_workspace ON public.activity_feed USING btree (workspace_id);


--
-- Name: idx_agent_workflows_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_workflows_created_by ON public.agent_workflows USING btree (created_by);


--
-- Name: idx_ai_profiles_core_model; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_profiles_core_model ON public.ai_profiles USING btree (core_model);


--
-- Name: idx_ai_profiles_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_profiles_created_by ON public.ai_profiles USING btree (created_by);


--
-- Name: idx_chat_conversations_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_workspace ON public.chat_conversations USING btree (workspace_id);


--
-- Name: idx_chat_messages_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_conversation ON public.chat_messages USING btree (conversation_id);


--
-- Name: idx_knowledge_chunks_entities; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_chunks_entities ON public.knowledge_chunks USING gin (entities);


--
-- Name: idx_knowledge_chunks_folder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_chunks_folder ON public.knowledge_chunks USING btree (folder_id);


--
-- Name: idx_knowledge_chunks_key_concepts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_chunks_key_concepts ON public.knowledge_chunks USING gin (key_concepts);


--
-- Name: idx_knowledge_chunks_semantic_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_chunks_semantic_tags ON public.knowledge_chunks USING gin (semantic_tags);


--
-- Name: idx_knowledge_folders_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_folders_created_by ON public.knowledge_folders USING btree (created_by);


--
-- Name: idx_knowledge_folders_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_folders_parent ON public.knowledge_folders USING btree (parent_id);


--
-- Name: idx_marketplace_items_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_items_category ON public.marketplace_items USING btree (category);


--
-- Name: idx_marketplace_items_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_items_public ON public.marketplace_items USING btree (is_public);


--
-- Name: idx_marketplace_items_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_items_tags ON public.marketplace_items USING gin (tags);


--
-- Name: idx_marketplace_items_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_items_type ON public.marketplace_items USING btree (item_type);


--
-- Name: idx_rag_citations_chunk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rag_citations_chunk ON public.rag_citations USING btree (chunk_id);


--
-- Name: idx_rag_citations_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rag_citations_conversation ON public.rag_citations USING btree (conversation_id);


--
-- Name: idx_rag_feedback_chunk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rag_feedback_chunk ON public.rag_feedback USING btree (chunk_id);


--
-- Name: idx_rag_feedback_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rag_feedback_conversation ON public.rag_feedback USING btree (conversation_id);


--
-- Name: idx_rag_knowledge_graph_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rag_knowledge_graph_source ON public.rag_knowledge_graph USING btree (source_entity);


--
-- Name: idx_rag_knowledge_graph_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rag_knowledge_graph_target ON public.rag_knowledge_graph USING btree (target_entity);


--
-- Name: idx_rag_retrieval_logs_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rag_retrieval_logs_conversation ON public.rag_retrieval_logs USING btree (conversation_id);


--
-- Name: idx_rag_retrieval_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rag_retrieval_logs_created ON public.rag_retrieval_logs USING btree (created_at);


--
-- Name: idx_scheduled_jobs_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_jobs_workspace ON public.scheduled_jobs USING btree (workspace_id);


--
-- Name: idx_team_members_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_workspace ON public.team_members USING btree (workspace_id);


--
-- Name: idx_usage_logs_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_logs_agent ON public.usage_logs USING btree (agent_id);


--
-- Name: idx_usage_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_logs_created_at ON public.usage_logs USING btree (created_at);


--
-- Name: idx_usage_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_logs_user ON public.usage_logs USING btree (user_id);


--
-- Name: idx_workflow_runs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_runs_status ON public.workflow_runs USING btree (status);


--
-- Name: idx_workflow_runs_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_runs_workflow ON public.workflow_runs USING btree (workflow_id);


--
-- Name: idx_workflow_runs_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_runs_workspace ON public.workflow_runs USING btree (workspace_id);


--
-- Name: agent_workflows update_agent_workflows_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_workflows_updated_at BEFORE UPDATE ON public.agent_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_profiles update_ai_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_profiles_updated_at BEFORE UPDATE ON public.ai_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: knowledge_folders update_knowledge_folders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_knowledge_folders_updated_at BEFORE UPDATE ON public.knowledge_folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: marketplace_items update_marketplace_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_marketplace_items_updated_at BEFORE UPDATE ON public.marketplace_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: marketplace_ratings update_marketplace_rating_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_marketplace_rating_trigger AFTER INSERT OR DELETE OR UPDATE ON public.marketplace_ratings FOR EACH ROW EXECUTE FUNCTION public.update_marketplace_rating();


--
-- Name: multi_agent_configs update_multi_agent_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_multi_agent_configs_updated_at BEFORE UPDATE ON public.multi_agent_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workspace_api_keys update_workspace_api_keys_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workspace_api_keys_updated_at BEFORE UPDATE ON public.workspace_api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workspaces update_workspaces_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_feed activity_feed_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_feed
    ADD CONSTRAINT activity_feed_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: agent_workflows agent_workflows_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_workflows
    ADD CONSTRAINT agent_workflows_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: agent_workflows agent_workflows_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_workflows
    ADD CONSTRAINT agent_workflows_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: ai_profiles ai_profiles_api_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_profiles
    ADD CONSTRAINT ai_profiles_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.workspace_api_keys(id) ON DELETE SET NULL;


--
-- Name: ai_profiles ai_profiles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_profiles
    ADD CONSTRAINT ai_profiles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: ai_profiles ai_profiles_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_profiles
    ADD CONSTRAINT ai_profiles_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


--
-- Name: chat_conversations chat_conversations_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.ai_profiles(id) ON DELETE SET NULL;


--
-- Name: chat_conversations chat_conversations_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;


--
-- Name: exported_configs exported_configs_multi_agent_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exported_configs
    ADD CONSTRAINT exported_configs_multi_agent_config_id_fkey FOREIGN KEY (multi_agent_config_id) REFERENCES public.multi_agent_configs(id) ON DELETE CASCADE;


--
-- Name: knowledge_chunks knowledge_chunks_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_chunks
    ADD CONSTRAINT knowledge_chunks_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.knowledge_folders(id) ON DELETE CASCADE;


--
-- Name: knowledge_chunks knowledge_chunks_parent_chunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_chunks
    ADD CONSTRAINT knowledge_chunks_parent_chunk_id_fkey FOREIGN KEY (parent_chunk_id) REFERENCES public.knowledge_chunks(id);


--
-- Name: knowledge_folders knowledge_folders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_folders
    ADD CONSTRAINT knowledge_folders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: knowledge_folders knowledge_folders_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_folders
    ADD CONSTRAINT knowledge_folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.knowledge_folders(id) ON DELETE CASCADE;


--
-- Name: knowledge_folders knowledge_folders_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_folders
    ADD CONSTRAINT knowledge_folders_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: marketplace_imports marketplace_imports_marketplace_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_imports
    ADD CONSTRAINT marketplace_imports_marketplace_item_id_fkey FOREIGN KEY (marketplace_item_id) REFERENCES public.marketplace_items(id) ON DELETE CASCADE;


--
-- Name: marketplace_imports marketplace_imports_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_imports
    ADD CONSTRAINT marketplace_imports_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: marketplace_items marketplace_items_publisher_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_items
    ADD CONSTRAINT marketplace_items_publisher_workspace_id_fkey FOREIGN KEY (publisher_workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: marketplace_ratings marketplace_ratings_marketplace_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_ratings
    ADD CONSTRAINT marketplace_ratings_marketplace_item_id_fkey FOREIGN KEY (marketplace_item_id) REFERENCES public.marketplace_items(id) ON DELETE CASCADE;


--
-- Name: multi_agent_configs multi_agent_configs_input_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multi_agent_configs
    ADD CONSTRAINT multi_agent_configs_input_folder_id_fkey FOREIGN KEY (input_folder_id) REFERENCES public.knowledge_folders(id) ON DELETE SET NULL;


--
-- Name: multi_agent_configs multi_agent_configs_output_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multi_agent_configs
    ADD CONSTRAINT multi_agent_configs_output_folder_id_fkey FOREIGN KEY (output_folder_id) REFERENCES public.knowledge_folders(id) ON DELETE SET NULL;


--
-- Name: multi_agent_configs multi_agent_configs_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multi_agent_configs
    ADD CONSTRAINT multi_agent_configs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: rag_chunk_corrections rag_chunk_corrections_chunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_chunk_corrections
    ADD CONSTRAINT rag_chunk_corrections_chunk_id_fkey FOREIGN KEY (chunk_id) REFERENCES public.knowledge_chunks(id);


--
-- Name: rag_citations rag_citations_chunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_citations
    ADD CONSTRAINT rag_citations_chunk_id_fkey FOREIGN KEY (chunk_id) REFERENCES public.knowledge_chunks(id);


--
-- Name: rag_citations rag_citations_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_citations
    ADD CONSTRAINT rag_citations_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id);


--
-- Name: rag_feedback rag_feedback_chunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_feedback
    ADD CONSTRAINT rag_feedback_chunk_id_fkey FOREIGN KEY (chunk_id) REFERENCES public.knowledge_chunks(id);


--
-- Name: rag_feedback rag_feedback_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_feedback
    ADD CONSTRAINT rag_feedback_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id);


--
-- Name: rag_knowledge_graph rag_knowledge_graph_chunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_knowledge_graph
    ADD CONSTRAINT rag_knowledge_graph_chunk_id_fkey FOREIGN KEY (chunk_id) REFERENCES public.knowledge_chunks(id);


--
-- Name: rag_pipeline_configs rag_pipeline_configs_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_pipeline_configs
    ADD CONSTRAINT rag_pipeline_configs_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.ai_profiles(id);


--
-- Name: rag_retrieval_logs rag_retrieval_logs_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_retrieval_logs
    ADD CONSTRAINT rag_retrieval_logs_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id);


--
-- Name: rag_self_evaluation rag_self_evaluation_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_self_evaluation
    ADD CONSTRAINT rag_self_evaluation_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id);


--
-- Name: scheduled_jobs scheduled_jobs_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_jobs
    ADD CONSTRAINT scheduled_jobs_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.multi_agent_configs(id) ON DELETE CASCADE;


--
-- Name: scheduled_jobs scheduled_jobs_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_jobs
    ADD CONSTRAINT scheduled_jobs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: usage_logs usage_logs_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT usage_logs_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.ai_profiles(id) ON DELETE CASCADE;


--
-- Name: usage_logs usage_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: usage_logs usage_logs_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT usage_logs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


--
-- Name: workflow_runs workflow_runs_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_runs
    ADD CONSTRAINT workflow_runs_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.multi_agent_configs(id) ON DELETE CASCADE;


--
-- Name: workflow_runs workflow_runs_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_runs
    ADD CONSTRAINT workflow_runs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_api_keys workspace_api_keys_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_api_keys
    ADD CONSTRAINT workspace_api_keys_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: team_members Members can view accepted team members in their workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view accepted team members in their workspaces" ON public.team_members FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (public.is_workspace_member(workspace_id) AND (accepted_at IS NOT NULL)) OR public.is_workspace_admin(workspace_id)));


--
-- Name: marketplace_items Public marketplace items are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public marketplace items are viewable by everyone" ON public.marketplace_items FOR SELECT USING ((is_public = true));


--
-- Name: marketplace_ratings Ratings are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Ratings are viewable by everyone" ON public.marketplace_ratings FOR SELECT USING (true);


--
-- Name: activity_feed Users can create activity in their workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create activity in their workspaces" ON public.activity_feed FOR INSERT WITH CHECK ((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE (team_members.user_id = auth.uid()))));


--
-- Name: rag_citations Users can create citations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create citations" ON public.rag_citations FOR INSERT WITH CHECK (true);


--
-- Name: chat_conversations Users can create conversations in their workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create conversations in their workspaces" ON public.chat_conversations FOR INSERT WITH CHECK ((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE (team_members.user_id = auth.uid()))));


--
-- Name: rag_chunk_corrections Users can create corrections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create corrections" ON public.rag_chunk_corrections FOR INSERT WITH CHECK (true);


--
-- Name: rag_feedback Users can create feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create feedback" ON public.rag_feedback FOR INSERT WITH CHECK (true);


--
-- Name: marketplace_imports Users can create imports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create imports" ON public.marketplace_imports FOR INSERT WITH CHECK ((auth.uid() = imported_by));


--
-- Name: rag_knowledge_graph Users can create knowledge graph entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create knowledge graph entries" ON public.rag_knowledge_graph FOR INSERT WITH CHECK (true);


--
-- Name: marketplace_items Users can create marketplace items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create marketplace items" ON public.marketplace_items FOR INSERT WITH CHECK ((auth.uid() = publisher_id));


--
-- Name: chat_messages Users can create messages in their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create messages in their conversations" ON public.chat_messages FOR INSERT WITH CHECK ((conversation_id IN ( SELECT chat_conversations.id
   FROM public.chat_conversations
  WHERE (chat_conversations.created_by = auth.uid()))));


--
-- Name: rag_pipeline_configs Users can create pipeline configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create pipeline configs" ON public.rag_pipeline_configs FOR INSERT WITH CHECK (true);


--
-- Name: rag_query_expansions Users can create query expansions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create query expansions" ON public.rag_query_expansions FOR INSERT WITH CHECK (true);


--
-- Name: rag_self_evaluation Users can create self evaluations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create self evaluations" ON public.rag_self_evaluation FOR INSERT WITH CHECK (true);


--
-- Name: exported_configs Users can create their own exported_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own exported_configs" ON public.exported_configs FOR INSERT WITH CHECK ((auth.uid() = exported_by));


--
-- Name: multi_agent_configs Users can create their own multi_agent_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own multi_agent_configs" ON public.multi_agent_configs FOR INSERT WITH CHECK ((auth.uid() = created_by));


--
-- Name: marketplace_ratings Users can create their own ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own ratings" ON public.marketplace_ratings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: workspaces Users can create their own workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own workspaces" ON public.workspaces FOR INSERT WITH CHECK ((auth.uid() = created_by));


--
-- Name: workflow_runs Users can create workflow runs in their workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create workflow runs in their workspaces" ON public.workflow_runs FOR INSERT WITH CHECK ((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))))));


--
-- Name: knowledge_chunks Users can create workspace chunks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create workspace chunks" ON public.knowledge_chunks FOR INSERT TO authenticated WITH CHECK (((folder_id IN ( SELECT knowledge_folders.id
   FROM public.knowledge_folders
  WHERE (knowledge_folders.workspace_id IN ( SELECT workspaces.id
           FROM public.workspaces
          WHERE (workspaces.created_by = auth.uid())
        UNION
         SELECT team_members.workspace_id
           FROM public.team_members
          WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))))))) OR (folder_id IS NULL)));


--
-- Name: knowledge_folders Users can create workspace folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create workspace folders" ON public.knowledge_folders FOR INSERT TO authenticated WITH CHECK (((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))))) OR ((workspace_id IS NULL) AND (created_by = auth.uid()))));


--
-- Name: ai_profiles Users can create workspace profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create workspace profiles" ON public.ai_profiles FOR INSERT TO authenticated WITH CHECK (((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))))) OR ((workspace_id IS NULL) AND (created_by = auth.uid()))));


--
-- Name: agent_workflows Users can create workspace workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create workspace workflows" ON public.agent_workflows FOR INSERT TO authenticated WITH CHECK (((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))))) OR ((workspace_id IS NULL) AND (created_by = auth.uid()))));


--
-- Name: rag_knowledge_graph Users can delete knowledge graph; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete knowledge graph" ON public.rag_knowledge_graph FOR DELETE USING (true);


--
-- Name: rag_pipeline_configs Users can delete pipeline configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete pipeline configs" ON public.rag_pipeline_configs FOR DELETE USING (true);


--
-- Name: chat_conversations Users can delete their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own conversations" ON public.chat_conversations FOR DELETE USING ((created_by = auth.uid()));


--
-- Name: exported_configs Users can delete their own exported_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own exported_configs" ON public.exported_configs FOR DELETE USING ((auth.uid() = exported_by));


--
-- Name: marketplace_imports Users can delete their own imports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own imports" ON public.marketplace_imports FOR DELETE USING ((auth.uid() = imported_by));


--
-- Name: marketplace_items Users can delete their own marketplace items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own marketplace items" ON public.marketplace_items FOR DELETE USING ((auth.uid() = publisher_id));


--
-- Name: multi_agent_configs Users can delete their own multi_agent_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own multi_agent_configs" ON public.multi_agent_configs FOR DELETE USING ((auth.uid() = created_by));


--
-- Name: marketplace_ratings Users can delete their own ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own ratings" ON public.marketplace_ratings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: workspaces Users can delete their own workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own workspaces" ON public.workspaces FOR DELETE USING ((auth.uid() = created_by));


--
-- Name: knowledge_chunks Users can delete workspace chunks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete workspace chunks" ON public.knowledge_chunks FOR DELETE TO authenticated USING (((folder_id IN ( SELECT knowledge_folders.id
   FROM public.knowledge_folders
  WHERE (knowledge_folders.workspace_id IN ( SELECT workspaces.id
           FROM public.workspaces
          WHERE (workspaces.created_by = auth.uid())
        UNION
         SELECT team_members.workspace_id
           FROM public.team_members
          WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))))) OR (folder_id IS NULL)));


--
-- Name: knowledge_folders Users can delete workspace folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete workspace folders" ON public.knowledge_folders FOR DELETE TO authenticated USING (((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))) OR ((workspace_id IS NULL) AND (created_by = auth.uid()))));


--
-- Name: ai_profiles Users can delete workspace profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete workspace profiles" ON public.ai_profiles FOR DELETE TO authenticated USING (((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))) OR ((workspace_id IS NULL) AND (created_by = auth.uid()))));


--
-- Name: agent_workflows Users can delete workspace workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete workspace workflows" ON public.agent_workflows FOR DELETE TO authenticated USING (((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))) OR ((workspace_id IS NULL) AND (created_by = auth.uid()))));


--
-- Name: usage_logs Users can insert workspace logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert workspace logs" ON public.usage_logs FOR INSERT TO authenticated WITH CHECK (((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE (team_members.user_id = auth.uid()))) OR ((workspace_id IS NULL) AND (user_id = auth.uid()))));


--
-- Name: rag_retrieval_logs Users can insert workspace retrieval logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert workspace retrieval logs" ON public.rag_retrieval_logs FOR INSERT TO authenticated WITH CHECK (((conversation_id IN ( SELECT chat_conversations.id
   FROM public.chat_conversations
  WHERE (chat_conversations.workspace_id IN ( SELECT workspaces.id
           FROM public.workspaces
          WHERE (workspaces.created_by = auth.uid())
        UNION
         SELECT team_members.workspace_id
           FROM public.team_members
          WHERE (team_members.user_id = auth.uid()))))) OR (conversation_id IS NULL)));


--
-- Name: scheduled_jobs Users can manage their workspace scheduled jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their workspace scheduled jobs" ON public.scheduled_jobs USING ((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));


--
-- Name: rag_chunk_corrections Users can update corrections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update corrections" ON public.rag_chunk_corrections FOR UPDATE USING (((corrected_by = auth.uid()) OR (corrected_by IS NULL)));


--
-- Name: rag_knowledge_graph Users can update knowledge graph; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update knowledge graph" ON public.rag_knowledge_graph FOR UPDATE USING (true);


--
-- Name: rag_pipeline_configs Users can update pipeline configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update pipeline configs" ON public.rag_pipeline_configs FOR UPDATE USING (true);


--
-- Name: rag_feedback Users can update their feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their feedback" ON public.rag_feedback FOR UPDATE USING (((user_id = auth.uid()) OR (user_id IS NULL)));


--
-- Name: chat_conversations Users can update their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own conversations" ON public.chat_conversations FOR UPDATE USING ((created_by = auth.uid()));


--
-- Name: marketplace_items Users can update their own marketplace items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own marketplace items" ON public.marketplace_items FOR UPDATE USING ((auth.uid() = publisher_id));


--
-- Name: multi_agent_configs Users can update their own multi_agent_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own multi_agent_configs" ON public.multi_agent_configs FOR UPDATE USING ((auth.uid() = created_by));


--
-- Name: marketplace_ratings Users can update their own ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own ratings" ON public.marketplace_ratings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: workspaces Users can update their own workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own workspaces" ON public.workspaces FOR UPDATE USING ((auth.uid() = created_by));


--
-- Name: workflow_runs Users can update their workspace workflow runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their workspace workflow runs" ON public.workflow_runs FOR UPDATE USING ((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))))));


--
-- Name: knowledge_chunks Users can update workspace chunks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update workspace chunks" ON public.knowledge_chunks FOR UPDATE TO authenticated USING (((folder_id IN ( SELECT knowledge_folders.id
   FROM public.knowledge_folders
  WHERE (knowledge_folders.workspace_id IN ( SELECT workspaces.id
           FROM public.workspaces
          WHERE (workspaces.created_by = auth.uid())
        UNION
         SELECT team_members.workspace_id
           FROM public.team_members
          WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))))))) OR (folder_id IS NULL)));


--
-- Name: knowledge_folders Users can update workspace folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update workspace folders" ON public.knowledge_folders FOR UPDATE TO authenticated USING (((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))))) OR ((workspace_id IS NULL) AND (created_by = auth.uid()))));


--
-- Name: ai_profiles Users can update workspace profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update workspace profiles" ON public.ai_profiles FOR UPDATE TO authenticated USING (((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))))) OR ((workspace_id IS NULL) AND (created_by = auth.uid()))));


--
-- Name: agent_workflows Users can update workspace workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update workspace workflows" ON public.agent_workflows FOR UPDATE TO authenticated USING (((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))))) OR ((workspace_id IS NULL) AND (created_by = auth.uid()))));


--
-- Name: rag_citations Users can view citations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view citations" ON public.rag_citations FOR SELECT USING (true);


--
-- Name: rag_chunk_corrections Users can view corrections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view corrections" ON public.rag_chunk_corrections FOR SELECT USING (true);


--
-- Name: rag_feedback Users can view feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view feedback" ON public.rag_feedback FOR SELECT USING (true);


--
-- Name: rag_knowledge_graph Users can view knowledge graph; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view knowledge graph" ON public.rag_knowledge_graph FOR SELECT USING (true);


--
-- Name: chat_messages Users can view messages in their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages in their conversations" ON public.chat_messages FOR SELECT USING ((conversation_id IN ( SELECT chat_conversations.id
   FROM public.chat_conversations
  WHERE (chat_conversations.workspace_id IN ( SELECT workspaces.id
           FROM public.workspaces
          WHERE (workspaces.created_by = auth.uid())
        UNION
         SELECT team_members.workspace_id
           FROM public.team_members
          WHERE (team_members.user_id = auth.uid()))))));


--
-- Name: rag_pipeline_configs Users can view pipeline configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view pipeline configs" ON public.rag_pipeline_configs FOR SELECT USING (true);


--
-- Name: rag_query_expansions Users can view query expansions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view query expansions" ON public.rag_query_expansions FOR SELECT USING (true);


--
-- Name: rag_self_evaluation Users can view self evaluations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view self evaluations" ON public.rag_self_evaluation FOR SELECT USING (true);


--
-- Name: exported_configs Users can view their own exported_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own exported_configs" ON public.exported_configs FOR SELECT USING ((auth.uid() = exported_by));


--
-- Name: marketplace_imports Users can view their own imports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own imports" ON public.marketplace_imports FOR SELECT USING ((auth.uid() = imported_by));


--
-- Name: marketplace_items Users can view their own marketplace items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own marketplace items" ON public.marketplace_items FOR SELECT USING ((auth.uid() = publisher_id));


--
-- Name: multi_agent_configs Users can view their own multi_agent_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own multi_agent_configs" ON public.multi_agent_configs FOR SELECT USING ((auth.uid() = created_by));


--
-- Name: workspaces Users can view their own workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own workspaces" ON public.workspaces FOR SELECT USING ((auth.uid() = created_by));


--
-- Name: activity_feed Users can view their workspace activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their workspace activity" ON public.activity_feed FOR SELECT USING ((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE (team_members.user_id = auth.uid()))));


--
-- Name: chat_conversations Users can view their workspace conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their workspace conversations" ON public.chat_conversations FOR SELECT USING ((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE (team_members.user_id = auth.uid()))));


--
-- Name: scheduled_jobs Users can view their workspace scheduled jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their workspace scheduled jobs" ON public.scheduled_jobs FOR SELECT USING ((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE (team_members.user_id = auth.uid()))));


--
-- Name: workflow_runs Users can view their workspace workflow runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their workspace workflow runs" ON public.workflow_runs FOR SELECT USING ((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE (team_members.user_id = auth.uid()))));


--
-- Name: knowledge_chunks Users can view workspace chunks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view workspace chunks" ON public.knowledge_chunks FOR SELECT TO authenticated USING (((folder_id IN ( SELECT knowledge_folders.id
   FROM public.knowledge_folders
  WHERE (knowledge_folders.workspace_id IN ( SELECT workspaces.id
           FROM public.workspaces
          WHERE (workspaces.created_by = auth.uid())
        UNION
         SELECT team_members.workspace_id
           FROM public.team_members
          WHERE (team_members.user_id = auth.uid()))))) OR (folder_id IS NULL)));


--
-- Name: knowledge_folders Users can view workspace folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view workspace folders" ON public.knowledge_folders FOR SELECT TO authenticated USING (((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE (team_members.user_id = auth.uid()))) OR ((workspace_id IS NULL) AND (created_by = auth.uid()))));


--
-- Name: usage_logs Users can view workspace logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view workspace logs" ON public.usage_logs FOR SELECT TO authenticated USING (((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE (team_members.user_id = auth.uid()))) OR ((workspace_id IS NULL) AND (user_id = auth.uid()))));


--
-- Name: ai_profiles Users can view workspace profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view workspace profiles" ON public.ai_profiles FOR SELECT TO authenticated USING (((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE (team_members.user_id = auth.uid()))) OR ((workspace_id IS NULL) AND ((created_by = auth.uid()) OR (created_by IS NULL)))));


--
-- Name: rag_retrieval_logs Users can view workspace retrieval logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view workspace retrieval logs" ON public.rag_retrieval_logs FOR SELECT TO authenticated USING (((conversation_id IN ( SELECT chat_conversations.id
   FROM public.chat_conversations
  WHERE (chat_conversations.workspace_id IN ( SELECT workspaces.id
           FROM public.workspaces
          WHERE (workspaces.created_by = auth.uid())
        UNION
         SELECT team_members.workspace_id
           FROM public.team_members
          WHERE (team_members.user_id = auth.uid()))))) OR (conversation_id IS NULL)));


--
-- Name: agent_workflows Users can view workspace workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view workspace workflows" ON public.agent_workflows FOR SELECT TO authenticated USING (((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE (team_members.user_id = auth.uid()))) OR ((workspace_id IS NULL) AND ((created_by = auth.uid()) OR (created_by IS NULL)))));


--
-- Name: workspace_api_keys Workspace admins can create API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace admins can create API keys" ON public.workspace_api_keys FOR INSERT TO authenticated WITH CHECK (((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))) AND (created_by = auth.uid())));


--
-- Name: workspace_api_keys Workspace admins can delete API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace admins can delete API keys" ON public.workspace_api_keys FOR DELETE TO authenticated USING ((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));


--
-- Name: team_members Workspace admins can manage team members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace admins can manage team members" ON public.team_members USING (public.is_workspace_admin(workspace_id)) WITH CHECK (public.is_workspace_admin(workspace_id));


--
-- Name: workspace_api_keys Workspace admins can update API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace admins can update API keys" ON public.workspace_api_keys FOR UPDATE TO authenticated USING ((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));


--
-- Name: workspace_api_keys Workspace admins can view API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace admins can view API keys" ON public.workspace_api_keys FOR SELECT TO authenticated USING ((workspace_id IN ( SELECT workspaces.id
   FROM public.workspaces
  WHERE (workspaces.created_by = auth.uid())
UNION
 SELECT team_members.workspace_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));


--
-- Name: activity_feed; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_workflows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_workflows ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: exported_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exported_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_chunks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_folders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.knowledge_folders ENABLE ROW LEVEL SECURITY;

--
-- Name: marketplace_imports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketplace_imports ENABLE ROW LEVEL SECURITY;

--
-- Name: marketplace_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

--
-- Name: marketplace_ratings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketplace_ratings ENABLE ROW LEVEL SECURITY;

--
-- Name: multi_agent_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.multi_agent_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: rag_chunk_corrections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rag_chunk_corrections ENABLE ROW LEVEL SECURITY;

--
-- Name: rag_citations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rag_citations ENABLE ROW LEVEL SECURITY;

--
-- Name: rag_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rag_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: rag_knowledge_graph; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rag_knowledge_graph ENABLE ROW LEVEL SECURITY;

--
-- Name: rag_pipeline_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rag_pipeline_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: rag_query_expansions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rag_query_expansions ENABLE ROW LEVEL SECURITY;

--
-- Name: rag_retrieval_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rag_retrieval_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: rag_self_evaluation; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rag_self_evaluation ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: usage_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_api_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: workspaces; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;