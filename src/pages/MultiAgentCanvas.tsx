import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  NodeProps,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Play, Plus, Trash2, Zap, Save, Settings2, ArrowLeft, MessageCircle, Store, Clock, Undo2, Redo2, Printer, Sparkles } from 'lucide-react';
import { usePrintCanvas } from '@/hooks/usePrintCanvas';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { AgentNodeConfig } from '@/components/canvas/AgentNodeConfig';
import { AgentChatPanel } from '@/components/canvas/AgentChatPanel';
import { PublishToMarketplaceDialog } from '@/components/dialogs/PublishToMarketplaceDialog';
import { WorkflowScheduleDialog } from '@/components/scheduling/WorkflowScheduleDialog';
import { WorkflowSelector } from '@/components/canvas/WorkflowSelector';
import { WorkflowImportExport } from '@/components/canvas/WorkflowImportExport';
import { CollaboratorCursors, CollaboratorAvatars } from '@/components/canvas/CollaboratorCursors';
import { useRealtimeCollaboration } from '@/hooks/useRealtimeCollaboration';
import { useCanvasStore } from '@/store/useCanvasStore';

interface AgentNodeData {
  label: string;
  model: string;
  role?: string;
  agentId: string;
  inputs?: {
    fromKnowledgeBase: string[];
    fromAgents: string[];
  };
  outputs?: {
    toKnowledgeBase: boolean;
    toAgents: string[];
  };
}

const modelColors: Record<string, { gradient: string; glow: string; text: string }> = {
  core_analyst: { gradient: 'from-blue-500 to-cyan-500', glow: 'shadow-blue-500/30', text: 'text-blue-500' },
  core_reviewer: { gradient: 'from-amber-500 to-orange-500', glow: 'shadow-amber-500/30', text: 'text-amber-500' },
  core_synthesizer: { gradient: 'from-purple-500 to-pink-500', glow: 'shadow-purple-500/30', text: 'text-purple-500' },
};

const AgentNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as AgentNodeData;
  const colors = modelColors[nodeData.model] || modelColors.core_analyst;
  
  return (
    <div className={`relative bg-card/90 backdrop-blur-md border-2 rounded-2xl p-5 min-w-[240px] shadow-xl transition-all duration-300 cursor-pointer group ${selected ? `border-primary ${colors.glow} shadow-2xl scale-105` : 'border-border/50 hover:border-primary/50'}`}>
      <Handle type="target" position={Position.Left} className="!w-4 !h-4 !bg-primary !border-2 !border-background" />
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-xl bg-gradient-to-br ${colors.gradient} text-white shadow-lg`}>
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm leading-tight">{nodeData.label}</h3>
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${colors.text}`}>{nodeData.model.replace('core_', '')}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!w-4 !h-4 !bg-primary !border-2 !border-background" />
    </div>
  );
};

const nodeTypes = { agent: AgentNode };

const MultiAgentCanvas: React.FC = () => {
  const { configId } = useParams();
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setNodes, setEdges } = useCanvasStore();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
};

export default MultiAgentCanvas;
