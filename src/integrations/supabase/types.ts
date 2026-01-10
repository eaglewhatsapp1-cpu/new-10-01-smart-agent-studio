export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_feed: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory: {
        Row: {
          access_count: number | null
          agent_id: string | null
          confidence: number | null
          created_at: string | null
          id: string
          importance: number | null
          last_accessed: string | null
          memory_key: string
          memory_type: string
          memory_value: Json
          source_conversation_id: string | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          access_count?: number | null
          agent_id?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          importance?: number | null
          last_accessed?: string | null
          memory_key: string
          memory_type: string
          memory_value: Json
          source_conversation_id?: string | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          access_count?: number | null
          agent_id?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          importance?: number | null
          last_accessed?: string | null
          memory_key?: string
          memory_type?: string
          memory_value?: Json
          source_conversation_id?: string | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_reasoning_logs: {
        Row: {
          confidence: number | null
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          latency_ms: number | null
          message_id: string | null
          step_number: number
          step_type: string
          tool_input: Json | null
          tool_name: string | null
          tool_output: Json | null
        }
        Insert: {
          confidence?: number | null
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          latency_ms?: number | null
          message_id?: string | null
          step_number: number
          step_type: string
          tool_input?: Json | null
          tool_name?: string | null
          tool_output?: Json | null
        }
        Update: {
          confidence?: number | null
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          latency_ms?: number | null
          message_id?: string | null
          step_number?: number
          step_type?: string
          tool_input?: Json | null
          tool_name?: string | null
          tool_output?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_reasoning_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_reasoning_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tools: {
        Row: {
          config: Json | null
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          name: string
          tool_type: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          name: string
          tool_type: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
          tool_type?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_tools_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_workflows: {
        Row: {
          canvas_data: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          execution_mode: string | null
          handoff_rules: Json | null
          id: string
          name: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          canvas_data?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          execution_mode?: string | null
          handoff_rules?: Json | null
          id?: string
          name: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          canvas_data?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          execution_mode?: string | null
          handoff_rules?: Json | null
          id?: string
          name?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_workflows_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_profiles: {
        Row: {
          active_days: number[] | null
          active_from: string | null
          active_until: string | null
          allowed_folders: string[] | null
          api_key_id: string | null
          chunk_priority: string[] | null
          core_model: Database["public"]["Enums"]["core_model"]
          created_at: string | null
          created_by: string | null
          display_name: string
          id: string
          intro_sentence: string | null
          is_active: boolean | null
          persona: string | null
          rag_policy: Json | null
          response_rules: Json | null
          role_description: string | null
          updated_at: string | null
          user_defined_name: string | null
          workspace_id: string | null
        }
        Insert: {
          active_days?: number[] | null
          active_from?: string | null
          active_until?: string | null
          allowed_folders?: string[] | null
          api_key_id?: string | null
          chunk_priority?: string[] | null
          core_model?: Database["public"]["Enums"]["core_model"]
          created_at?: string | null
          created_by?: string | null
          display_name: string
          id?: string
          intro_sentence?: string | null
          is_active?: boolean | null
          persona?: string | null
          rag_policy?: Json | null
          response_rules?: Json | null
          role_description?: string | null
          updated_at?: string | null
          user_defined_name?: string | null
          workspace_id?: string | null
        }
        Update: {
          active_days?: number[] | null
          active_from?: string | null
          active_until?: string | null
          allowed_folders?: string[] | null
          api_key_id?: string | null
          chunk_priority?: string[] | null
          core_model?: Database["public"]["Enums"]["core_model"]
          created_at?: string | null
          created_by?: string | null
          display_name?: string
          id?: string
          intro_sentence?: string | null
          is_active?: boolean | null
          persona?: string | null
          rag_policy?: Json | null
          response_rules?: Json | null
          role_description?: string | null
          updated_at?: string | null
          user_defined_name?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_profiles_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "workspace_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          agent_id: string | null
          created_at: string
          created_by: string | null
          id: string
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          role: string
          tokens_used: number | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          role: string
          tokens_used?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          role?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      exported_configs: {
        Row: {
          config_data: Json
          created_at: string
          exported_by: string
          id: string
          multi_agent_config_id: string
          version: number | null
        }
        Insert: {
          config_data: Json
          created_at?: string
          exported_by: string
          id?: string
          multi_agent_config_id: string
          version?: number | null
        }
        Update: {
          config_data?: Json
          created_at?: string
          exported_by?: string
          id?: string
          multi_agent_config_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exported_configs_multi_agent_config_id_fkey"
            columns: ["multi_agent_config_id"]
            isOneToOne: false
            referencedRelation: "multi_agent_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_chunks: {
        Row: {
          chunk_index: number | null
          chunk_type: string | null
          content: string
          created_at: string | null
          document_context: string | null
          document_summary: string | null
          embedding: string | null
          entities: Json | null
          folder_id: string | null
          id: string
          key_concepts: string[] | null
          metadata: Json | null
          parent_chunk_id: string | null
          quality_score: number | null
          semantic_tags: string[] | null
          source_file: string
          token_count: number | null
          total_chunks: number | null
        }
        Insert: {
          chunk_index?: number | null
          chunk_type?: string | null
          content: string
          created_at?: string | null
          document_context?: string | null
          document_summary?: string | null
          embedding?: string | null
          entities?: Json | null
          folder_id?: string | null
          id?: string
          key_concepts?: string[] | null
          metadata?: Json | null
          parent_chunk_id?: string | null
          quality_score?: number | null
          semantic_tags?: string[] | null
          source_file: string
          token_count?: number | null
          total_chunks?: number | null
        }
        Update: {
          chunk_index?: number | null
          chunk_type?: string | null
          content?: string
          created_at?: string | null
          document_context?: string | null
          document_summary?: string | null
          embedding?: string | null
          entities?: Json | null
          folder_id?: string | null
          id?: string
          key_concepts?: string[] | null
          metadata?: Json | null
          parent_chunk_id?: string | null
          quality_score?: number | null
          semantic_tags?: string[] | null
          source_file?: string
          token_count?: number | null
          total_chunks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "knowledge_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_parent_chunk_id_fkey"
            columns: ["parent_chunk_id"]
            isOneToOne: false
            referencedRelation: "knowledge_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_folders: {
        Row: {
          created_at: string | null
          created_by: string | null
          folder_type: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          folder_type?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          folder_type?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "knowledge_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_folders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_summaries: {
        Row: {
          child_summaries: string[] | null
          content: string
          created_at: string | null
          embedding: string | null
          entity_mentions: Json | null
          folder_id: string | null
          id: string
          key_concepts: string[] | null
          level: number
          parent_summary_id: string | null
          source_chunks: string[] | null
          title: string | null
          token_count: number | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          child_summaries?: string[] | null
          content: string
          created_at?: string | null
          embedding?: string | null
          entity_mentions?: Json | null
          folder_id?: string | null
          id?: string
          key_concepts?: string[] | null
          level: number
          parent_summary_id?: string | null
          source_chunks?: string[] | null
          title?: string | null
          token_count?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          child_summaries?: string[] | null
          content?: string
          created_at?: string | null
          embedding?: string | null
          entity_mentions?: Json | null
          folder_id?: string | null
          id?: string
          key_concepts?: string[] | null
          level?: number
          parent_summary_id?: string | null
          source_chunks?: string[] | null
          title?: string | null
          token_count?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_summaries_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "knowledge_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_summaries_parent_summary_id_fkey"
            columns: ["parent_summary_id"]
            isOneToOne: false
            referencedRelation: "knowledge_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_summaries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_imports: {
        Row: {
          created_at: string
          id: string
          imported_by: string
          imported_config_id: string | null
          marketplace_item_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          imported_by: string
          imported_config_id?: string | null
          marketplace_item_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          imported_by?: string
          imported_config_id?: string | null
          marketplace_item_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_imports_marketplace_item_id_fkey"
            columns: ["marketplace_item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_imports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_items: {
        Row: {
          agent_count: number | null
          canvas_data: Json | null
          category: string | null
          config_data: Json
          created_at: string
          description: string | null
          download_count: number | null
          id: string
          is_public: boolean | null
          item_type: string
          name: string
          publisher_id: string
          publisher_workspace_id: string
          rating: number | null
          rating_count: number | null
          source_config_id: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          agent_count?: number | null
          canvas_data?: Json | null
          category?: string | null
          config_data: Json
          created_at?: string
          description?: string | null
          download_count?: number | null
          id?: string
          is_public?: boolean | null
          item_type: string
          name: string
          publisher_id: string
          publisher_workspace_id: string
          rating?: number | null
          rating_count?: number | null
          source_config_id?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          agent_count?: number | null
          canvas_data?: Json | null
          category?: string | null
          config_data?: Json
          created_at?: string
          description?: string | null
          download_count?: number | null
          id?: string
          is_public?: boolean | null
          item_type?: string
          name?: string
          publisher_id?: string
          publisher_workspace_id?: string
          rating?: number | null
          rating_count?: number | null
          source_config_id?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_items_publisher_workspace_id_fkey"
            columns: ["publisher_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_ratings: {
        Row: {
          created_at: string
          id: string
          marketplace_item_id: string
          rating: number
          review: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marketplace_item_id: string
          rating: number
          review?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marketplace_item_id?: string
          rating?: number
          review?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_ratings_marketplace_item_id_fkey"
            columns: ["marketplace_item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
        ]
      }
      multi_agent_configs: {
        Row: {
          agent_nodes: Json | null
          canvas_data: Json | null
          connections: Json | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          input_folder_id: string | null
          name: string
          output_folder_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agent_nodes?: Json | null
          canvas_data?: Json | null
          connections?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          input_folder_id?: string | null
          name: string
          output_folder_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          agent_nodes?: Json | null
          canvas_data?: Json | null
          connections?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          input_folder_id?: string | null
          name?: string
          output_folder_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "multi_agent_configs_input_folder_id_fkey"
            columns: ["input_folder_id"]
            isOneToOne: false
            referencedRelation: "knowledge_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multi_agent_configs_output_folder_id_fkey"
            columns: ["output_folder_id"]
            isOneToOne: false
            referencedRelation: "knowledge_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multi_agent_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      query_complexity_cache: {
        Row: {
          analysis_details: Json | null
          complexity: string
          created_at: string | null
          id: string
          original_query: string
          query_hash: string
          recommended_strategy: string
          user_id: string | null
        }
        Insert: {
          analysis_details?: Json | null
          complexity: string
          created_at?: string | null
          id?: string
          original_query: string
          query_hash: string
          recommended_strategy: string
          user_id?: string | null
        }
        Update: {
          analysis_details?: Json | null
          complexity?: string
          created_at?: string | null
          id?: string
          original_query?: string
          query_hash?: string
          recommended_strategy?: string
          user_id?: string | null
        }
        Relationships: []
      }
      rag_chunk_corrections: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          chunk_id: string | null
          corrected_by: string | null
          corrected_content: string
          correction_reason: string | null
          correction_type: string | null
          created_at: string
          id: string
          original_content: string
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          chunk_id?: string | null
          corrected_by?: string | null
          corrected_content: string
          correction_reason?: string | null
          correction_type?: string | null
          created_at?: string
          id?: string
          original_content: string
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          chunk_id?: string | null
          corrected_by?: string | null
          corrected_content?: string
          correction_reason?: string | null
          correction_type?: string | null
          created_at?: string
          id?: string
          original_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "rag_chunk_corrections_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "knowledge_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_citations: {
        Row: {
          chunk_id: string | null
          citation_text: string
          confidence_score: number | null
          conversation_id: string | null
          created_at: string
          id: string
          message_id: string | null
          source_file: string | null
          source_location: string | null
          verification_method: string | null
          verified: boolean | null
        }
        Insert: {
          chunk_id?: string | null
          citation_text: string
          confidence_score?: number | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          source_file?: string | null
          source_location?: string | null
          verification_method?: string | null
          verified?: boolean | null
        }
        Update: {
          chunk_id?: string | null
          citation_text?: string
          confidence_score?: number | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          source_file?: string | null
          source_location?: string | null
          verification_method?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_citations_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "knowledge_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rag_citations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_feedback: {
        Row: {
          chunk_id: string | null
          conversation_id: string | null
          correct_answer: string | null
          created_at: string
          feedback_text: string | null
          feedback_type: string
          id: string
          is_relevant: boolean | null
          message_id: string | null
          missing_sources: string[] | null
          rating: number | null
          user_correction: string | null
          user_id: string | null
        }
        Insert: {
          chunk_id?: string | null
          conversation_id?: string | null
          correct_answer?: string | null
          created_at?: string
          feedback_text?: string | null
          feedback_type: string
          id?: string
          is_relevant?: boolean | null
          message_id?: string | null
          missing_sources?: string[] | null
          rating?: number | null
          user_correction?: string | null
          user_id?: string | null
        }
        Update: {
          chunk_id?: string | null
          conversation_id?: string | null
          correct_answer?: string | null
          created_at?: string
          feedback_text?: string | null
          feedback_type?: string
          id?: string
          is_relevant?: boolean | null
          message_id?: string | null
          missing_sources?: string[] | null
          rating?: number | null
          user_correction?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_feedback_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "knowledge_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rag_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_knowledge_graph: {
        Row: {
          chunk_id: string | null
          confidence: number | null
          created_at: string
          id: string
          metadata: Json | null
          relationship: string
          source_entity: string
          source_type: string | null
          target_entity: string
          target_type: string | null
        }
        Insert: {
          chunk_id?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          relationship: string
          source_entity: string
          source_type?: string | null
          target_entity: string
          target_type?: string | null
        }
        Update: {
          chunk_id?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          relationship?: string
          source_entity?: string
          source_type?: string | null
          target_entity?: string
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_knowledge_graph_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "knowledge_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_pipeline_configs: {
        Row: {
          agent_id: string | null
          chunk_overlap: number | null
          chunk_size: number | null
          cite_sources: boolean | null
          confidence_threshold: number | null
          config_name: string
          corrective_rag_enabled: boolean | null
          created_at: string
          hallucination_check: boolean | null
          id: string
          max_hop_depth: number | null
          metadata: Json | null
          rerank_top_n: number | null
          retrieval_strategy: string | null
          self_rag_enabled: boolean | null
          top_k: number | null
          updated_at: string
          use_hyde: boolean | null
          use_multi_hop: boolean | null
          use_query_expansion: boolean | null
          use_reranking: boolean | null
        }
        Insert: {
          agent_id?: string | null
          chunk_overlap?: number | null
          chunk_size?: number | null
          cite_sources?: boolean | null
          confidence_threshold?: number | null
          config_name: string
          corrective_rag_enabled?: boolean | null
          created_at?: string
          hallucination_check?: boolean | null
          id?: string
          max_hop_depth?: number | null
          metadata?: Json | null
          rerank_top_n?: number | null
          retrieval_strategy?: string | null
          self_rag_enabled?: boolean | null
          top_k?: number | null
          updated_at?: string
          use_hyde?: boolean | null
          use_multi_hop?: boolean | null
          use_query_expansion?: boolean | null
          use_reranking?: boolean | null
        }
        Update: {
          agent_id?: string | null
          chunk_overlap?: number | null
          chunk_size?: number | null
          cite_sources?: boolean | null
          confidence_threshold?: number | null
          config_name?: string
          corrective_rag_enabled?: boolean | null
          created_at?: string
          hallucination_check?: boolean | null
          id?: string
          max_hop_depth?: number | null
          metadata?: Json | null
          rerank_top_n?: number | null
          retrieval_strategy?: string | null
          self_rag_enabled?: boolean | null
          top_k?: number | null
          updated_at?: string
          use_hyde?: boolean | null
          use_multi_hop?: boolean | null
          use_query_expansion?: boolean | null
          use_reranking?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_pipeline_configs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_query_expansions: {
        Row: {
          created_at: string
          decomposed_subqueries: Json | null
          detected_entities: Json | null
          expanded_queries: string[] | null
          expansion_method: string | null
          hypothetical_answers: string[] | null
          id: string
          original_query: string
          query_intent: string | null
        }
        Insert: {
          created_at?: string
          decomposed_subqueries?: Json | null
          detected_entities?: Json | null
          expanded_queries?: string[] | null
          expansion_method?: string | null
          hypothetical_answers?: string[] | null
          id?: string
          original_query: string
          query_intent?: string | null
        }
        Update: {
          created_at?: string
          decomposed_subqueries?: Json | null
          detected_entities?: Json | null
          expanded_queries?: string[] | null
          expansion_method?: string | null
          hypothetical_answers?: string[] | null
          id?: string
          original_query?: string
          query_intent?: string | null
        }
        Relationships: []
      }
      rag_retrieval_logs: {
        Row: {
          chunks_retrieved: Json | null
          conversation_id: string | null
          created_at: string
          expanded_query: string | null
          id: string
          query: string
          query_embedding: string | null
          relevance_scores: Json | null
          reranked_chunks: Json | null
          retrieval_strategy: string | null
          search_latency_ms: number | null
        }
        Insert: {
          chunks_retrieved?: Json | null
          conversation_id?: string | null
          created_at?: string
          expanded_query?: string | null
          id?: string
          query: string
          query_embedding?: string | null
          relevance_scores?: Json | null
          reranked_chunks?: Json | null
          retrieval_strategy?: string | null
          search_latency_ms?: number | null
        }
        Update: {
          chunks_retrieved?: Json | null
          conversation_id?: string | null
          created_at?: string
          expanded_query?: string | null
          id?: string
          query?: string
          query_embedding?: string | null
          relevance_scores?: Json | null
          reranked_chunks?: Json | null
          retrieval_strategy?: string | null
          search_latency_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_retrieval_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_self_evaluation: {
        Row: {
          confidence_score: number | null
          conversation_id: string | null
          created_at: string
          final_response: string | null
          hallucination_details: Json | null
          hallucination_detected: boolean | null
          id: string
          initial_response: string | null
          query: string
          refinement_iterations: number | null
          relevance_check: Json | null
          retrieval_decision: string | null
          support_check: Json | null
          utility_check: Json | null
        }
        Insert: {
          confidence_score?: number | null
          conversation_id?: string | null
          created_at?: string
          final_response?: string | null
          hallucination_details?: Json | null
          hallucination_detected?: boolean | null
          id?: string
          initial_response?: string | null
          query: string
          refinement_iterations?: number | null
          relevance_check?: Json | null
          retrieval_decision?: string | null
          support_check?: Json | null
          utility_check?: Json | null
        }
        Update: {
          confidence_score?: number | null
          conversation_id?: string | null
          created_at?: string
          final_response?: string | null
          hallucination_details?: Json | null
          hallucination_detected?: boolean | null
          id?: string
          initial_response?: string | null
          query?: string
          refinement_iterations?: number | null
          relevance_check?: Json | null
          retrieval_decision?: string | null
          support_check?: Json | null
          utility_check?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_self_evaluation_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_strategy_metrics: {
        Row: {
          avg_confidence: number | null
          avg_latency_ms: number | null
          created_at: string | null
          failure_count: number | null
          id: string
          last_used: string | null
          negative_feedback: number | null
          positive_feedback: number | null
          query_complexity: string | null
          strategy_name: string
          success_count: number | null
          total_queries: number | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          avg_confidence?: number | null
          avg_latency_ms?: number | null
          created_at?: string | null
          failure_count?: number | null
          id?: string
          last_used?: string | null
          negative_feedback?: number | null
          positive_feedback?: number | null
          query_complexity?: string | null
          strategy_name: string
          success_count?: number | null
          total_queries?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          avg_confidence?: number | null
          avg_latency_ms?: number | null
          created_at?: string | null
          failure_count?: number | null
          id?: string
          last_used?: string | null
          negative_feedback?: number | null
          positive_feedback?: number | null
          query_complexity?: string | null
          strategy_name?: string
          success_count?: number | null
          total_queries?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_strategy_metrics_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          cron_expression: string
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          next_run_at: string | null
          updated_at: string
          workflow_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cron_expression: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          updated_at?: string
          workflow_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cron_expression?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          updated_at?: string
          workflow_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_jobs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "multi_agent_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          accepted_at: string | null
          email: string
          id: string
          invited_at: string
          invited_by: string | null
          role: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          email: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          email?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          agent_id: string | null
          created_at: string | null
          folders_accessed: string[] | null
          id: string
          query: string | null
          response_time_ms: number | null
          tokens_used: number | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          folders_accessed?: string[] | null
          id?: string
          query?: string | null
          response_time_ms?: number | null
          tokens_used?: number | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          folders_accessed?: string[] | null
          id?: string
          query?: string | null
          response_time_ms?: number | null
          tokens_used?: number | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          execution_logs: Json | null
          id: string
          input_data: Json | null
          output_data: Json | null
          started_at: string | null
          status: string
          trigger_type: string
          workflow_id: string | null
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          execution_logs?: Json | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: string
          trigger_type?: string
          workflow_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          execution_logs?: Json | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: string
          trigger_type?: string
          workflow_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "multi_agent_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_api_keys: {
        Row: {
          api_key_encrypted: string
          created_at: string
          created_by: string
          display_name: string | null
          id: string
          is_active: boolean
          provider: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string
          created_by: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          provider: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string
          created_by?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          provider?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_api_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_folder_descendants: {
        Args: { folder_ids: string[] }
        Returns: string[]
      }
      is_workspace_admin: { Args: { _workspace_id: string }; Returns: boolean }
      is_workspace_member: { Args: { _workspace_id: string }; Returns: boolean }
    }
    Enums: {
      core_model: "core_analyst" | "core_reviewer" | "core_synthesizer"
      creativity_level: "none" | "very_low" | "low" | "medium" | "high"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      core_model: ["core_analyst", "core_reviewer", "core_synthesizer"],
      creativity_level: ["none", "very_low", "low", "medium", "high"],
    },
  },
} as const
