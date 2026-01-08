import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, GitBranch, Trash2, Play, Clock } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CreateWorkflowDialog } from '@/components/dialogs/CreateWorkflowDialog';
import { WorkflowScheduleDialog } from '@/components/scheduling/WorkflowScheduleDialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export const WorkflowCanvas: React.FC = () => {
  const { t } = useApp();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<{ id: string; name: string } | null>(null);

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_workflows')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('agent_workflows').delete().eq('id', id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.workflowCanvas.title}</h1>
          <p className="text-muted-foreground mt-1">Build workflows and connect agents</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          {t.workflowCanvas.newWorkflow}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Workflows
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">{t.common.loading}</p>
          ) : workflows && workflows.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workflows.map((workflow) => (
                <Card key={workflow.id} className="relative">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{workflow.name}</h3>
                        <Badge variant="outline" className="mt-2">
                          {workflow.execution_mode === 'sequential' ? t.workflowCanvas.sequential : t.workflowCanvas.parallel}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedWorkflow({ id: workflow.id, name: workflow.name });
                            setScheduleDialogOpen(true);
                          }}
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(workflow.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {workflow.description && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                        {workflow.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No workflows yet. Click "New Workflow" to get started.
            </p>
          )}
        </CardContent>
      </Card>

      <CreateWorkflowDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['workflows'] })}
      />

      {/* Schedule Dialog */}
      {selectedWorkflow && currentWorkspace && (
        <WorkflowScheduleDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          workflowId={selectedWorkflow.id}
          workflowName={selectedWorkflow.name}
          workspaceId={currentWorkspace.id}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] });
            toast({ title: 'Schedule Created', description: 'Workflow has been scheduled' });
          }}
        />
      )}
    </div>
  );
};
