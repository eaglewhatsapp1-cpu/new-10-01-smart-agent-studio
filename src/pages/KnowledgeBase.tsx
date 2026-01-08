import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Database, FolderTree, Folder, ChevronRight, ChevronDown, Trash2, Upload } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CreateFolderDialog } from '@/components/dialogs/CreateFolderDialog';
import { UploadDocumentDialog } from '@/components/dialogs/UploadDocumentDialog';

interface FolderNode {
  id: string;
  name: string;
  parent_id: string | null;
  children: FolderNode[];
}

const buildFolderTree = (folders: any[]): FolderNode[] => {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];

  folders.forEach((f) => {
    map.set(f.id, { ...f, children: [] });
  });

  folders.forEach((f) => {
    const node = map.get(f.id)!;
    if (f.parent_id && map.has(f.parent_id)) {
      map.get(f.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

interface FolderItemProps {
  folder: FolderNode;
  level: number;
  onDelete: (id: string) => void;
}

const FolderItem = React.forwardRef<HTMLDivElement, FolderItemProps>(
  ({ folder, level, onDelete }, ref) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = folder.children.length > 0;

    return (
      <div ref={ref}>
        <div
          className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-accent cursor-pointer group"
          style={{ paddingInlineStart: `${level * 20 + 8}px` }}
        >
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 hover:bg-muted rounded"
            disabled={!hasChildren}
          >
            {hasChildren ? (
              expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              <span className="w-4" />
            )}
          </button>
          <Folder className="h-4 w-4 text-primary" />
          <span className="flex-1 text-sm font-medium">{folder.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(folder.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        {expanded && hasChildren && (
          <div>
            {folder.children.map((child) => (
              <FolderItem key={child.id} folder={child} level={level + 1} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    );
  }
);

FolderItem.displayName = 'FolderItem';

export const KnowledgeBase: React.FC = () => {
  const { t } = useApp();
  const queryClient = useQueryClient();
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { data: folders, isLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_folders')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('knowledge_folders').delete().eq('id', id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    }
  };

  const folderTree = folders ? buildFolderTree(folders) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.knowledgeBase.title}</h1>
          <p className="text-muted-foreground mt-1">Manage folders and documents</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setFolderDialogOpen(true)}>
            <FolderTree className="h-4 w-4" />
            {t.knowledgeBase.newFolder}
          </Button>
          <Button className="gap-2" onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4" />
            {t.knowledgeBase.uploadFiles}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Folder Explorer
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">{t.common.loading}</p>
          ) : folderTree.length > 0 ? (
            <div className="space-y-1">
              {folderTree.map((folder) => (
                <FolderItem key={folder.id} folder={folder} level={0} onDelete={handleDelete} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {t.knowledgeBase.noFolders}
            </p>
          )}
        </CardContent>
      </Card>

      <CreateFolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['folders'] })}
      />

      <UploadDocumentDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['folders'] })}
      />
    </div>
  );
};
