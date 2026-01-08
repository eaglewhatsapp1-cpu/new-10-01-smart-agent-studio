import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Store, X, Loader2 } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

interface PublishToMarketplaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: 'single_agent' | 'multi_agent';
  configData: Record<string, unknown>;
  canvasData?: Record<string, unknown>;
  agentCount?: number;
  defaultName?: string;
  defaultDescription?: string;
  sourceConfigId?: string;
  onSuccess?: () => void;
}

const CATEGORIES = [
  'Customer Service',
  'Research & Analysis',
  'Content Creation',
  'Data Processing',
  'Sales & Marketing',
  'HR & Recruitment',
  'Legal & Compliance',
  'Technical Support',
  'Education & Training',
  'Other',
];

export const PublishToMarketplaceDialog: React.FC<PublishToMarketplaceDialogProps> = ({
  open,
  onOpenChange,
  itemType,
  configData,
  canvasData,
  agentCount = 1,
  defaultName = '',
  defaultDescription = '',
  sourceConfigId,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);
  const [category, setCategory] = useState<string>('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handlePublish = async () => {
    if (!name.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name for your marketplace item',
        variant: 'destructive',
      });
      return;
    }

    if (!currentWorkspace) {
      toast({
        title: 'No Workspace',
        description: 'Please select a workspace first',
        variant: 'destructive',
      });
      return;
    }

    setPublishing(true);
    const { data: user } = await supabase.auth.getUser();

    try {
      const { error } = await supabase.from('marketplace_items').insert({
        name: name.trim(),
        description: description.trim() || null,
        item_type: itemType,
        config_data: configData as Json,
        canvas_data: canvasData as Json || null,
        agent_count: agentCount,
        tags: tags.length > 0 ? tags : null,
        category: category || null,
        publisher_id: user.user?.id!,
        publisher_workspace_id: currentWorkspace.id,
        source_config_id: sourceConfigId || null,
        is_public: true,
      });

      if (error) throw error;

      toast({
        title: 'Published Successfully',
        description: 'Your configuration is now available in the marketplace',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Publish error:', error);
      toast({
        title: 'Publish Failed',
        description: 'Failed to publish to marketplace',
        variant: 'destructive',
      });
    } finally {
      setPublishing(false);
    }
  };

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setName(defaultName);
      setDescription(defaultDescription);
      setCategory('');
      setTags([]);
      setTagInput('');
    }
  }, [open, defaultName, defaultDescription]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Publish to Marketplace
          </DialogTitle>
          <DialogDescription>
            Share your {itemType === 'single_agent' ? 'agent' : 'multi-agent workflow'} with the community.
            Others can import and customize it for their own use.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a descriptive name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this configuration does and when to use it"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add tags and press Enter"
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <p>
              <strong>Note:</strong> Publishing makes this configuration visible to all users across workspaces.
              They can import a copy to customize for their own needs.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={publishing}>
            {publishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Store className="h-4 w-4 mr-2" />
                Publish
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
