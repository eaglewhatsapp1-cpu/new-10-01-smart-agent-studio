import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Key, Plus, Trash2, Check, Eye, EyeOff, Loader2 } from 'lucide-react';

interface ApiKeyProvider {
  id: string;
  name: string;
  description: string;
}

const API_PROVIDERS: ApiKeyProvider[] = [
  { id: 'openai', name: 'OpenAI', description: 'GPT-4, GPT-3.5, DALL-E, Whisper' },
  { id: 'anthropic', name: 'Anthropic', description: 'Claude 3.5, Claude 3' },
  { id: 'google', name: 'Google AI', description: 'Gemini Pro, Gemini Flash' },
  { id: 'cohere', name: 'Cohere', description: 'Command, Embed, Rerank' },
  { id: 'mistral', name: 'Mistral AI', description: 'Mistral Large, Medium, Small' },
  { id: 'groq', name: 'Groq', description: 'LLaMA, Mixtral (Fast inference)' },
  { id: 'together', name: 'Together AI', description: 'Open-source models' },
  { id: 'perplexity', name: 'Perplexity', description: 'Online LLM with search' },
  { id: 'huggingface', name: 'Hugging Face', description: 'Inference API' },
  { id: 'custom', name: 'Custom Provider', description: 'Other API providers' },
];

interface WorkspaceApiKey {
  id: string;
  workspace_id: string;
  provider: string;
  api_key_encrypted: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
}

export const ApiKeyManager: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [editingKey, setEditingKey] = useState<WorkspaceApiKey | null>(null);

  // Fetch existing API keys
  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['workspace-api-keys', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('workspace_api_keys')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WorkspaceApiKey[];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Save API key mutation
  const saveMutation = useMutation({
    mutationFn: async ({ provider, apiKeyValue, name }: { provider: string; apiKeyValue: string; name?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentWorkspace?.id) throw new Error('Not authenticated');

      if (editingKey) {
        // Update existing key
        const { error } = await supabase
          .from('workspace_api_keys')
          .update({
            api_key_encrypted: apiKeyValue,
            display_name: name || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingKey.id);
        if (error) throw error;
      } else {
        // Insert new key (upsert)
        const { error } = await supabase
          .from('workspace_api_keys')
          .upsert({
            workspace_id: currentWorkspace.id,
            provider,
            api_key_encrypted: apiKeyValue,
            display_name: name || null,
            created_by: user.id,
          }, { onConflict: 'workspace_id,provider' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-api-keys'] });
      toast.success(editingKey ? 'API key updated' : 'API key saved');
      closeDialog();
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Delete API key mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workspace_api_keys')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-api-keys'] });
      toast.success('API key deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedProvider('');
    setApiKey('');
    setDisplayName('');
    setEditingKey(null);
  };

  const handleSave = () => {
    if (!selectedProvider || !apiKey) {
      toast.error('Please select a provider and enter an API key');
      return;
    }
    saveMutation.mutate({ provider: selectedProvider, apiKeyValue: apiKey, name: displayName });
  };

  const handleEdit = (key: WorkspaceApiKey) => {
    setEditingKey(key);
    setSelectedProvider(key.provider);
    setDisplayName(key.display_name || '');
    setApiKey(''); // Don't show existing key for security
    setIsDialogOpen(true);
  };

  const getProviderInfo = (providerId: string) => {
    return API_PROVIDERS.find(p => p.id === providerId) || { id: providerId, name: providerId, description: '' };
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  const availableProviders = API_PROVIDERS.filter(
    p => !apiKeys?.some(k => k.provider === p.id) || editingKey?.provider === p.id
  );

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {apiKeys?.length ? `${apiKeys.length} key(s) configured` : 'No keys configured'}
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsDialogOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Key
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Existing keys list */}
      {apiKeys && apiKeys.length > 0 && (
        <div className="space-y-2">
          {apiKeys.map((key) => {
            const provider = getProviderInfo(key.provider);
            return (
              <div 
                key={key.id} 
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Key className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{provider.name}</span>
                      {key.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      {showKey[key.id] ? key.api_key_encrypted : maskKey(key.api_key_encrypted)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowKey(prev => ({ ...prev, [key.id]: !prev[key.id] }))}
                  >
                    {showKey[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(key)}
                  >
                    <Key className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(key.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingKey ? 'Update API Key' : 'Add API Key'}</DialogTitle>
            <DialogDescription>
              {editingKey 
                ? 'Enter a new API key to replace the existing one.'
                : 'Select a provider and enter your API key. Keys are stored securely.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select 
                value={selectedProvider} 
                onValueChange={setSelectedProvider}
                disabled={!!editingKey}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      <div className="flex flex-col">
                        <span>{provider.name}</span>
                        <span className="text-xs text-muted-foreground">{provider.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={editingKey ? 'Enter new API key' : 'sk-...'}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label>Display Name (Optional)</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Production Key"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending || !selectedProvider || !apiKey}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingKey ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
