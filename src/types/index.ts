// Core Model Types
export type CoreModel = 'core_analyst' | 'core_reviewer' | 'core_synthesizer';

export type CreativityLevel = 'none' | 'very_low' | 'low' | 'medium' | 'high';

export interface RagPolicy {
  knowledge_base_ratio: number;
  web_verification_ratio: number;
  creativity_level: CreativityLevel;
  hallucination_tolerance: 'very_low' | 'none';
}

export interface ResponseRules {
  step_by_step: boolean;
  cite_if_possible: boolean;
  refuse_if_uncertain: boolean;
}

export interface KnowledgeFolder {
  id: string;
  name: string;
  parent_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  children?: KnowledgeFolder[];
}

export interface KnowledgeChunk {
  id: string;
  folder_id: string | null;
  source_file: string;
  content: string;
  embedding?: number[];
  created_at: string;
}

export interface AIProfile {
  id: string;
  display_name: string;
  user_defined_name: string;
  core_model: CoreModel;
  persona: string | null;
  role_description: string | null;
  intro_sentence: string | null;
  rag_policy: RagPolicy;
  allowed_folders: string[];
  chunk_priority: string[];
  response_rules: ResponseRules;
  api_key: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentWorkflow {
  id: string;
  name: string;
  description: string | null;
  canvas_data: CanvasData;
  handoff_rules: HandoffRule[];
  execution_mode: 'sequential' | 'parallel';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export interface CanvasNode {
  id: string;
  type: 'agent';
  position: { x: number; y: number };
  data: {
    agentId: string;
    label: string;
  };
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  data?: {
    ruleId?: string;
  };
}

export interface HandoffRule {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  trigger: {
    type: 'keyword' | 'topic' | 'confidence' | 'custom';
    value: string;
  };
  fallbackAgentId?: string;
}

export interface UsageLog {
  id: string;
  agent_id: string | null;
  user_id: string | null;
  query: string | null;
  response_time_ms: number | null;
  tokens_used: number | null;
  folders_accessed: string[] | null;
  created_at: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: any[];
}

export type Language = 'en' | 'ar';

export interface AppContextType {
  lang: Language;
  setLang: (l: Language) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  t: typeof import('@/lib/translations').translations['en'];
}
