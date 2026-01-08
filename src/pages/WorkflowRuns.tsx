import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Calendar,
  RefreshCw,
  Loader2,
  GitBranch,
  Eye,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  trigger_type: 'manual' | 'scheduled' | 'webhook';
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  workflow?: {
    name: string;
  };
}

interface ScheduledJob {
  id: string;
  name: string;
  workflow_id: string;
  cron_expression: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  workflow?: {
    name: string;
  };
}

const statusConfig = {
  pending: { icon: Clock, color: 'bg-yellow-500/10 text-yellow-500', label: 'Pending' },
  running: { icon: RefreshCw, color: 'bg-blue-500/10 text-blue-500', label: 'Running' },
  completed: { icon: CheckCircle2, color: 'bg-green-500/10 text-green-500', label: 'Completed' },
  failed: { icon: XCircle, color: 'bg-red-500/10 text-red-500', label: 'Failed' },
  cancelled: { icon: AlertCircle, color: 'bg-gray-500/10 text-gray-500', label: 'Cancelled' },
};

const triggerConfig = {
  manual: { icon: Play, label: 'Manual' },
  scheduled: { icon: Calendar, label: 'Scheduled' },
  webhook: { icon: GitBranch, label: 'Webhook' },
};

export const WorkflowRuns: React.FC = () => {
  const { t } = useApp();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: runs, isLoading, refetch } = useQuery({
    queryKey: ['workflow-runs', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from('workflow_runs')
        .select(`
          *,
          workflow:multi_agent_configs(name)
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as WorkflowRun[];
    },
    enabled: !!currentWorkspace,
  });

  const { data: scheduledJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['scheduled-jobs', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from('scheduled_jobs')
        .select(`
          *,
          workflow:multi_agent_configs(name)
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as ScheduledJob[];
    },
    enabled: !!currentWorkspace,
  });

  const { data: stats } = useQuery({
    queryKey: ['workflow-run-stats', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return { total: 0, completed: 0, failed: 0, running: 0 };
      const { data, error } = await supabase
        .from('workflow_runs')
        .select('status')
        .eq('workspace_id', currentWorkspace.id);
      if (error) throw error;
      
      return {
        total: data.length,
        completed: data.filter(r => r.status === 'completed').length,
        failed: data.filter(r => r.status === 'failed').length,
        running: data.filter(r => r.status === 'running').length,
      };
    },
    enabled: !!currentWorkspace,
  });

  const toggleJobActive = async (jobId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('scheduled_jobs')
      .update({ is_active: isActive })
      .eq('id', jobId);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to update schedule', variant: 'destructive' });
    } else {
      queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] });
      toast({ title: 'Updated', description: isActive ? 'Schedule activated' : 'Schedule paused' });
    }
  };

  const deleteJob = async (jobId: string) => {
    const { error } = await supabase
      .from('scheduled_jobs')
      .delete()
      .eq('id', jobId);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete schedule', variant: 'destructive' });
    } else {
      queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] });
      toast({ title: 'Deleted', description: 'Schedule removed' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Runs</h1>
          <p className="text-muted-foreground mt-1">Monitor and track workflow executions</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Play className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.total || 0}</p>
              <p className="text-sm text-muted-foreground">Total Runs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.completed || 0}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.failed || 0}</p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.running || 0}</p>
              <p className="text-sm text-muted-foreground">Running</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Runs and Schedules */}
      <Tabs defaultValue="runs" className="w-full">
        <TabsList>
          <TabsTrigger value="runs">Execution History</TabsTrigger>
          <TabsTrigger value="schedules">
            Scheduled Jobs
            {scheduledJobs && scheduledJobs.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {scheduledJobs.filter(j => j.is_active).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="runs">
          <Card>
            <CardHeader>
              <CardTitle>Execution History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : runs && runs.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {runs.map(run => {
                      const status = statusConfig[run.status];
                      const trigger = triggerConfig[run.trigger_type];
                      const StatusIcon = status.icon;
                      const TriggerIcon = trigger.icon;
                      
                      return (
                        <div 
                          key={run.id}
                          className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/workflow-monitor/${run.id}`)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${status.color}`}>
                              <StatusIcon className={`h-5 w-5 ${run.status === 'running' ? 'animate-spin' : ''}`} />
                            </div>
                            <div>
                              <p className="font-medium">{run.workflow?.name || 'Unknown Workflow'}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <TriggerIcon className="h-3 w-3" />
                                <span>{trigger.label}</span>
                                <span>•</span>
                                <span>{formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={status.color}>
                              {status.label}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/workflow-monitor/${run.id}`);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Monitor
                            </Button>
                            {run.error_message && (
                              <span className="text-xs text-red-500 max-w-[200px] truncate">
                                {run.error_message}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No workflow runs yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Run a workflow from the Multi-Agent Canvas to see execution history
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Scheduled Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : scheduledJobs && scheduledJobs.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {scheduledJobs.map(job => (
                      <div 
                        key={job.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-border"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            job.is_active ? 'bg-green-500/10' : 'bg-muted'
                          }`}>
                            <Clock className={`h-5 w-5 ${job.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <p className="font-medium">{job.name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                                {job.cron_expression}
                              </span>
                              <span>•</span>
                              <span>{job.workflow?.name || 'Unknown Workflow'}</span>
                            </div>
                            {job.last_run_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Last run: {formatDistanceToNow(new Date(job.last_run_at), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {job.is_active ? 'Active' : 'Paused'}
                            </span>
                            <Switch 
                              checked={job.is_active}
                              onCheckedChange={(checked) => toggleJobActive(job.id, checked)}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteJob(job.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No scheduled jobs</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Schedule workflows from the Multi-Agent Canvas or Workflow Canvas
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
