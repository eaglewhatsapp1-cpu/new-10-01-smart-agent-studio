import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database, ArrowRight, Folder, Bot, FileText, FileJson, FileCode, File, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

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

interface AgentNodeConfigProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeData: AgentNodeData;
  allNodes: { id: string; data: AgentNodeData }[];
  folders: { id: string; name: string; folder_type?: string | null }[];
  onUpdateNode: (updates: Partial<AgentNodeData>) => void;
}

const getFolderTypeIcon = (type: string | null | undefined) => {
  switch (type) {
    case 'documents':
      return <FileText className="h-3.5 w-3.5 text-blue-500" />;
    case 'data':
      return <FileJson className="h-3.5 w-3.5 text-green-500" />;
    case 'code':
      return <FileCode className="h-3.5 w-3.5 text-purple-500" />;
    default:
      return <Folder className="h-3.5 w-3.5 text-amber-500" />;
  }
};

const getFolderTypeBadge = (type: string | null | undefined) => {
  switch (type) {
    case 'documents':
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600">Docs</Badge>;
    case 'data':
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600">Data</Badge>;
    case 'code':
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600">Code</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">General</Badge>;
  }
};

export const AgentNodeConfig: React.FC<AgentNodeConfigProps> = ({
  open,
  onOpenChange,
  nodeData,
  allNodes,
  folders,
  onUpdateNode,
}) => {
  const otherAgents = allNodes.filter((n) => n.data.agentId !== nodeData.agentId);

  const handleInputFolderToggle = (folderId: string, checked: boolean) => {
    const currentFolders = nodeData.inputs?.fromKnowledgeBase || [];
    const newFolders = checked
      ? [...currentFolders, folderId]
      : currentFolders.filter((id) => id !== folderId);
    onUpdateNode({
      inputs: {
        ...nodeData.inputs,
        fromKnowledgeBase: newFolders,
        fromAgents: nodeData.inputs?.fromAgents || [],
      },
    });
  };

  const handleInputAgentToggle = (agentId: string, checked: boolean) => {
    const currentAgents = nodeData.inputs?.fromAgents || [];
    const newAgents = checked
      ? [...currentAgents, agentId]
      : currentAgents.filter((id) => id !== agentId);
    onUpdateNode({
      inputs: {
        ...nodeData.inputs,
        fromKnowledgeBase: nodeData.inputs?.fromKnowledgeBase || [],
        fromAgents: newAgents,
      },
    });
  };

  const handleOutputToKBToggle = (checked: boolean) => {
    onUpdateNode({
      outputs: {
        ...nodeData.outputs,
        toKnowledgeBase: checked,
        toAgents: nodeData.outputs?.toAgents || [],
      },
    });
  };

  const handleOutputAgentToggle = (agentId: string, checked: boolean) => {
    const currentAgents = nodeData.outputs?.toAgents || [];
    const newAgents = checked
      ? [...currentAgents, agentId]
      : currentAgents.filter((id) => id !== agentId);
    onUpdateNode({
      outputs: {
        ...nodeData.outputs,
        toKnowledgeBase: nodeData.outputs?.toKnowledgeBase || false,
        toAgents: newAgents,
      },
    });
  };

  const selectAllFolders = () => {
    onUpdateNode({
      inputs: {
        ...nodeData.inputs,
        fromKnowledgeBase: folders.map(f => f.id),
        fromAgents: nodeData.inputs?.fromAgents || [],
      },
    });
  };

  const clearAllFolders = () => {
    onUpdateNode({
      inputs: {
        ...nodeData.inputs,
        fromKnowledgeBase: [],
        fromAgents: nodeData.inputs?.fromAgents || [],
      },
    });
  };

  const inputCount = (nodeData.inputs?.fromKnowledgeBase?.length || 0) + (nodeData.inputs?.fromAgents?.length || 0);
  const outputCount = (nodeData.outputs?.toKnowledgeBase ? 1 : 0) + (nodeData.outputs?.toAgents?.length || 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[440px] lg:w-[520px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-base lg:text-lg">
            <Bot className="h-5 w-5 text-primary" />
            {nodeData.label}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{nodeData.model}</Badge>
            {nodeData.role && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {nodeData.role}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="py-4 space-y-6">
            {/* INPUTS Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <ArrowDownToLine className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold">Inputs</h3>
                  <Badge variant="secondary" className="text-xs">{inputCount}</Badge>
                </div>
              </div>

              {/* From Knowledge Base */}
              <div className="space-y-3 rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Knowledge Base Folders</Label>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={selectAllFolders}
                      className="text-xs text-primary hover:underline"
                    >
                      All
                    </button>
                    <span className="text-muted-foreground">/</span>
                    <button
                      onClick={clearAllFolders}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {folders.length > 0 ? (
                    folders.map((folder) => {
                      const isSelected = nodeData.inputs?.fromKnowledgeBase?.includes(folder.id);
                      return (
                        <div
                          key={folder.id}
                          className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-primary/10 border border-primary/30' 
                              : 'hover:bg-muted border border-transparent'
                          }`}
                          onClick={() => handleInputFolderToggle(folder.id, !isSelected)}
                        >
                          <Checkbox
                            id={`input-folder-${folder.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleInputFolderToggle(folder.id, checked as boolean)
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getFolderTypeIcon(folder.folder_type)}
                            <span className="text-sm truncate">{folder.name}</span>
                          </div>
                          {getFolderTypeBadge(folder.folder_type)}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4">
                      <File className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-xs text-muted-foreground">No folders available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* From Other Agents */}
              <div className="space-y-3 rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">From Previous Agents</Label>
                </div>
                <div className="space-y-1.5">
                  {otherAgents.length > 0 ? (
                    otherAgents.map((agent) => {
                      const isSelected = nodeData.inputs?.fromAgents?.includes(agent.data.agentId);
                      return (
                        <div
                          key={agent.id}
                          className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-accent/50 border border-accent' 
                              : 'hover:bg-muted border border-transparent'
                          }`}
                          onClick={() => handleInputAgentToggle(agent.data.agentId, !isSelected)}
                        >
                          <Checkbox
                            id={`input-agent-${agent.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleInputAgentToggle(agent.data.agentId, checked as boolean)
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                              <Bot className="h-3 w-3" />
                            </div>
                            <span className="text-sm">{agent.data.label}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {agent.data.model}
                          </Badge>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4">
                      <Bot className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-xs text-muted-foreground">No other agents on canvas</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* OUTPUTS Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-accent/20">
                  <ArrowUpFromLine className="h-4 w-4 text-accent-foreground" />
                </div>
                <h3 className="font-semibold">Outputs</h3>
                <Badge variant="secondary" className="text-xs">{outputCount}</Badge>
              </div>

              {/* To Knowledge Base */}
              <div className="space-y-3 rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Save to Knowledge Base</Label>
                </div>
                <div
                  className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                    nodeData.outputs?.toKnowledgeBase 
                      ? 'bg-green-500/10 border border-green-500/30' 
                      : 'hover:bg-muted border border-transparent'
                  }`}
                  onClick={() => handleOutputToKBToggle(!nodeData.outputs?.toKnowledgeBase)}
                >
                  <Checkbox
                    id="output-to-kb"
                    checked={nodeData.outputs?.toKnowledgeBase}
                    onCheckedChange={(checked) => handleOutputToKBToggle(checked as boolean)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-sm">Store agent output when exported</span>
                </div>
              </div>

              {/* To Other Agents */}
              <div className="space-y-3 rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Route to Agents</Label>
                </div>
                <div className="space-y-1.5">
                  {otherAgents.length > 0 ? (
                    otherAgents.map((agent) => {
                      const isSelected = nodeData.outputs?.toAgents?.includes(agent.data.agentId);
                      return (
                        <div
                          key={agent.id}
                          className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-accent/50 border border-accent' 
                              : 'hover:bg-muted border border-transparent'
                          }`}
                          onClick={() => handleOutputAgentToggle(agent.data.agentId, !isSelected)}
                        >
                          <Checkbox
                            id={`output-agent-${agent.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleOutputAgentToggle(agent.data.agentId, checked as boolean)
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                              <Bot className="h-3 w-3" />
                            </div>
                            <span className="text-sm">{agent.data.label}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {agent.data.model}
                          </Badge>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4">
                      <Bot className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-xs text-muted-foreground">No other agents on canvas</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Summary Footer */}
        <div className="border-t px-6 py-4 bg-muted/30">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Inputs:</span>
                <Badge variant="outline">{inputCount}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpFromLine className="h-4 w-4 text-accent-foreground" />
                <span className="text-muted-foreground">Outputs:</span>
                <Badge variant="outline">{outputCount}</Badge>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};