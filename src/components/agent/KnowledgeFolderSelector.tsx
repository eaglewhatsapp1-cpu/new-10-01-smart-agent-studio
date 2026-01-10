import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Database, Folder, FileText, FileJson, FileCode, File, Loader2 } from 'lucide-react';

interface KnowledgeFolderSelectorProps {
  selectedFolders: string[];
  onFoldersChange: (folders: string[]) => void;
  workspaceId?: string;
}

const getFolderTypeIcon = (type: string | null | undefined) => {
  switch (type) {
    case 'documents':
      return <FileText className="h-4 w-4 text-blue-500" />;
    case 'data':
      return <FileJson className="h-4 w-4 text-green-500" />;
    case 'code':
      return <FileCode className="h-4 w-4 text-purple-500" />;
    default:
      return <Folder className="h-4 w-4 text-amber-500" />;
  }
};

const getFolderTypeBadge = (type: string | null | undefined) => {
  switch (type) {
    case 'documents':
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400">Docs</Badge>;
    case 'data':
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 dark:text-green-400">Data</Badge>;
    case 'code':
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 dark:text-purple-400">Code</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">General</Badge>;
  }
};

export const KnowledgeFolderSelector: React.FC<KnowledgeFolderSelectorProps> = ({
  selectedFolders,
  onFoldersChange,
  workspaceId,
}) => {
  const { data: folders, isLoading } = useQuery({
    queryKey: ['knowledge-folders', workspaceId],
    queryFn: async () => {
      let query = supabase
        .from('knowledge_folders')
        .select('id, name, folder_type')
        .order('name', { ascending: true });
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const handleFolderToggle = (folderId: string, checked: boolean) => {
    if (checked) {
      onFoldersChange([...selectedFolders, folderId]);
    } else {
      onFoldersChange(selectedFolders.filter(id => id !== folderId));
    }
  };

  const selectAll = () => {
    if (folders) {
      onFoldersChange(folders.map(f => f.id));
    }
  };

  const clearAll = () => {
    onFoldersChange([]);
  };

  return (
    <Card className="cyber-border">
      <CardHeader className="border-b border-border/50 pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            KNOWLEDGE BASE ACCESS
          </div>
          <Badge variant="outline" className="text-xs">
            {selectedFolders.length} Selected
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Description */}
        <p className="text-xs text-muted-foreground">
          Select which knowledge folders this agent can access by default. 
          These can be overridden per-workflow in the Multi-Agent Canvas.
        </p>

        {/* Quick Actions */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Available Folders
          </span>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={selectAll}
              className="h-6 text-xs"
              disabled={!folders || folders.length === 0}
            >
              Select All
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAll}
              className="h-6 text-xs text-muted-foreground"
              disabled={selectedFolders.length === 0}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Folder List */}
        <ScrollArea className="h-[200px] rounded-lg border border-border/50 bg-muted/20">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : folders && folders.length > 0 ? (
              folders.map((folder) => {
                const isSelected = selectedFolders.includes(folder.id);
                return (
                  <div
                    key={folder.id}
                    className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'hover:bg-muted border border-transparent'
                    }`}
                    onClick={() => handleFolderToggle(folder.id, !isSelected)}
                  >
                    <Checkbox
                      id={`folder-${folder.id}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => handleFolderToggle(folder.id, checked as boolean)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getFolderTypeIcon(folder.folder_type)}
                      <span className="text-sm truncate">{folder.name}</span>
                    </div>
                    {getFolderTypeBadge(folder.folder_type)}
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <File className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No folders available</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create folders in the Knowledge Base to enable access control
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Info Note */}
        {selectedFolders.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Database className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{selectedFolders.length} folder{selectedFolders.length !== 1 ? 's' : ''}</span> will be accessible to this agent. 
              The agent will use these as the default knowledge sources unless overridden in a workflow.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
