import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Building2 } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { WorkspaceDialog } from '@/components/dialogs/WorkspaceDialog';

export const WorkspaceSelector: React.FC = () => {
  const { workspaces, currentWorkspace, setCurrentWorkspace, isLoading } = useWorkspace();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex items-center gap-2 mb-2">
        <Building2 className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Workspace
        </span>
      </div>
      <div className="flex gap-2">
        <Select
          value={currentWorkspace?.id || ''}
          onValueChange={(value) => {
            const workspace = workspaces.find((w) => w.id === value);
            if (workspace) setCurrentWorkspace(workspace);
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select workspace..." />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((workspace) => (
              <SelectItem key={workspace.id} value={workspace.id}>
                {workspace.name}
              </SelectItem>
            ))}
            {workspaces.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No workspaces yet
              </div>
            )}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <WorkspaceDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};
