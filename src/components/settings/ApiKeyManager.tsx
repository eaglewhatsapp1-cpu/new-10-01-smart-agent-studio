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
import { Key, Plus, Trash2, Check, Loader2, Shield } from 'lucide-react';

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

interface SecureApiKey {
  id: string;
  workspace_id: string;
  provider: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  masked_key: string;
}

export const ApiKeyManager: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);

  // Fetch API keys via edge function (returns masked keys only)
  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['workspace-api-keys', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('manage-api-keys', {
        body: { action: 'list', workspace_id: currentWorkspace.id }
      });

      if (response.error) throw response.error;
      return (response.data?.keys || []) as SecureApiKey[];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Save API key via edge function (encrypts on server)
  const saveMutation = useMutation({
    mutationFn: async ({ provider, apiKeyValue, name, keyId }: { 
      provider: string; 
      apiKeyValue: string; 
      name?: string;
      keyId?: string;
    }) => {
      if (!currentWorkspace?.id) throw new Error('No workspace selected');

      const action = keyId ? 'update' : 'create';
      const response = await supabase.functions.invoke('manage-api-keys', {
        body: { 
          action,
          workspace_id: currentWorkspace.id,
          provider,
          api_key: apiKeyValue,
          display_name: name || null,
          key_id: keyId
        }
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-api-keys'] });
      toast.success(editingKeyId ? 'API key updated securely' : 'API key saved securely');
      closeDialog();
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Delete API key via edge function
  const deleteMutation = useMutation({
    mutationFn: async (keyId: string) => {
      if (!currentWorkspace?.id) throw new Error('No workspace selected');

      const response = await supabase.functions.invoke('manage-api-keys', {
        body: { 
          action: 'delete',
          workspace_id: currentWorkspace.id,
          key_id: keyId
        }
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
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
    setEditingKeyId(null);
  };

  const handleSave = () => {
    if (!selectedProvider || !apiKey) {
      toast.error('Please select a provider and enter an API key');
      return;
    }
    saveMutation.mutate({ 
      provider: selectedProvider, 
      apiKeyValue: apiKey, 
      name: displayName,
      keyId: editingKeyId || undefined
    });
  };

  const handleEdit = (key: SecureApiKey) => {
    setEditingKeyId(key.id);
    setSelectedProvider(key.provider);
    setDisplayName(key.display_name || '');
    setApiKey(''); // Never show existing key
    setIsDialogOpen(true);
  };

  const getProviderInfo = (providerId: string) => {
    return API_PROVIDERS.find(p => p.id === providerId) || { id: providerId, name: providerId, description: '' };
  };

  const availableProviders = API_PROVIDERS.filter(
    p => !apiKeys?.some(k => k.provider === p.id) || (editingKeyId && apiKeys?.find(k => k.id === editingKeyId)?.provider === p.id)
  );

  return (
    <div className="space-y-4">
      {/* Security notice */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <Shield className="h-4 w-4 text-primary" />
        <p className="text-xs text-muted-foreground">
          API keys are encrypted server-side and never exposed to the client.
        </p>
      </div>

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
                      {key.masked_key}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(key)}
                    title="Update key"
                  >
                    <Key className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(key.id)}
                    title="Delete key"
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
            <DialogTitle>{editingKeyId ? 'Update API Key' : 'Add API Key'}</DialogTitle>
            <DialogDescription>
              {editingKeyId 
                ? 'Enter a new API key to replace the existing one. The key will be encrypted before storage.'
                : 'Select a provider and enter your API key. Keys are encrypted server-side before storage.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select 
                value={selectedProvider} 
                onValueChange={setSelectedProvider}
                disabled={!!editingKeyId}
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
                placeholder={editingKeyId ? 'Enter new API key' : 'sk-...'}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Encrypted with AES-256-GCM before storage
              </p>
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
              {editingKeyId ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
