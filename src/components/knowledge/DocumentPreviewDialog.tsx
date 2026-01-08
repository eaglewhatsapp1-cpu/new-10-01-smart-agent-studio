import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, Hash, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceFile: string;
  folderId?: string;
}

export const DocumentPreviewDialog: React.FC<DocumentPreviewDialogProps> = ({
  open,
  onOpenChange,
  sourceFile,
  folderId,
}) => {
  const { data: chunks, isLoading } = useQuery({
    queryKey: ['document-chunks', sourceFile, folderId],
    queryFn: async () => {
      let query = supabase
        .from('knowledge_chunks')
        .select('id, content, chunk_index, created_at, chunk_type, token_count, key_concepts, semantic_tags')
        .eq('source_file', sourceFile)
        .order('chunk_index', { ascending: true });

      if (folderId) {
        query = query.eq('folder_id', folderId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {sourceFile}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : chunks && chunks.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Layers className="h-4 w-4" />
                <span>{chunks.length} chunks</span>
              </div>
              {chunks[0]?.created_at && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>
                    {format(new Date(chunks[0].created_at), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>
              )}
            </div>

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {chunks.map((chunk, index) => (
                  <div
                    key={chunk.id}
                    className="p-4 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        <Hash className="h-3 w-3 mr-1" />
                        Chunk {chunk.chunk_index ?? index + 1}
                      </Badge>
                      {chunk.chunk_type && (
                        <Badge variant="secondary" className="text-xs">
                          {chunk.chunk_type}
                        </Badge>
                      )}
                      {chunk.token_count && (
                        <span className="text-xs text-muted-foreground">
                          {chunk.token_count} tokens
                        </span>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {chunk.content}
                    </p>
                    {chunk.key_concepts && chunk.key_concepts.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {chunk.key_concepts.map((concept: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {concept}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No content found for this document.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
