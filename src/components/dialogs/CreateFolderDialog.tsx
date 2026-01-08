import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');

  const { data: folders } = useQuery({
    queryKey: ['folders-for-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_folders')
        .select('id, name, parent_id')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Error', description: 'Please enter a folder name', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.from('knowledge_folders').insert({
        name: name.trim(),
        parent_id: parentId || null,
        workspace_id: currentWorkspace?.id || null,
        created_by: user.user.id,
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Folder created successfully' });
      setName('');
      setParentId('');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder_name">Folder Name *</Label>
            <Input
              id="folder_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Legal Contracts"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_folder">Parent Folder (optional)</Label>
            <Select value={parentId} onValueChange={(val) => setParentId(val === 'root' ? '' : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Root folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">Root folder</SelectItem>
                {folders?.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
