import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const statusConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  pending: { icon: Clock, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  running: { icon: Loader2, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  completed: { icon: CheckCircle, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  failed: { icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10' },
};

export const RecentWorkflows: React.FC = () => {
  const { currentWorkspace } = useWorkspace();

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['recent-workflows', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data, error } = await supabase
        .from('workflow_runs')
        .select(`
          *,
          multi_agent_configs!workflow_id (
            name,
            description
          )
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace,
    refetchInterval: 15000,
  });

  const handleRunWorkflow = async (workflowId: string) => {
    try {
      const response = await supabase.functions.invoke('run-workflow', {
        body: { 
          workflowId,
          workspaceId: currentWorkspace?.id,
          triggerType: 'manual',
        },
      });

      if (response.error) throw response.error;
      
      toast.success('Workflow started successfully');
    } catch (error) {
      console.error('Failed to run workflow:', error);
      toast.error('Failed to start workflow');
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Play className="h-5 w-5 text-primary" />
          Recent Workflows
        </CardTitle>
        <Link to="/workflow-runs">
          <Button variant="ghost" size="sm" className="text-xs">
            View All <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : workflows && workflows.length > 0 ? (
          <div className="space-y-3">
            {workflows.map((run) => {
              const config = statusConfig[run.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              const workflowName = (run.multi_agent_configs as any)?.name || 'Unknown Workflow';

              return (
                <div
                  key={run.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <StatusIcon className={`h-4 w-4 ${config.color} ${run.status === 'running' ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{workflowName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {run.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  {run.workflow_id && run.status !== 'running' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRunWorkflow(run.workflow_id!)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Play className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No workflow runs yet</p>
            <Link to="/multi-agent-canvas" className="mt-2">
              <Button variant="outline" size="sm">
                Create Workflow
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
