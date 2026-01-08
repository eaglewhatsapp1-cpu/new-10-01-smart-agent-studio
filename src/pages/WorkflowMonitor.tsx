import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Bot,
  Loader2,
  Activity,
  Terminal,
  Zap
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Json } from '@/integrations/supabase/types';

interface ExecutionLog {
  timestamp: string;
  type: 'start' | 'complete' | 'error' | 'warning' | 'info' | 'skipped';
  agent?: string;
  message: string;
  preview?: string;
}

interface WorkflowRunData {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  trigger_type: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  execution_logs: ExecutionLog[] | null;
  input_data: Record<string, unknown> | null;
  output_data: Record<string, { agent: string; response: string }> | null;
  created_at: string;
  workflow?: {
    name: string;
    agent_nodes: Array<{ id: string; label: string; agentId: string }> | null;
  };
}

const logTypeConfig = {
  start: { icon: Play, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  complete: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  warning: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  info: { icon: Activity, color: 'text-muted-foreground', bg: 'bg-muted' },
  skipped: { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
};

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-500' },
  running: { label: 'Running', color: 'bg-blue-500/10 text-blue-500' },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-500' },
  failed: { label: 'Failed', color: 'bg-red-500/10 text-red-500' },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground' },
};

export const WorkflowMonitor: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [realtimeLogs, setRealtimeLogs] = useState<ExecutionLog[]>([]);

  const { data: run, isLoading, refetch } = useQuery({
    queryKey: ['workflow-run', runId],
    queryFn: async () => {
      if (!runId) return null;
      const { data, error } = await supabase
        .from('workflow_runs')
        .select(`
          *,
          workflow:multi_agent_configs(name, agent_nodes)
        `)
        .eq('id', runId)
        .single();
      if (error) throw error;
      
      const typedData = data as unknown as WorkflowRunData;
      if (typedData.execution_logs) {
        setRealtimeLogs(typedData.execution_logs);
      }
      return typedData;
    },
    enabled: !!runId,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === 'running' ? 2000 : false;
    },
  });

  // Subscribe to realtime updates for this specific run
  useEffect(() => {
    if (!runId) return;

    const channel = supabase
      .channel(`workflow-run-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workflow_runs',
          filter: `id=eq.${runId}`,
        },
        (payload) => {
          const newData = payload.new as { execution_logs: Json; status: string };
          if (newData.execution_logs && Array.isArray(newData.execution_logs)) {
            setRealtimeLogs(newData.execution_logs as unknown as ExecutionLog[]);
          }
          if (newData.status !== 'running') {
            refetch();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId, refetch]);

  const completedAgents = realtimeLogs.filter(log => log.type === 'complete').length;
  const totalAgents = run?.workflow?.agent_nodes?.length || 0;
  const progress = totalAgents > 0 ? (completedAgents / totalAgents) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Workflow run not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/workflow-runs')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Runs
        </Button>
      </div>
    );
  }

  const status = statusConfig[run.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/workflow-runs')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              {run.workflow?.name || 'Workflow Run'}
              <Badge className={status.color}>{status.label}</Badge>
            </h1>
            <p className="text-muted-foreground text-sm">
              Started {run.started_at ? formatDistanceToNow(new Date(run.started_at), { addSuffix: true }) : 'N/A'}
            </p>
          </div>
        </div>
        {run.status === 'running' && (
          <div className="flex items-center gap-2 text-blue-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="font-medium">Live Monitoring</span>
          </div>
        )}
      </div>

      {/* Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Execution Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {completedAgents} of {totalAgents} agents completed
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
            
            {/* Agent Status Pills */}
            <div className="flex flex-wrap gap-2 mt-4">
              {run.workflow?.agent_nodes?.map((node) => {
                const isCompleted = realtimeLogs.some(
                  log => log.agent === node.label && log.type === 'complete'
                );
                const isRunning = realtimeLogs.some(
                  log => log.agent === node.label && log.type === 'start'
                ) && !isCompleted;
                const hasError = realtimeLogs.some(
                  log => log.agent === node.label && log.type === 'error'
                );

                return (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                      hasError
                        ? 'border-red-500/50 bg-red-500/10'
                        : isCompleted
                        ? 'border-green-500/50 bg-green-500/10'
                        : isRunning
                        ? 'border-blue-500/50 bg-blue-500/10'
                        : 'border-border bg-muted/50'
                    }`}
                  >
                    <Bot className={`h-4 w-4 ${
                      hasError
                        ? 'text-red-500'
                        : isCompleted
                        ? 'text-green-500'
                        : isRunning
                        ? 'text-blue-500'
                        : 'text-muted-foreground'
                    }`} />
                    <span className="text-sm font-medium">{node.label}</span>
                    {isRunning && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                    {isCompleted && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                    {hasError && <XCircle className="h-3 w-3 text-red-500" />}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Execution Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Execution Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <AnimatePresence mode="popLayout">
                {realtimeLogs.length > 0 ? (
                  <div className="space-y-3">
                    {realtimeLogs.map((log, index) => {
                      const config = logTypeConfig[log.type];
                      const LogIcon = config.icon;
                      return (
                        <motion.div
                          key={`${log.timestamp}-${index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          <div className={`h-8 w-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                            <LogIcon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm">{log.message}</p>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {format(new Date(log.timestamp), 'HH:mm:ss')}
                              </span>
                            </div>
                            {log.agent && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Agent: {log.agent}
                              </p>
                            )}
                            {log.preview && (
                              <p className="text-xs text-muted-foreground mt-2 p-2 bg-background rounded border border-border">
                                {log.preview}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2" />
                    <p>Waiting for execution logs...</p>
                  </div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Agent Outputs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Agent Outputs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {run.output_data && Object.keys(run.output_data).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(run.output_data).map(([agentId, output]) => (
                    <motion.div
                      key={agentId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Bot className="h-4 w-4 text-primary" />
                        <span className="font-medium">{output.agent}</span>
                        <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {output.response}
                      </p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2" />
                  <p>No outputs yet</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Error Message */}
      {run.error_message && (
        <Card className="border-red-500/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-500">Execution Error</p>
                <p className="text-sm text-muted-foreground mt-1">{run.error_message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timing Info */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{format(new Date(run.created_at), 'MMM d, HH:mm:ss')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Started</p>
              <p className="font-medium">
                {run.started_at ? format(new Date(run.started_at), 'MMM d, HH:mm:ss') : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="font-medium">
                {run.completed_at ? format(new Date(run.completed_at), 'MMM d, HH:mm:ss') : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
