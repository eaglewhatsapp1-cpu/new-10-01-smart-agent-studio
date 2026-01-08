import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { 
  GitBranch, 
  Play, 
  Copy, 
  Edit, 
  Trash2, 
  Plus, 
  Clock,
  Bot,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WorkflowSelectorProps {
  onCreateNew: () => void;
}

export const WorkflowSelector: React.FC<WorkflowSelectorProps> = ({ onCreateNew }) => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['multi-agent-configs', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from('multi_agent_configs')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace,
  });

  const handleEdit = (workflowId: string) => {
    navigate(`/multi-agent-canvas/${workflowId}`);
  };

  const handleCopy = async (workflow: any) => {
    if (!currentWorkspace) return;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from('multi_agent_configs')
      .insert({
        name: `${workflow.name} (Copy)`,
        description: workflow.description,
        workspace_id: currentWorkspace.id,
        canvas_data: workflow.canvas_data,
        agent_nodes: workflow.agent_nodes,
        connections: workflow.connections,
        created_by: user.user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy workflow',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Copied',
        description: 'Workflow copied successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['multi-agent-configs'] });
      if (data) {
        navigate(`/multi-agent-canvas/${data.id}`);
      }
    }
  };

  const handleDelete = async (workflowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { error } = await supabase
      .from('multi_agent_configs')
      .delete()
      .eq('id', workflowId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete workflow',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Deleted',
        description: 'Workflow deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['multi-agent-configs'] });
    }
  };

  const handleRun = async (workflowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/multi-agent-canvas/${workflowId}`);
  };

  const getAgentCount = (workflow: any) => {
    const agentNodes = workflow.agent_nodes;
    if (Array.isArray(agentNodes)) {
      return agentNodes.length;
    }
    return 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Multi-Agent Canvas</h1>
          <p className="text-muted-foreground mt-1">
            Build and configure multi-agent workflows
          </p>
        </div>
        <Button onClick={onCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          New Workflow
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Your Workflows
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : workflows && workflows.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-20rem)]">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {workflows.map((workflow) => (
                  <Card 
                    key={workflow.id} 
                    className="cursor-pointer hover:border-primary/50 transition-colors group"
                    onClick={() => handleEdit(workflow.id)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                            {workflow.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Updated {formatDistanceToNow(new Date(workflow.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Bot className="h-3 w-3" />
                          {getAgentCount(workflow)} agent{getAgentCount(workflow) !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      
                      {workflow.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {workflow.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-1 pt-3 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 flex-1"
                          onClick={(e) => handleRun(workflow.id, e)}
                        >
                          <Play className="h-3.5 w-3.5" />
                          Open
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(workflow);
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => handleDelete(workflow.id, e)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12">
              <GitBranch className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg mb-2">No workflows yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Create your first multi-agent workflow to get started
              </p>
              <Button onClick={onCreateNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Workflow
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
