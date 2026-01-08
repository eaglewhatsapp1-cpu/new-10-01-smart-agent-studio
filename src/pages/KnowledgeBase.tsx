import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Database, 
  FolderTree, 
  Folder, 
  ChevronRight, 
  ChevronDown, 
  Trash2, 
  Upload, 
  RefreshCw,
  FileText,
  File,
  Clock,
  Info
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CreateFolderDialog } from '@/components/dialogs/CreateFolderDialog';
import { UploadDocumentDialog } from '@/components/dialogs/UploadDocumentDialog';
import { useAuth } from '@/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';

interface FolderNode {
  id: string;
  name: string;
  parent_id: string | null;
  created_by: string | null;
  created_at: string | null;
  children: FolderNode[];
  documents: DocumentInfo[];
}

interface DocumentInfo {
  id: string;
  source_file: string;
  created_at: string | null;
  chunk_count: number;
}

const buildFolderTree = (folders: any[], documents: any[]): FolderNode[] => {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];

  // Build folder map with empty documents array
  folders.forEach((f) => {
    map.set(f.id, { ...f, children: [], documents: [] });
  });

  // Group documents by folder
  documents.forEach((doc) => {
    if (doc.folder_id && map.has(doc.folder_id)) {
      const folder = map.get(doc.folder_id)!;
      // Check if document already exists
      const existingDoc = folder.documents.find(d => d.source_file === doc.source_file);
      if (existingDoc) {
        existingDoc.chunk_count++;
      } else {
        folder.documents.push({
          id: doc.id,
          source_file: doc.source_file,
          created_at: doc.created_at,
          chunk_count: 1
        });
      }
    }
  });

  // Build tree structure
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
  currentUserId: string | undefined;
}

const FolderItem = React.forwardRef<HTMLDivElement, FolderItemProps>(
  ({ folder, level, onDelete, currentUserId }, ref) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = folder.children.length > 0;
    const hasDocuments = folder.documents.length > 0;
    const isOwner = currentUserId && folder.created_by === currentUserId;

    return (
      <div ref={ref}>
        <div
          className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-accent cursor-pointer group"
          style={{ paddingInlineStart: `${level * 20 + 8}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          <button
            className="p-0.5 hover:bg-muted rounded"
            disabled={!hasChildren && !hasDocuments}
          >
            {(hasChildren || hasDocuments) ? (
              expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              <span className="w-4" />
            )}
          </button>
          <Folder className="h-4 w-4 text-primary" />
          <span className="flex-1 text-sm font-medium">{folder.name}</span>
          
          {hasDocuments && (
            <Badge variant="secondary" className="text-xs">
              {folder.documents.length} file{folder.documents.length !== 1 ? 's' : ''}
            </Badge>
          )}
          
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
        
        {/* Show documents when expanded */}
        {expanded && hasDocuments && (
          <div className="ml-4" style={{ paddingInlineStart: `${level * 20 + 24}px` }}>
            {folder.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-accent/50 text-sm"
              >
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 text-muted-foreground truncate">{doc.source_file}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Info className="h-3 w-3" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1">
                        <File className="h-3 w-3" />
                        <span className="font-medium">{doc.source_file}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {doc.created_at 
                            ? format(new Date(doc.created_at), 'MMM d, yyyy HH:mm')
                            : 'Unknown date'}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {doc.chunk_count} chunk{doc.chunk_count !== 1 ? 's' : ''} processed
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>
        )}
        
        {/* Show child folders */}
        {expanded && hasChildren && (
          <div>
            {folder.children.map((child) => (
              <FolderItem 
                key={child.id} 
                folder={child} 
                level={level + 1} 
                onDelete={onDelete}
                currentUserId={currentUserId}
              />
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: folders, isLoading: foldersLoading } = useQuery({
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

  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ['knowledge_chunks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_chunks')
        .select('id, source_file, folder_id, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('knowledge_folders').delete().eq('id', id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge_chunks'] });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['folders'] }),
      queryClient.invalidateQueries({ queryKey: ['knowledge_chunks'] })
    ]);
    setIsRefreshing(false);
  };

  const isLoading = foldersLoading || documentsLoading;
  const folderTree = folders && documents ? buildFolderTree(folders, documents) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.knowledgeBase.title}</h1>
          <p className="text-muted-foreground mt-1">Manage folders and documents</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh folders"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
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
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : folderTree.length > 0 ? (
            <div className="space-y-1">
              {folderTree.map((folder) => (
                <FolderItem 
                  key={folder.id} 
                  folder={folder} 
                  level={0} 
                  onDelete={handleDelete}
                  currentUserId={user?.id}
                />
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
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['folders'] });
        }}
      />

      <UploadDocumentDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['folders'] });
          queryClient.invalidateQueries({ queryKey: ['knowledge_chunks'] });
        }}
      />
    </div>
  );
};
