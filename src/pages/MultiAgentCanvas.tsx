import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
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
import { Bot, Play, Plus, Trash2, Zap, Save, Settings2, ArrowLeft, MessageCircle, Store, Clock } from 'lucide-react';
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

// Model color configurations
const modelColors: Record<string, { gradient: string; glow: string; text: string }> = {
  core_analyst: { gradient: 'from-blue-500 to-cyan-500', glow: 'shadow-blue-500/30', text: 'text-blue-500' },
  core_reviewer: { gradient: 'from-amber-500 to-orange-500', glow: 'shadow-amber-500/30', text: 'text-amber-500' },
  core_synthesizer: { gradient: 'from-purple-500 to-pink-500', glow: 'shadow-purple-500/30', text: 'text-purple-500' },
};

// Custom Agent Node Component with Modern Styling
const AgentNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as AgentNodeData;
  
  const fromKB = Array.isArray(nodeData.inputs?.fromKnowledgeBase) 
    ? nodeData.inputs.fromKnowledgeBase 
    : [];
  const fromAgents = Array.isArray(nodeData.inputs?.fromAgents) 
    ? nodeData.inputs.fromAgents 
    : [];
  const toAgents = Array.isArray(nodeData.outputs?.toAgents) 
    ? nodeData.outputs.toAgents 
    : [];
  
  const inputCount = fromKB.length + fromAgents.length;
  const outputCount = (nodeData.outputs?.toKnowledgeBase ? 1 : 0) + toAgents.length;

  const colors = modelColors[nodeData.model] || modelColors.core_analyst;

  return (
    <div
      className={`relative bg-card/90 backdrop-blur-md border-2 rounded-2xl p-5 min-w-[240px] shadow-xl transition-all duration-300 cursor-pointer group ${
        selected 
          ? `border-primary ${colors.glow} shadow-2xl scale-105` 
          : 'border-border/50 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1'
      }`}
    >
      {/* Glowing background effect */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${colors.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
      
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-gradient-to-r !from-primary !to-primary/80 !border-2 !border-background !rounded-full !shadow-lg"
      />
      
      {/* Header with Icon */}
      <div className="flex items-center gap-3 mb-3 relative">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg ring-4 ring-background`}>
          <Bot className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-base">{nodeData.label}</p>
          <Badge className={`text-xs bg-gradient-to-r ${colors.gradient} text-white border-0 shadow-sm`}>
            {nodeData.model?.replace('core_', '')}
          </Badge>
        </div>
      </div>
      
      {/* Role Description */}
      {nodeData.role && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 pl-1 border-l-2 border-primary/30">{nodeData.role}</p>
      )}
      
      {/* I/O Stats */}
      <div className="flex gap-2 text-xs">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/80">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-medium">{inputCount} in</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/80">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="font-medium">{outputCount} out</span>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-gradient-to-r !from-primary/80 !to-primary !border-2 !border-background !rounded-full !shadow-lg"
      />
    </div>
  );
};

// Modern Start Node
const StartNode: React.FC<NodeProps> = ({ selected }) => {
  return (
    <div
      className={`relative bg-gradient-to-br from-green-500/20 to-emerald-500/10 backdrop-blur-sm border-2 border-green-500/50 rounded-2xl p-5 shadow-xl transition-all duration-300 ${
        selected ? 'shadow-green-500/40 scale-105 border-green-500' : 'hover:shadow-green-500/20 hover:-translate-y-1'
      }`}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 opacity-10 blur-xl" />
      
      <div className="relative flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30 ring-4 ring-green-500/20">
          <Zap className="h-6 w-6 text-white" />
        </div>
        <div>
          <span className="font-bold text-green-500 text-lg">Start</span>
          <p className="text-xs text-muted-foreground">Workflow Entry</p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-gradient-to-r !from-green-500 !to-emerald-500 !border-2 !border-background !rounded-full !shadow-lg"
      />
    </div>
  );
};

// Modern End Node
const EndNode: React.FC<NodeProps> = ({ selected }) => {
  return (
    <div
      className={`relative bg-gradient-to-br from-red-500/20 to-rose-500/10 backdrop-blur-sm border-2 border-red-500/50 rounded-2xl p-5 shadow-xl transition-all duration-300 ${
        selected ? 'shadow-red-500/40 scale-105 border-red-500' : 'hover:shadow-red-500/20 hover:-translate-y-1'
      }`}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 opacity-10 blur-xl" />
      
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-gradient-to-r !from-red-500 !to-rose-500 !border-2 !border-background !rounded-full !shadow-lg"
      />
      <div className="relative flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/30 ring-4 ring-red-500/20">
          <div className="w-4 h-4 rounded-sm bg-white" />
        </div>
        <div>
          <span className="font-bold text-red-500 text-lg">End</span>
          <p className="text-xs text-muted-foreground">Workflow Exit</p>
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  agent: AgentNode,
  start: StartNode,
  end: EndNode,
};

const initialNodes: Node[] = [
  {
    id: 'start',
    type: 'start',
    position: { x: 50, y: 200 },
    data: { label: 'Start' },
  },
  {
    id: 'end',
    type: 'end',
    position: { x: 700, y: 200 },
    data: { label: 'End' },
  },
];

export const MultiAgentCanvas: React.FC = () => {
  const { id: configId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedAgentToAdd, setSelectedAgentToAdd] = useState<string>('');
  const [configName, setConfigName] = useState('New Multi-Agent Config');
  const [configDescription, setConfigDescription] = useState('');
  const [selectedNodeForConfig, setSelectedNodeForConfig] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [showEditor, setShowEditor] = useState(!!configId);
  const [currentUserId, setCurrentUserId] = useState<string>();
  const [currentUserEmail, setCurrentUserEmail] = useState<string>();

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        setCurrentUserEmail(user.email);
      }
    });
  }, []);

  // Real-time collaboration
  const { collaborators, broadcastCursor, isConnected } = useRealtimeCollaboration(
    configId,
    currentUserId,
    currentUserEmail
  );

  // Handle import
  const handleImport = (data: any) => {
    if (data.nodes) setNodes(data.nodes);
    if (data.edges) setEdges(data.edges);
    if (data.name) setConfigName(data.name);
    toast({ title: 'Imported', description: 'Workflow imported successfully' });
  };

  // Fetch agents
  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch folders for input config
  const { data: folders = [] } = useQuery({
    queryKey: ['folders', currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_folders')
        .select('id, name, folder_type')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Load existing config if editing
  const { data: existingConfig } = useQuery({
    queryKey: ['multi-agent-config', configId],
    queryFn: async () => {
      if (!configId) return null;
      const { data, error } = await supabase
        .from('multi_agent_configs')
        .select('*')
        .eq('id', configId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!configId,
  });

  // Sync showEditor with configId
  useEffect(() => {
    if (configId) {
      setShowEditor(true);
    }
  }, [configId]);

  // Load existing config data
  useEffect(() => {
    if (existingConfig) {
      setConfigName(existingConfig.name);
      setConfigDescription(existingConfig.description || '');
      
      const canvasData = existingConfig.canvas_data as { nodes?: Node[]; edges?: Edge[] } | null;
      if (canvasData?.nodes) {
        setNodes(canvasData.nodes);
      }
      if (canvasData?.edges) {
        setEdges(canvasData.edges);
      }
    }
  }, [existingConfig, setNodes, setEdges]);

  // Reset to initial state when creating new workflow
  useEffect(() => {
    if (!configId && showEditor) {
      setNodes(initialNodes);
      setEdges([]);
      setConfigName('New Multi-Agent Config');
      setConfigDescription('');
    }
  }, [configId, showEditor, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const addAgentNode = () => {
    if (!selectedAgentToAdd) return;

    const agent = agents?.find((a) => a.id === selectedAgentToAdd);
    if (!agent) return;

    // Map agent's allowed_folders to inputs.fromKnowledgeBase
    const allowedFolders = agent.allowed_folders || [];

    const newNode: Node = {
      id: `agent-${Date.now()}`,
      type: 'agent',
      position: {
        x: 300 + Math.random() * 100,
        y: 100 + Math.random() * 200,
      },
      data: {
        label: agent.display_name,
        model: agent.core_model,
        role: agent.role_description,
        agentId: agent.id,
        inputs: { fromKnowledgeBase: allowedFolders, fromAgents: [] },
        outputs: { toKnowledgeBase: false, toAgents: [] },
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setSelectedAgentToAdd('');
    toast({
      title: 'Agent Added',
      description: `${agent.display_name} added to canvas. Click on it in sidebar or double-click to configure.`,
    });
  };

  const deleteSelectedNodes = () => {
    setNodes((nds) =>
      nds.filter((node) => !node.selected || node.type === 'start' || node.type === 'end')
    );
    setEdges((eds) =>
      eds.filter((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);
        return (
          (!sourceNode?.selected || sourceNode.type === 'start' || sourceNode.type === 'end') &&
          (!targetNode?.selected || targetNode.type === 'start' || targetNode.type === 'end')
        );
      })
    );
  };

  const handleSave = async () => {
    if (!currentWorkspace) {
      toast({
        title: 'No Workspace',
        description: 'Please select or create a workspace first',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    
    const configData = {
      name: configName,
      description: configDescription,
      workspace_id: currentWorkspace.id,
      canvas_data: JSON.parse(JSON.stringify({ nodes, edges })),
      agent_nodes: JSON.parse(JSON.stringify(nodes.filter((n) => n.type === 'agent').map((n) => n.data))),
      connections: JSON.parse(JSON.stringify(edges)),
      created_by: user.user?.id!,
    };

    let error = null;

    if (configId) {
      const { error: updateError } = await supabase
        .from('multi_agent_configs')
        .update(configData)
        .eq('id', configId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('multi_agent_configs')
        .insert(configData);
      error = insertError;
    }

    setSaving(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Saved',
        description: 'Configuration saved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['multi-agent-configs'] });
    }
  };

  const handleExport = async () => {
    const agentNodes = nodes.filter((n) => n.type === 'agent');
    if (agentNodes.length === 0) {
      toast({
        title: 'No Agents',
        description: 'Add at least one agent to export',
        variant: 'destructive',
      });
      return;
    }

    const exportData = {
      name: configName,
      description: configDescription,
      nodes,
      edges,
      agents: agentNodes.map((n) => n.data),
      exportedAt: new Date().toISOString(),
    };

    // Save to exported_configs if we have a configId
    if (configId) {
      const { data: user } = await supabase.auth.getUser();
      await supabase.from('exported_configs').insert({
        multi_agent_config_id: configId,
        config_data: JSON.parse(JSON.stringify(exportData)),
        exported_by: user.user?.id!,
      });
    }

    // Download JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${configName.replace(/\s+/g, '_')}_config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'Configuration exported successfully',
    });
  };

  const handleDelete = async () => {
    if (!configId) return;

    const { error } = await supabase.from('multi_agent_configs').delete().eq('id', configId);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete configuration',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Deleted',
        description: 'Configuration deleted',
      });
      navigate('/multi-agent-canvas');
      queryClient.invalidateQueries({ queryKey: ['multi-agent-configs'] });
    }
  };

  const runWorkflow = () => {
    const agentNodes = nodes.filter((n) => n.type === 'agent');
    if (agentNodes.length === 0) {
      toast({
        title: 'No Agents',
        description: 'Add at least one agent to the workflow',
        variant: 'destructive',
      });
      return;
    }

    setChatOpen(true);
  };

  // Get agents for chat panel in order
  const chatAgents = useMemo(() => {
    return nodes
      .filter((n) => n.type === 'agent')
      .map((n) => {
        const data = n.data as unknown as AgentNodeData;
        return {
          id: n.id,
          label: data.label,
          model: data.model,
          agentId: data.agentId,
        };
      });
  }, [nodes]);

  const availableAgents = useMemo(() => {
    const usedAgentIds = nodes
      .filter((n) => n.type === 'agent')
      .map((n) => (n.data as unknown as AgentNodeData).agentId);
    return agents?.filter((a) => !usedAgentIds.includes(a.id)) || [];
  }, [agents, nodes]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'agent') {
        setSelectedNodeForConfig(node);
      }
    },
    []
  );

  const handleUpdateNodeConfig = (updates: Partial<AgentNodeData>) => {
    if (!selectedNodeForConfig) return;

    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNodeForConfig.id
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
  };

  const agentNodesForConfig = nodes
    .filter((n) => n.type === 'agent')
    .map((n) => ({ id: n.id, data: n.data as unknown as AgentNodeData }));

  // Show workflow selector if no configId and not in editor mode
  if (!configId && !showEditor) {
    return (
      <WorkflowSelector 
        onCreateNew={() => setShowEditor(true)} 
      />
    );
  }

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              if (configId) {
                navigate('/multi-agent-canvas');
              } else {
                setShowEditor(false);
              }
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Multi-Agent Canvas</h1>
            <p className="text-muted-foreground text-sm lg:text-base mt-1 hidden sm:block">
              Build and configure multi-agent workflows
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={deleteSelectedNodes} className="gap-1.5">
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
          </Button>
          <WorkflowImportExport
            configName={configName}
            nodes={nodes}
            edges={edges}
            onImport={handleImport}
          />
          {isConnected && <CollaboratorAvatars collaborators={collaborators} />}
          <Button variant="outline" size="sm" onClick={() => setPublishDialogOpen(true)} className="gap-1.5">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Publish</span>
          </Button>
          {configId && (
            <>
              <Button variant="outline" size="sm" onClick={() => setScheduleDialogOpen(true)} className="gap-1.5">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Schedule</span>
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1.5">
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </>
          )}
          <Button size="sm" onClick={runWorkflow} className="gap-1.5">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Test Chat</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[calc(100%-5rem)]">
        {/* Sidebar */}
        <Card className="lg:col-span-1 overflow-auto">
          <CardHeader>
            <CardTitle className="text-lg">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Config Name */}
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="Config name..."
              />
            </div>

            {/* Add Agent */}
            <div className="space-y-2">
              <Label>Add Agent</Label>
              <Select value={selectedAgentToAdd} onValueChange={setSelectedAgentToAdd}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent..." />
                </SelectTrigger>
                <SelectContent>
                  {availableAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={addAgentNode}
                disabled={!selectedAgentToAdd}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add to Canvas
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Instructions</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Click agent to configure I/O</li>
                <li>• Drag nodes to reposition</li>
                <li>• Connect by dragging handles</li>
                <li>• Start/End nodes cannot be deleted</li>
              </ul>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Agents in Canvas</p>
              <div className="space-y-2">
                {nodes
                  .filter((n) => n.type === 'agent')
                  .map((node) => {
                    const data = node.data as unknown as AgentNodeData;
                    return (
                      <div
                        key={node.id}
                        className="flex items-center gap-2 p-2 bg-muted rounded-md cursor-pointer hover:bg-muted/80"
                        onClick={() => setSelectedNodeForConfig(node)}
                      >
                        <Bot className="h-4 w-4 text-primary" />
                        <span className="text-sm flex-1">{data.label}</span>
                        <Settings2 className="h-3 w-3 text-muted-foreground" />
                      </div>
                    );
                  })}
                {nodes.filter((n) => n.type === 'agent').length === 0 && (
                  <p className="text-xs text-muted-foreground">No agents added yet</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Canvas */}
        <Card className="lg:col-span-4 overflow-hidden">
          <div className="h-full w-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-background"
              defaultEdgeOptions={{
                animated: true,
                style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
              }}
            >
              <Controls className="!bg-card !border-border" />
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="hsl(var(--muted-foreground) / 0.2)"
              />
            </ReactFlow>
          </div>
        </Card>
      </div>

      {/* Agent Config Sheet */}
      {selectedNodeForConfig && (
        <AgentNodeConfig
          open={!!selectedNodeForConfig}
          onOpenChange={(open) => !open && setSelectedNodeForConfig(null)}
          nodeData={selectedNodeForConfig.data as unknown as AgentNodeData}
          allNodes={agentNodesForConfig}
          folders={folders}
          onUpdateNode={handleUpdateNodeConfig}
        />
      )}

      {/* Chat Panel */}
      <AgentChatPanel
        agents={chatAgents}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        workflowId={configId}
        workspaceId={currentWorkspace?.id}
      />

      {/* Publish to Marketplace Dialog */}
      <PublishToMarketplaceDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        itemType="multi_agent"
        configData={{
          agent_nodes: nodes.filter((n) => n.type === 'agent').map((n) => n.data),
          connections: edges,
        }}
        canvasData={{ nodes, edges }}
        agentCount={nodes.filter((n) => n.type === 'agent').length}
        defaultName={configName}
        defaultDescription={configDescription}
        sourceConfigId={configId}
      />

      {/* Schedule Dialog */}
      {configId && currentWorkspace && (
        <WorkflowScheduleDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          workflowId={configId}
          workflowName={configName}
          workspaceId={currentWorkspace.id}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] })}
        />
      )}
    </div>
  );
};
